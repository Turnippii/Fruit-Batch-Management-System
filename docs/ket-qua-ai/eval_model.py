# =====================================================================
#  ĐÁNH GIÁ CHUYÊN SÂU MODEL NHẬN DIỆN TRÁI CÂY + ĐỘ CHÍN
#  Sinh biểu đồ và bảng số liệu dùng trực tiếp cho báo cáo
# =====================================================================
#
#  CHẠY SAU notebook train, trong cùng phiên (model còn trong bộ nhớ),
#  hoặc thêm output của notebook train làm Input rồi chạy độc lập.
#
#  LƯU Ý VỀ CHỈ SỐ:
#  MSE / MAE / RMSE / R² là chỉ số của bài toán HỒI QUY (dự đoán số thực).
#  Bài này là PHÂN LOẠI 10 lớp nên dùng accuracy / precision / recall /
#  F1 / AUC / kappa / MCC. Bốn chỉ số kia sẽ dùng ở phần kiểm chứng
#  công thức Q10 (so số ngày dự đoán với số ngày đo thực tế).
# =====================================================================

import json, pathlib, time
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
from sklearn.metrics import (classification_report, confusion_matrix,
                             roc_curve, auc, precision_recall_curve,
                             average_precision_score, cohen_kappa_score,
                             matthews_corrcoef)

IMG_SIZE, BATCH, SEED = 224, 32, 42
OUT = pathlib.Path("/kaggle/working")
plt.rcParams["figure.dpi"] = 110


def find_data():
    root = pathlib.Path("/kaggle/input")
    for p in root.rglob("labels.txt"):
        if (p.parent / "test").is_dir():
            return p.parent
    raise FileNotFoundError("Không thấy dataset")


DATA = find_data()
LABELS = (DATA / "labels.txt").read_text().split()
NC = len(LABELS)

# nạp model nếu chạy phiên mới
if "model" not in dir():
    cand = list(pathlib.Path("/kaggle").rglob("fruit_model.keras"))
    assert cand, "Không thấy fruit_model.keras"
    model = tf.keras.models.load_model(cand[0])
    print("Đã nạp:", cand[0])

test_ds = tf.keras.utils.image_dataset_from_directory(
    DATA / "test", class_names=LABELS, image_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH, shuffle=False)

y_true = np.concatenate([y.numpy() for _, y in test_ds])
y_prob = model.predict(test_ds, verbose=0)
y_pred = y_prob.argmax(1)
conf = y_prob.max(1)
acc = (y_true == y_pred).mean()
print(f"\nTest accuracy: {acc:.4f}   ({len(y_true)} ảnh)")


# ---------------------------------------------------------------------
#  1. BẢNG CHỈ SỐ TỔNG HỢP
# ---------------------------------------------------------------------
top2 = np.mean([t in p for t, p in zip(y_true, np.argsort(-y_prob, 1)[:, :2])])
top3 = np.mean([t in p for t, p in zip(y_true, np.argsort(-y_prob, 1)[:, :3])])
kappa = cohen_kappa_score(y_true, y_pred)
mcc = matthews_corrcoef(y_true, y_pred)

rep = classification_report(y_true, y_pred, target_names=LABELS,
                            digits=4, output_dict=True)

print("\n" + "=" * 58)
print("CHỈ SỐ TỔNG HỢP")
print("=" * 58)
rows = [
    ("Top-1 accuracy", acc, "Tỉ lệ dự đoán đúng nhãn"),
    ("Top-2 accuracy", top2, "Nhãn đúng nằm trong 2 lựa chọn đầu"),
    ("Top-3 accuracy", top3, "Nhãn đúng nằm trong 3 lựa chọn đầu"),
    ("Macro F1", rep["macro avg"]["f1-score"], "Trung bình F1, mọi lớp ngang nhau"),
    ("Weighted F1", rep["weighted avg"]["f1-score"], "Trung bình F1 có trọng số"),
    ("Cohen's kappa", kappa, "Loại trừ phần đúng do may mắn"),
    ("Matthews corr (MCC)", mcc, "Chỉ số cân bằng, tốt khi lệch lớp"),
]
for name, val, desc in rows:
    print(f"  {name:<22}{val:>8.4f}   {desc}")
print("=" * 58)


# ---------------------------------------------------------------------
#  2. CONFUSION MATRIX CHUẨN HOÁ (%)
# ---------------------------------------------------------------------
cm = confusion_matrix(y_true, y_pred)
cmn = cm / cm.sum(1, keepdims=True) * 100

