# =====================================================================
#  HUẤN LUYỆN MODEL NHẬN DIỆN TRÁI CÂY + ĐỘ CHÍN  (10 lớp)
#  MobileNetV2 transfer learning  →  TensorFlow Lite INT8
#  Chạy trên Kaggle Notebook, bật GPU T4 trong Settings > Accelerator
# =====================================================================
#
#  CÁCH DÙNG: chép từng KHỐI vào một cell riêng, chạy lần lượt.
#  Toàn bộ notebook mất khoảng 25-35 phút trên GPU T4.
# =====================================================================


# ---------------------------------------------------------------------
#  CELL 1 — Cấu hình & kiểm tra dữ liệu
# ---------------------------------------------------------------------
import os, json, time, pathlib, shutil
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt

SEED = 42
IMG_SIZE = 224
BATCH = 32
EPOCHS_HEAD = 12          # giai đoạn 1: đóng băng backbone
EPOCHS_FINE = 15          # giai đoạn 2: fine-tune
LR_HEAD = 1e-3
LR_FINE = 1e-5            # phải rất nhỏ, nếu không sẽ phá trọng số pre-trained
UNFREEZE_FROM = 100       # mở khoá từ layer thứ 100 của MobileNetV2 (tổng 154)

def find_data():
    """Tự dò dataset trong /kaggle/input, không phụ thuộc tên slug."""
    root = pathlib.Path("/kaggle/input")
    if root.exists():
        for p_ in root.rglob("labels.txt"):
            if (p_.parent / "train").is_dir():
                return p_.parent
    raise FileNotFoundError("Không thấy dataset_final_v2 trong /kaggle/input")


DATA = find_data()
OUT = pathlib.Path("/kaggle/working")

tf.keras.utils.set_random_seed(SEED)

print("TensorFlow:", tf.__version__)
gpus = tf.config.list_physical_devices("GPU")
print("GPU:", gpus if gpus else "KHÔNG CÓ — vào Settings > Accelerator bật GPU T4")

assert DATA.exists(), f"Không thấy dataset ở {DATA} — kiểm tra lại tên trong Add Input"
for sp in ("train", "valid", "test"):
    assert (DATA / sp).exists(), f"Thiếu thư mục {sp}"

LABELS = (DATA / "labels.txt").read_text().split()
print(f"\n{len(LABELS)} lớp:", LABELS)

for sp in ("train", "valid", "test"):
    n = sum(len(list((DATA / sp / c).glob("*"))) for c in LABELS)
    print(f"  {sp:<6} {n:>6,} ảnh")


# ---------------------------------------------------------------------
#  CELL 2 — Nạp dữ liệu
# ---------------------------------------------------------------------
def load(split, shuffle):
    return tf.keras.utils.image_dataset_from_directory(
        DATA / split,
        labels="inferred",
        label_mode="int",
        class_names=LABELS,        # ÉP đúng thứ tự trong labels.txt, không để Keras tự sắp
        image_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH,
        shuffle=shuffle,
        seed=SEED,
    )


train_ds = load("train", True)
valid_ds = load("valid", False)
test_ds = load("test", False)

# Kiểm tra chốt chặn: thứ tự lớp phải khớp labels.txt
assert train_ds.class_names == LABELS, "LỆCH THỨ TỰ LỚP — dừng lại, đừng train"
print("Thứ tự lớp khớp labels.txt")

AUTOTUNE = tf.data.AUTOTUNE
# KHÔNG cache train: 7.914 ảnh float32 224x224 chiếm ~4,8 GB RAM,
# notebook Kaggle bật GPU chỉ có ~13 GB nên rất dễ tràn.
# valid/test nhỏ hơn nhiều (~1 GB mỗi tập) nên cache được.
train_ds = train_ds.prefetch(AUTOTUNE)
valid_ds = valid_ds.cache().prefetch(AUTOTUNE)
test_ds = test_ds.cache().prefetch(AUTOTUNE)