fig, axes = plt.subplots(1, 2, figsize=(17, 7))
for ax, M, ttl, fmt in [(axes[0], cm, "Số lượng", "{:.0f}"),
                        (axes[1], cmn, "Chuẩn hoá theo hàng (%)", "{:.1f}")]:
    im = ax.imshow(M, cmap="Greens", vmin=0)
    ax.set_xticks(range(NC), LABELS, rotation=45, ha="right", fontsize=8)
    ax.set_yticks(range(NC), LABELS, fontsize=8)
    ax.set_xlabel("Dự đoán")
    ax.set_ylabel("Thực tế")
    ax.set_title(ttl)
    thr = M.max() / 2
    for i in range(NC):
        for j in range(NC):
            if M[i, j] > 0.05:
                ax.text(j, i, fmt.format(M[i, j]), ha="center", va="center",
                        fontsize=7, color="white" if M[i, j] > thr else "black")
    plt.colorbar(im, ax=ax, fraction=0.046)
plt.suptitle(f"Confusion matrix — accuracy {acc:.2%}", fontsize=13)
plt.tight_layout()
plt.savefig(OUT / "fig_confusion.png", bbox_inches="tight")
plt.show()

# cặp nhầm lẫn nhiều nhất
pairs = [(cm[i, j], LABELS[i], LABELS[j]) for i in range(NC)
         for j in range(NC) if i != j and cm[i, j] > 0]
print("\n5 cặp nhầm lẫn nhiều nhất:")
for n, a, b in sorted(pairs, reverse=True)[:5]:
    print(f"  {n:>4} ảnh:  {a}  →  bị đoán thành  {b}")


# ---------------------------------------------------------------------
#  3. PRECISION / RECALL / F1 THEO LỚP
# ---------------------------------------------------------------------
pr = [rep[l]["precision"] for l in LABELS]
rc = [rep[l]["recall"] for l in LABELS]
f1 = [rep[l]["f1-score"] for l in LABELS]
sup = [rep[l]["support"] for l in LABELS]
idx = np.arange(NC)
w = 0.26

fig, (a1, a2) = plt.subplots(2, 1, figsize=(12, 9),
                             gridspec_kw={"height_ratios": [2, 1]})
a1.bar(idx - w, pr, w, label="Precision", color="#2e7d32")
a1.bar(idx, rc, w, label="Recall", color="#66bb6a")
a1.bar(idx + w, f1, w, label="F1", color="#a5d6a7")
a1.axhline(acc, color="#c62828", ls="--", lw=1.2, label=f"Accuracy tổng {acc:.3f}")
a1.set_xticks(idx, LABELS, rotation=30, ha="right", fontsize=9)
a1.set_ylim(0.7, 1.02)
a1.set_ylabel("Điểm")
a1.legend(ncol=4, fontsize=9)
a1.grid(axis="y", alpha=0.3)
a1.set_title("Precision / Recall / F1 theo từng lớp")

a2.bar(idx, sup, color="#90a4ae")
a2.set_xticks(idx, LABELS, rotation=30, ha="right", fontsize=9)
a2.set_ylabel("Số ảnh test")
a2.grid(axis="y", alpha=0.3)
for i, v in enumerate(sup):
    a2.text(i, v, str(v), ha="center", va="bottom", fontsize=8)
plt.tight_layout()
plt.savefig(OUT / "fig_per_class.png", bbox_inches="tight")
plt.show()


# ---------------------------------------------------------------------
#  4. ROC & PRECISION-RECALL (one-vs-rest)
# ---------------------------------------------------------------------
Y = np.eye(NC)[y_true]
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 6))
aucs, aps = {}, {}
cmap = plt.cm.tab10(np.linspace(0, 1, NC))

for i, l in enumerate(LABELS):
    fpr, tpr, _ = roc_curve(Y[:, i], y_prob[:, i])
    aucs[l] = auc(fpr, tpr)
    a1.plot(fpr, tpr, lw=1.4, color=cmap[i], label=f"{l} ({aucs[l]:.3f})")
    p, r, _ = precision_recall_curve(Y[:, i], y_prob[:, i])
    aps[l] = average_precision_score(Y[:, i], y_prob[:, i])
    a2.plot(r, p, lw=1.4, color=cmap[i], label=f"{l} ({aps[l]:.3f})")

a1.plot([0, 1], [0, 1], "k--", lw=0.8)
a1.set_xlabel("False positive rate")
a1.set_ylabel("True positive rate")
a1.set_title(f"ROC one-vs-rest — macro AUC = {np.mean(list(aucs.values())):.4f}")
a1.legend(fontsize=7, loc="lower right")
a1.grid(alpha=0.3)

a2.set_xlabel("Recall")
a2.set_ylabel("Precision")
a2.set_title(f"Precision-Recall — macro AP = {np.mean(list(aps.values())):.4f}")
a2.legend(fontsize=7, loc="lower left")
a2.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(OUT / "fig_roc_pr.png", bbox_inches="tight")
plt.show()


# ---------------------------------------------------------------------
#  5. ĐỘ TIN CẬY & CHỌN NGƯỠNG CHO APP
#     (quyết định khi nào app hỏi lại người dùng)
# ---------------------------------------------------------------------
ok = y_true == y_pred
fig, (a1, a2) = plt.subplots(1, 2, figsize=(15, 5))

a1.hist(conf[ok], bins=40, alpha=0.75, color="#2e7d32", label=f"Đúng ({ok.sum()})")
a1.hist(conf[~ok], bins=40, alpha=0.8, color="#c62828", label=f"Sai ({(~ok).sum()})")
a1.set_xlabel("Độ tin cậy cao nhất")
a1.set_ylabel("Số ảnh")
a1.set_title("Phân bố độ tin cậy")
a1.legend()
a1.grid(alpha=0.3)

ths = np.linspace(0.3, 0.99, 60)
cov = [(conf >= t).mean() for t in ths]
accs = [ok[conf >= t].mean() if (conf >= t).sum() else np.nan for t in ths]
a2.plot(ths, cov, color="#1d4ed8", lw=2, label="Tỉ lệ ảnh tự quyết định")
a2.plot(ths, accs, color="#2e7d32", lw=2, label="Accuracy khi tự quyết định")
a2.set_xlabel("Ngưỡng độ tin cậy")
a2.set_title("Chọn ngưỡng: đánh đổi giữa tự động và chính xác")
a2.legend()
a2.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(OUT / "fig_confidence.png", bbox_inches="tight")
plt.show()

print("\nBảng chọn ngưỡng cho app:")
print(f"  {'Ngưỡng':<10}{'Tự quyết định':>16}{'Accuracy':>12}{'Hỏi lại user':>15}")
for t in (0.5, 0.6, 0.7, 0.8, 0.9, 0.95):
    m = conf >= t
    a = f"{ok[m].mean():.1%}" if m.sum() else "—"
    print(f"  {t:<10.2f}{m.mean():>15.1%}{a:>12}{1-m.mean():>15.1%}")


# ---------------------------------------------------------------------
#  6. ẢNH BỊ ĐOÁN SAI  (rất đáng đưa vào báo cáo)
# ---------------------------------------------------------------------
raw = tf.keras.utils.image_dataset_from_directory(
    DATA / "test", class_names=LABELS, image_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH, shuffle=False)
imgs = np.concatenate([x.numpy() for x, _ in raw]).astype("uint8")

wrong = np.where(~ok)[0]
wrong = wrong[np.argsort(-conf[wrong])][:12]      # sai mà lại rất tự tin
if len(wrong):
    plt.figure(figsize=(13, 10))
    for k, i in enumerate(wrong):
        plt.subplot(3, 4, k + 1)
        plt.imshow(imgs[i])
        plt.axis("off")
        plt.title(f"thật: {LABELS[y_true[i]]}\nđoán: {LABELS[y_pred[i]]} ({conf[i]:.0%})",
                  fontsize=8, color="#c62828")
    plt.suptitle("Các ảnh bị đoán sai với độ tin cậy cao nhất", fontsize=12)
    plt.tight_layout()
    plt.savefig(OUT / "fig_errors.png", bbox_inches="tight")
    plt.show()