# class_weight: JSON có key dạng chuỗi, Keras cần key dạng int
cw_raw = json.loads((DATA / "class_weights_v2.json").read_text())
class_weight = {int(k): float(v) for k, v in cw_raw.items()}
print("class_weight:", {LABELS[k]: round(v, 2) for k, v in sorted(class_weight.items())})


# ---------------------------------------------------------------------
#  CELL 3 — Xem thử vài ảnh (kiểm tra nhãn có đúng không)
# ---------------------------------------------------------------------
plt.figure(figsize=(12, 6))
for imgs, labs in train_ds.take(1):
    for i in range(min(12, len(imgs))):
        plt.subplot(3, 4, i + 1)
        plt.imshow(imgs[i].numpy().astype("uint8"))
        plt.title(LABELS[labs[i]], fontsize=9)
        plt.axis("off")
plt.tight_layout()
plt.show()


# ---------------------------------------------------------------------
#  CELL 4 — Dựng model
# ---------------------------------------------------------------------
augment = tf.keras.Sequential([
    tf.keras.layers.RandomFlip("horizontal"),
    tf.keras.layers.RandomRotation(0.15),
    tf.keras.layers.RandomZoom(0.15),
    tf.keras.layers.RandomTranslation(0.1, 0.1),
    tf.keras.layers.RandomContrast(0.2),
    tf.keras.layers.RandomBrightness(0.2, value_range=(0, 255)),
], name="augment")

base = tf.keras.applications.MobileNetV2(
    input_shape=(IMG_SIZE, IMG_SIZE, 3), include_top=False, weights="imagenet")
base.trainable = False

inputs = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
x = augment(inputs)
x = tf.keras.applications.mobilenet_v2.preprocess_input(x)   # đưa về [-1, 1]
x = base(x, training=False)
x = tf.keras.layers.GlobalAveragePooling2D()(x)
x = tf.keras.layers.Dropout(0.3)(x)
outputs = tf.keras.layers.Dense(len(LABELS), activation="softmax")(x)
model = tf.keras.Model(inputs, outputs)