# ---------------------------------------------------------------------
#  7. GRAD-CAM — model nhìn vào đâu để ra quyết định
# ---------------------------------------------------------------------
try:
    # Model lồng nhau: không lấy được .output của submodel trong đồ thị ngoài,
    # nên chạy tay từng phần trong GradientTape (augment là no-op khi suy luận).
    basel = [l for l in model.layers if isinstance(l, tf.keras.Model)
             and len(l.layers) > 20][0]
    head = model.layers[model.layers.index(basel) + 1:]

    def gradcam(img, cls):
        x = tf.convert_to_tensor(img[None].astype("float32"))
        x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
        with tf.GradientTape() as tape:
            fmap = basel(x, training=False)
            tape.watch(fmap)
            h = fmap
            for l in head:
                h = l(h, training=False)
            loss = h[:, cls]
        g = tape.gradient(loss, fmap)
        wts = tf.reduce_mean(g, axis=(0, 1, 2))
        cam = tf.reduce_sum(fmap[0] * wts, axis=-1).numpy()
        cam = np.maximum(cam, 0)
        cam = cam / (cam.max() + 1e-8)
        return tf.image.resize(cam[..., None], (IMG_SIZE, IMG_SIZE)).numpy()[..., 0]

    sel = [int(np.where(y_true == c)[0][0]) for c in range(NC)]
    plt.figure(figsize=(15, 7))
    for k, i in enumerate(sel):
        plt.subplot(2, 5, k + 1)
        plt.imshow(imgs[i])
        plt.imshow(gradcam(imgs[i], y_pred[i]), cmap="jet", alpha=0.42)
        plt.axis("off")
        plt.title(f"{LABELS[y_pred[i]]} ({conf[i]:.0%})", fontsize=9)
    plt.suptitle("Grad-CAM — vùng ảnh model dựa vào để quyết định", fontsize=12)
    plt.tight_layout()
    plt.savefig(OUT / "fig_gradcam.png", bbox_inches="tight")
    plt.show()
except Exception as e:
    print("Bỏ qua Grad-CAM:", type(e).__name__, e)


# ---------------------------------------------------------------------
#  8. SO SÁNH float32 vs INT8 THEO TỪNG LỚP
# ---------------------------------------------------------------------
tfl = list(pathlib.Path("/kaggle").rglob("fruit_int8.tflite"))
if tfl:
    it = tf.lite.Interpreter(model_path=str(tfl[0]))
    it.allocate_tensors()
    ind, outd = it.get_input_details()[0], it.get_output_details()[0]
    q_pred = []
    for i in range(len(imgs)):
        it.set_tensor(ind["index"], imgs[i][None].astype(ind["dtype"]))
        it.invoke()
        q_pred.append(int(it.get_tensor(outd["index"])[0].argmax()))
    q_pred = np.array(q_pred)

    rf = cm.diagonal() / cm.sum(1)
    cmq = confusion_matrix(y_true, q_pred)
    rq = cmq.diagonal() / cmq.sum(1)

    plt.figure(figsize=(12, 5))
    plt.bar(idx - 0.19, rf, 0.38, label="float32", color="#2e7d32")
    plt.bar(idx + 0.19, rq, 0.38, label="INT8", color="#f9a825")
    plt.xticks(idx, LABELS, rotation=30, ha="right", fontsize=9)
    plt.ylim(0.7, 1.02)
    plt.ylabel("Recall")
    plt.title(f"Ảnh hưởng của lượng tử hoá INT8  "
              f"(tổng {acc:.4f} → {(q_pred==y_true).mean():.4f})")
    plt.legend()
    plt.grid(axis="y", alpha=0.3)
    plt.tight_layout()
    plt.savefig(OUT / "fig_int8.png", bbox_inches="tight")
    plt.show()

    print("\nLớp bị lượng tử hoá ảnh hưởng nhiều nhất:")
    for i in np.argsort(rq - rf)[:3]:
        print(f"  {LABELS[i]:<16}{rf[i]:.3f} → {rq[i]:.3f}  ({rq[i]-rf[i]:+.3f})")


# ---------------------------------------------------------------------
#  9. XUẤT SỐ LIỆU
# ---------------------------------------------------------------------
json.dump({
    "accuracy": float(acc), "top2": float(top2), "top3": float(top3),
    "macro_f1": rep["macro avg"]["f1-score"],
    "weighted_f1": rep["weighted avg"]["f1-score"],
    "cohen_kappa": float(kappa), "mcc": float(mcc),
    "macro_auc": float(np.mean(list(aucs.values()))),
    "auc_per_class": aucs,
    "per_class": {l: {k: rep[l][k] for k in
                      ("precision", "recall", "f1-score", "support")} for l in LABELS},
}, open(OUT / "eval_report.json", "w"), indent=1)

print("\nĐã lưu:", [p.name for p in sorted(OUT.glob("fig_*.png"))], "+ eval_report.json")