model.compile(
    optimizer=tf.keras.optimizers.Adam(LR_HEAD),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"])
model.summary()


# ---------------------------------------------------------------------
#  CELL 5 — Giai đoạn 1: train phần đầu (backbone đóng băng)
# ---------------------------------------------------------------------
cb = [
    tf.keras.callbacks.EarlyStopping(
        monitor="val_accuracy", patience=5, restore_best_weights=True, verbose=1),
    tf.keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss", factor=0.5, patience=2, min_lr=1e-6, verbose=1),
]

t0 = time.time()
hist1 = model.fit(train_ds, validation_data=valid_ds, epochs=EPOCHS_HEAD,
                  class_weight=class_weight, callbacks=cb)
print(f"Giai đoạn 1 xong sau {time.time()-t0:.0f}s")


# ---------------------------------------------------------------------
#  CELL 6 — Giai đoạn 2: fine-tune nửa trên của backbone
# ---------------------------------------------------------------------
base.trainable = True
for layer in base.layers[:UNFREEZE_FROM]:
    layer.trainable = False
# BatchNorm phải giữ đóng băng, nếu không thống kê chạy sẽ bị phá
for layer in base.layers:
    if isinstance(layer, tf.keras.layers.BatchNormalization):
        layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(LR_FINE),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"])
print("Số tham số huấn luyện:", f"{int(sum(np.prod(w.shape) for w in model.trainable_weights)):,}")

t0 = time.time()
hist2 = model.fit(train_ds, validation_data=valid_ds, epochs=EPOCHS_FINE,
                  class_weight=class_weight, callbacks=cb)
print(f"Giai đoạn 2 xong sau {time.time()-t0:.0f}s")

model.save(OUT / "fruit_model.keras")

# lưu lịch sử để vẽ lại / trích vào báo cáo
json.dump({"head": hist1.history, "fine": hist2.history},
          open(OUT / "history.json", "w"), indent=1, default=float)


# ---------------------------------------------------------------------
#  CELL 7 — Biểu đồ quá trình huấn luyện
# ---------------------------------------------------------------------
def merge(k):
    return hist1.history[k] + hist2.history[k]


plt.figure(figsize=(12, 4))
for i, (a, b, title) in enumerate([("accuracy", "val_accuracy", "Accuracy"),
                                   ("loss", "val_loss", "Loss")]):
    plt.subplot(1, 2, i + 1)
    plt.plot(merge(a), label="train")
    plt.plot(merge(b), label="valid")
    plt.axvline(len(hist1.history[a]) - 0.5, color="gray", ls="--", lw=1)
    plt.title(title + "  (đường đứt = bắt đầu fine-tune)")
    plt.xlabel("epoch")
    plt.legend()
    plt.grid(alpha=0.3)
plt.tight_layout()
plt.show()


# ---------------------------------------------------------------------
#  CELL 8 — Đánh giá trên tập test
# ---------------------------------------------------------------------
from sklearn.metrics import classification_report, confusion_matrix

y_true = np.concatenate([y.numpy() for _, y in test_ds])
y_prob = model.predict(test_ds, verbose=0)
y_pred = y_prob.argmax(axis=1)

acc = (y_true == y_pred).mean()
print(f"Test accuracy: {acc:.4f}\n")
print(classification_report(y_true, y_pred, target_names=LABELS, digits=3))

cm = confusion_matrix(y_true, y_pred)
fig, ax = plt.subplots(figsize=(9, 8))
im = ax.imshow(cm, cmap="Greens")
ax.set_xticks(range(len(LABELS)), LABELS, rotation=45, ha="right", fontsize=9)
ax.set_yticks(range(len(LABELS)), LABELS, fontsize=9)
ax.set_xlabel("Dự đoán")
ax.set_ylabel("Thực tế")
thr = cm.max() / 2
for i in range(len(LABELS)):
    for j in range(len(LABELS)):
        if cm[i, j]:
            ax.text(j, i, cm[i, j], ha="center", va="center", fontsize=8,
                    color="white" if cm[i, j] > thr else "black")
plt.colorbar(im)
plt.title(f"Confusion matrix — accuracy {acc:.1%}")
plt.tight_layout()
plt.show()

# Lớp yếu nhất — chú ý Xoai_xanh vì ít dữ liệu nhất
rec = cm.diagonal() / cm.sum(axis=1)
print("\nRecall theo lớp (thấp nhất trước):")
for i in np.argsort(rec):
    print(f"  {LABELS[i]:<16} {rec[i]:.3f}   ({cm.sum(axis=1)[i]} ảnh test)")


# ---------------------------------------------------------------------
#  CELL 9 — Xuất TFLite: float32 và INT8
# ---------------------------------------------------------------------
def rep_data():
    """Dữ liệu đại diện để hiệu chuẩn lượng tử hoá."""
    ds = tf.keras.utils.image_dataset_from_directory(
        DATA / "train", class_names=LABELS, image_size=(IMG_SIZE, IMG_SIZE),
        batch_size=1, shuffle=True, seed=SEED)
    for i, (img, _) in enumerate(ds.take(300)):
        yield [tf.cast(img, tf.float32)]


conv = tf.lite.TFLiteConverter.from_keras_model(model)
tfl_f32 = conv.convert()
(OUT / "fruit_f32.tflite").write_bytes(tfl_f32)

conv = tf.lite.TFLiteConverter.from_keras_model(model)
conv.optimizations = [tf.lite.Optimize.DEFAULT]
conv.representative_dataset = rep_data
conv.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
conv.inference_input_type = tf.uint8      # app truyền thẳng pixel 0-255
conv.inference_output_type = tf.uint8
tfl_i8 = conv.convert()
(OUT / "fruit_int8.tflite").write_bytes(tfl_i8)

shutil.copy(DATA / "labels.txt", OUT / "labels.txt")
print(f"float32 : {len(tfl_f32)/1e6:.2f} MB")
print(f"INT8    : {len(tfl_i8)/1e6:.2f} MB   (giảm {len(tfl_f32)/len(tfl_i8):.1f}x)")


# ---------------------------------------------------------------------
#  CELL 10 — Kiểm tra INT8 & đo độ trễ  (bảng số liệu cho báo cáo)
# ---------------------------------------------------------------------
interp = tf.lite.Interpreter(model_content=tfl_i8)
interp.allocate_tensors()
inp, out = interp.get_input_details()[0], interp.get_output_details()[0]
in_scale, in_zp = inp["quantization"]
out_scale, out_zp = out["quantization"]
print("input :", inp["dtype"].__name__, inp["shape"], f"scale={in_scale:.6f} zp={in_zp}")
print("output:", out["dtype"].__name__, out["shape"], f"scale={out_scale:.6f} zp={out_zp}")

raw_ds = tf.keras.utils.image_dataset_from_directory(
    DATA / "test", class_names=LABELS, image_size=(IMG_SIZE, IMG_SIZE),
    batch_size=1, shuffle=False)

q_pred, q_true, times = [], [], []
for img, lab in raw_ds:
    x = tf.cast(img, tf.uint8).numpy() if inp["dtype"] == np.uint8 \
        else (tf.cast(img, tf.float32).numpy() / in_scale + in_zp).astype(inp["dtype"])
    interp.set_tensor(inp["index"], x)
    t0 = time.perf_counter()
    interp.invoke()
    times.append((time.perf_counter() - t0) * 1000)
    q_pred.append(int(interp.get_tensor(out["index"])[0].argmax()))
    q_true.append(int(lab.numpy()[0]))

q_acc = np.mean(np.array(q_pred) == np.array(q_true))
times = np.array(times[5:])          # bỏ vài lần đầu (warm-up)

print("\n" + "=" * 52)
print("BẢNG SỐ LIỆU CHO BÁO CÁO")
print("=" * 52)
print(f"{'Kích thước float32':<28}{len(tfl_f32)/1e6:>8.2f} MB")
print(f"{'Kích thước INT8':<28}{len(tfl_i8)/1e6:>8.2f} MB")
print(f"{'Tỉ lệ nén':<28}{len(tfl_f32)/len(tfl_i8):>8.1f} x")
print(f"{'Accuracy float32 (Keras)':<28}{acc:>8.4f}")
print(f"{'Accuracy INT8 (TFLite)':<28}{q_acc:>8.4f}")
print(f"{'Chênh lệch accuracy':<28}{acc - q_acc:>+8.4f}")
print(f"{'Độ trễ trung bình (CPU)':<28}{times.mean():>8.1f} ms")
print(f"{'Độ trễ p95 (CPU)':<28}{np.percentile(times, 95):>8.1f} ms")
print("=" * 52)
print("\nGhi chú: độ trễ đo trên CPU của Kaggle, trên điện thoại sẽ khác.")
print("Nếu chênh lệch accuracy > 0.02 thì tăng số mẫu hiệu chuẩn trong rep_data().")

json.dump({
    "test_accuracy_f32": float(acc),
    "test_accuracy_int8": float(q_acc),
    "size_f32_mb": len(tfl_f32) / 1e6,
    "size_int8_mb": len(tfl_i8) / 1e6,
    "latency_mean_ms": float(times.mean()),
    "latency_p95_ms": float(np.percentile(times, 95)),
    "recall_per_class": {LABELS[i]: float(rec[i]) for i in range(len(LABELS))},
}, open(OUT / "results.json", "w"), indent=1)

print("\nFile cần tải về:")
for f in ("fruit_int8.tflite", "fruit_f32.tflite", "labels.txt",
          "fruit_model.keras", "history.json", "results.json"):
    p = OUT / f
    if p.exists():
        print(f"  {f:<26}{p.stat().st_size/1e6:>7.2f} MB")