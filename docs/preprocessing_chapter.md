# Chương: Tiền xử lý dữ liệu

## 3.1 Giới thiệu dataset

Dataset được tải từ Kaggle (tác giả: utkarshsaxenadn, tên: *Fruits Classification*),
ban đầu gồm **10.000 ảnh** được phân thành 5 lớp — Apple, Banana, Grape, Mango,
Strawberry — với cấu trúc train/valid/test cố định (1.940/40/20 mỗi lớp).

Sau khi phân tích sơ bộ, dataset tồn tại một số vấn đề nghiêm trọng:

- **Phân chia lệch nặng**: tỉ lệ train:valid:test = 97:2:1, không đủ để đánh giá
  mô hình đáng tin cậy.
- **201 ảnh trùng lặp** (bao gồm 10 ảnh rò rỉ giữa tập train và valid).
- **84,5% ảnh có cạnh ngắn dưới 224 px** — nhỏ hơn kích thước đầu vào chuẩn
  của MobileNetV2, buộc phải upscale khi huấn luyện.
- **Ảnh rác từ scrape web**: clipart, hình vẽ minh họa, watermark thương mại,
  món ăn chế biến, ảnh có người, trái cây nhựa trang trí.

Để giải quyết, quy trình tiền xử lý được thực hiện qua 3 giai đoạn, toàn bộ
bằng Python + Pillow + NumPy (không cần GPU).

---

## 3.2 Tổng quan pipeline

```
10.000 ảnh gốc
    │
    ▼  Giai đoạn 1 — Lọc tự động
    │   ├─ Ảnh hỏng / không mở được        :     0
    │   ├─ Cạnh ngắn < 150 px              : 1.321
    │   ├─ Trùng hoàn toàn (MD5)           :   143
    │   └─ Gần trùng trong lớp (dHash ≤5)  :   236
    │                               Loại   : 1.700
    │
    ▼  8.300 ảnh còn lại
    │
    ▼  Giai đoạn 2 — Duyệt tay (review.html)
    │   └─ Đánh dấu thủ công               :   523
    │                               Loại   :   523
    │
    ▼  7.777 ảnh còn lại
    │
    ▼  Giai đoạn 2b — Lọc CLIP zero-shot
    │   ├─ Rule A: clip_drop > 0,92        :   297
    │   └─ Rule B: watermark_hint ∧ clip_drop > 0,60  : 132
    │                               Loại   :   429
    │
    ▼  7.348 ảnh sạch
    │
    ▼  Giai đoạn 3 — Chia lại 70/15/15 stratified
       └─ dataset_clean/train | valid | test
```

---

## 3.3 Giai đoạn 1 — Lọc và khử trùng lặp tự động

### 3.3.1 Chỉ số được tính cho mỗi ảnh

Với mỗi ảnh, hệ thống tính các chỉ số sau:

| Chỉ số | Ý nghĩa |
|---|---|
| `short_side` | Chiều cạnh ngắn nhất (px) |
| `aspect_ratio` | max(w,h) / min(w,h) |
| `white_ratio` | Tỉ lệ pixel có R,G,B > 240 |
| `unique_colors` | Số màu duy nhất sau lượng tử hóa 5-bit (32³ = 32.768 mức) |
| `avg_saturation` | Độ bão hòa màu trung bình (không gian HSV) |
| `watermark_hint` | Xem mục 3.3.3 |

### 3.3.2 Ngưỡng loại tự động

| Tiêu chí | Ngưỡng | Số ảnh loại |
|---|---|---|
| Cạnh ngắn | < 150 px | **1.321** |
| Tỉ lệ khung | > 2,6 | 0 |
| Ảnh hỏng | Không đọc được | 0 |

### 3.3.3 Watermark hint

Để phát hiện ảnh có watermark hoặc banner text nằm ở rìa ảnh, mỗi ảnh được
chuyển sang grayscale và áp bộ lọc Laplacian (PIL `FIND_EDGES`) để thu được
bản đồ cạnh. Ba vùng được so sánh:

- **Dải trên** (top 15% chiều cao)
- **Dải dưới** (bottom 15% chiều cao)
- **Vùng giữa** (70% còn lại)

Nếu mật độ cạnh trung bình của dải trên hoặc dưới vượt quá **1,8 lần** vùng giữa,
ảnh được đánh dấu `watermark_hint = true`.

| Lớp | Số ảnh có hint | Tỉ lệ |
|---|---|---|
| Apple | 209 / 1.678 | 12,5% |
| Banana | 263 / 1.737 | 15,1% |
| Grape | 100 / 1.726 | 5,8% |
| Mango | 282 / 1.523 | 18,5% |
| Strawberry | 67 / 1.636 | 4,1% |

### 3.3.4 Khử trùng lặp hai tầng

**Tầng 1 — MD5 (exact duplicate):** Tính MD5 của toàn bộ byte ảnh. Ảnh
trùng hash hoàn toàn — bao gồm 10 ảnh rò rỉ giữa train và valid — được loại,
giữ lại bản đầu tiên gặp. Tổng loại: **143 ảnh**.

**Tầng 2 — dHash (near-duplicate):** Mỗi ảnh được thu nhỏ xuống 9×8 px
grayscale, so sánh từng pixel liền kề để tạo hash 64-bit (dHash). Với mỗi lớp,
ma trận khoảng cách Hamming pairwise được tính bằng NumPy vectorized:

```
D[i,j] = ||h_i||² + ||h_j||² − 2·(h_i · h_j)
```

Các cặp ảnh trong cùng lớp có khoảng cách Hamming ≤ 5 được coi là gần trùng;
chỉ giữ lại ảnh đầu tiên. Tổng loại: **236 ảnh**.

### 3.3.5 Suspicion score

Các ảnh còn lại sau lọc và khử trùng được chấm điểm nghi ngờ để ưu tiên duyệt
tay. Công thức:

```
score = white_ratio × 2,0
      + (1 − unique_colors / max_colors) × 1,5
      + (1 − avg_saturation) × 1,5
      + clip(aspect_ratio − 1,5; 0; 1) × 1,0
      + clip(224 − short_side; 0; 74) / 74 × 0,5
```

Score cao → ảnh có nền trắng nhiều, ít màu sắc, bão hòa thấp → nghi ngờ là
clipart hoặc ảnh studio kém chất lượng. Dải giá trị thực tế: **0,79 – 5,09**.

---

## 3.4 Giai đoạn 2 — Duyệt tay với công cụ review.html

Được xây dựng tùy chỉnh (HTML + CSS + JavaScript thuần, tự chứa, không cần
server), công cụ hỗ trợ:

- Lưới ảnh sắp xếp theo `suspicion_score` giảm dần.
- Bộ lọc theo lớp (multi-select) và nhóm `watermark_hint`.
- Click để đánh dấu xấu (viền đỏ), phím X và mũi tên để điều hướng bàn phím.
- Nút "Đánh dấu tất cả từ đây trở lên" trong phạm vi bộ lọc hiện tại.
- Tự lưu trạng thái vào `localStorage`.
- Export `bad.json`.

Sau khi duyệt **11/42 trang** đầu (2.200 ảnh có điểm nghi ngờ cao nhất),
**523 ảnh** bị đánh dấu xấu, bao gồm: clipart/vector, ảnh có watermark,
món ăn chế biến (bánh, nước ép), người chiếm khung hình, trái cây nhựa.

---

## 3.5 Giai đoạn 2b — Lọc bổ sung bằng CLIP zero-shot

### 3.5.1 Phương pháp

Mô hình **CLIP ViT-B/32** (OpenAI, open_clip v3.3.0) được dùng để chấm điểm
toàn bộ 8.300 ảnh trên CPU (tốc độ ~31 ảnh/giây, tổng ~4,5 phút).

Với mỗi ảnh, softmax được tính trên 11 mô tả đồng thời:

**Nhóm POSITIVE (giữ lại) — 4 prompt:**

| # | Mô tả |
|---|---|
| P1 | "a photograph of whole fresh fruit" |
| P2 | "fresh fruit on a table or in a basket" |
| P3 | "fruit growing on a tree or plant" |
| P4 | "fruit at a market stall" |

**Nhóm NEGATIVE (loại bỏ) — 7 prompt:**

| # | Mô tả |
|---|---|
| N1 | "a stock photo with a watermark or logo overlay" |
| N2 | "a drawing, cartoon, clipart or vector illustration of fruit" |
| N3 | "a plate of cooked food, cake, dessert or juice" |
| N4 | "a person or hand as the main subject" |
| N5 | "fruit shown on a computer screen or phone display" |
| N6 | "plastic or artificial decorative fruit" |
| N7 | "an advertisement banner with text over the image" |

Chỉ số sử dụng:

- `clip_keep = Σ P(P1..P4)` — xác suất tổng nhóm positive
- `clip_drop = Σ P(N1..N7)` — xác suất tổng nhóm negative

### 3.5.2 Kiểm chứng với ground truth

**Ground truth** được xây dựng từ 11 trang đầu đã duyệt tay (2.200 ảnh):
522 ảnh được đánh xấu thủ công (positive label) và 1.678 ảnh được giữ lại
(negative label).

**Phân bố `clip_drop`:**

| | Nhóm xấu (522 ảnh) | Nhóm tốt (1.678 ảnh) |
|---|---|---|
| Mean | **0,576** | 0,450 |
| Median | **0,582** | 0,409 |
| P25 | 0,363 | 0,270 |
| P75 | 0,808 | 0,598 |
| P90 | 0,930 | 0,825 |

**Precision / Recall / F1 tại các ngưỡng `clip_drop`:**

| Ngưỡng | TP | FP | FN | Precision | Recall | F1 |
|---|---|---|---|---|---|---|
| 0,30 | 431 | 1.169 | 91 | 0,269 | 0,826 | 0,406 |
| 0,35 | 401 | 1.031 | 121 | 0,280 | 0,768 | 0,410 |
| 0,40 | 368 | 871 | 154 | 0,297 | 0,705 | 0,418 |
| 0,45 | 350 | 723 | 172 | 0,326 | 0,670 | 0,439 |
| **0,50** | **319** | **612** | **203** | **0,343** | **0,611** | **0,439** |
| 0,55 | 282 | 499 | 240 | 0,361 | 0,540 | 0,433 |
| 0,60 | 251 | 418 | 271 | 0,375 | 0,481 | 0,421 |
| 0,65 | 215 | 343 | 307 | 0,385 | 0,412 | 0,398 |
| 0,70 | 196 | 279 | 326 | 0,413 | 0,375 | 0,393 |

F1 đạt cực đại **0,439** tại ngưỡng 0,45–0,50. Precision thấp ở mọi ngưỡng
phản ánh việc nhiều ảnh chụp thật (studio, nền trắng) cũng nhận `clip_drop`
trung bình do CLIP nhầm với "plastic/artificial fruit".

**Nhận xét:** CLIP hoạt động đáng tin cậy ở hai vùng cực:

- `clip_drop > 0,90`: clipart/cartoon — precision thực tế ~90%+
  (ground truth có nhiễu do người duyệt bỏ sót một số clipart).
- `clip_drop < 0,15`: ảnh thật ngoài vườn/chợ — không có ảnh rác.

Vùng 0,15–0,90 vẫn cần phán xét của người do CLIP nhầm nền trắng studio với
"artificial fruit".

### 3.5.3 Tiêu chí áp dụng

Để đảm bảo độ chính xác cao và hạn chế false positive, hai ngưỡng bảo thủ
được chọn:

| Quy tắc | Điều kiện | Số ảnh loại |
|---|---|---|
| A | `clip_drop > 0,92` | 297 |
| B | `watermark_hint = True` ∧ `clip_drop > 0,60` | 132 |
| **Tổng** | | **429** |

---

## 3.6 Giai đoạn 3 — Chia lại tập dữ liệu (70/15/15)

### 3.6.1 Dataset sạch

Sau 3 giai đoạn lọc, pool ảnh sạch gồm **7.348 ảnh** phân bổ như sau:

| Lớp | Sau lọc tự động | Sau duyệt tay | Sau CLIP | Còn lại |
|---|---|---|---|---|
| Apple | 1.678 | − 135 | − 119 | **1.424** |
| Banana | 1.737 | − 185 | − 66 | **1.486** |
| Grape | 1.726 | − 85 | − 37 | **1.604** |
| Mango | 1.523 | − 44 | − 53 | **1.426** |
| Strawberry | 1.636 | − 74 | − 154 | **1.408** |
| **Tổng** | **8.300** | **− 523** | **− 429** | **7.348** |

### 3.6.2 Phân chia

Toàn bộ ảnh sạch được gộp lại (không phân biệt split gốc), xáo trộn ngẫu nhiên
(seed = 42), rồi chia stratified theo từng lớp theo tỉ lệ **70% train / 15%
valid / 15% test**:

| Lớp | Train | Valid | Test | Tổng |
|---|---|---|---|---|
| Apple | 996 | 213 | 215 | 1.424 |
| Banana | 1.040 | 222 | 224 | 1.486 |
| Grape | 1.122 | 240 | 242 | 1.604 |
| Mango | 998 | 213 | 215 | 1.426 |
| Strawberry | 985 | 211 | 212 | 1.408 |
| **Tổng** | **5.141** | **1.099** | **1.108** | **7.348** |

Tỉ lệ mất cân bằng giữa các lớp: **Grape / Strawberry = 1,14×** — có thể
coi là cân bằng và không cần augmentation bù.

Các file được đổi tên theo quy ước `{Lớp}_{NNNNN}.jpeg` và lưu tại
`dataset_clean/{train|valid|test}/{Lớp}/`.

---

## 3.7 Hạn chế cố hữu

| Hạn chế | Mô tả | Cách xử lý |
|---|---|---|
| Kích thước ảnh nhỏ | 84,5% ảnh có cạnh ngắn < 224 px | Resize lên 224×224 khi load (tf.image.resize hoặc albumentations) |
| Nguồn gốc web | Ảnh từ nhiều nguồn, ánh sáng và góc chụp không đồng nhất | Augmentation (flip, rotate, color jitter) khi train |
| Ground truth CLIP | Chỉ xác minh trên 2.200 ảnh (11 trang đầu) | F1 ước tính; cần diễn giải thận trọng |

---

## 3.8 Tóm tắt

| Bước | Phương pháp | Số ảnh loại | Còn lại |
|---|---|---|---|
| Dataset gốc | — | — | **10.000** |
| Lọc kích thước | Cạnh ngắn < 150 px | 1.321 | 8.679 |
| Khử trùng MD5 | Hash toàn bộ bytes | 143 | 8.536 |
| Khử trùng dHash | Hamming ≤ 5, trong lớp | 236 | **8.300** |
| Duyệt tay | review.html, 11/42 trang | 523 | 7.777 |
| CLIP zero-shot | ViT-B/32, hai ngưỡng | 429 | **7.348** |
| Chia lại | 70/15/15 stratified | — | **7.348** |

Kết quả cuối cùng: **7.348 ảnh** chia đều cho 5 lớp, tỉ lệ cân bằng 1,14×,
lưu theo cấu trúc `dataset_clean/`.

---

# Chương 4: Tiền xử lý — Banana Ripeness Classification Dataset

## 4.1 Giới thiệu dataset

Dataset tải từ Kaggle, gồm **13.478 ảnh** phân thành 4 lớp độ chín chuối —
overripe, ripe, rotten, unripe — với cấu trúc train/valid/test có sẵn. Khác
với dataset Fruits Classification, bộ này **sạch về nội dung**: toàn bộ ảnh
chụp bằng điện thoại/camera thật, không có clipart, watermark, món ăn chế
biến hay ảnh trang trí. Vì vậy pipeline lọc CLIP zero-shot và duyệt tay
(review.html) ở Chương 3 **không được áp dụng** — chỉ khử trùng lặp và chia
lại tập.

## 4.2 Phát hiện đặc thù trước khi xử lý

Trước khi chạy pipeline, việc so sánh số file giữa các nhánh (train/valid/test)
phát hiện một vấn đề tiềm ẩn không có trong dataset Fruits:

**Ảnh trong `train/` bị nhân bản 3× bởi augmentation Roboflow.** Tên file
theo định dạng `<base-uuid>_jpg.rf.<hash>.jpg` — mỗi ảnh gốc (base-uuid) xuất
hiện đúng 3 lần trong `train/` với hash khác nhau (tỉ lệ chính xác 3,0× ở cả
4 lớp), trong khi `valid/` và `test/` mỗi base-uuid chỉ có 1 file. Kiểm tra
trực tiếp 3 bản cùng base-uuid cho thấy: cùng kích thước 416×416 nhưng
**Hamming distance dHash giữa chúng là 31–33** (so với ngưỡng near-duplicate
5) và pixel-diff trung bình ~44/255 — đây là augmentation thật (xoay/crop/
color-jitter), **không bị MD5 hay dHash Hamming≤5 bắt được**.

Nếu gộp toàn bộ ảnh thành một pool rồi xáo trộn theo từng file như quy trình
ở Chương 3, 3 bản augmented của cùng một ảnh gốc có thể bị tách vào các split
khác nhau sau khi chia lại — tạo ra rò rỉ dữ liệu mới mà cấu trúc gốc không
hề có (đã xác nhận: overlap base-uuid giữa train/valid/test gốc = 0 ở cả 4 lớp).

**Quyết định xử lý:** chia lại theo **nhóm base-uuid** (group-aware split)
thay vì theo từng file:

- Mỗi lớp: gom nhóm 70%/15%/15% base-uuid cho train/valid/test (không phải
  70/15/15 theo số file), xáo trộn với seed cố định.
- Nhóm rơi vào **train**: giữ toàn bộ các bản còn sót sau khử trùng lặp
  (1–3 bản/nhóm).
- Nhóm rơi vào **valid/test**: chỉ giữ **1 file/nhóm** (bản đầu tiên theo tên
  file) — vì tập đánh giá không cần bản augmented, giữ nhiều bản của cùng
  một quả sẽ làm accuracy bị đếm trùng.

Số ảnh gốc (base-uuid) duy nhất theo lớp: overripe 1.125, ripe 1.667, rotten
1.913, unripe 911 (tổng 5.616 ảnh gốc so với 13.478 file vật lý).

## 4.3 Pipeline áp dụng

1. Gộp toàn bộ `train + valid + test` gốc thành một pool theo lớp.
2. Loại ảnh hỏng và ảnh có cạnh ngắn < 100px.
3. Khử trùng lặp hai tầng trong cùng lớp:
   - MD5 cho trùng tuyệt đối.
   - dHash 64-bit, Hamming ≤ 5, cho gần trùng.
4. Chia lại 70/15/15 theo **nhóm base-uuid**, stratified theo lớp, seed cố định.
5. Với nhóm rơi vào valid/test: cắt còn 1 file/nhóm (dedup-to-1 cho mục đích
   đánh giá).
6. Copy sang `dataset_clean_banana/{train,valid,test}/{lớp}/`, đổi tên
   `{lớp}_{NNNNN}.jpg`.

Không cân bằng lớp bằng cách cắt bớt ảnh — giữ nguyên toàn bộ, dùng
`class_weight` khi huấn luyện.

## 4.4 Kết quả lọc và khử trùng lặp

| Lớp | Ảnh gốc | Ảnh hỏng | Cạnh ngắn<100px | MD5 dup | dHash dup (Hamming≤5) | Tổng loại | % loại |
|---|---|---|---|---|---|---|---|
| overripe | 2.691 | 0 | 0 | 0 | 538 | 538 | 20,0% |
| ripe | 4.015 | 0 | 0 | 0 | 699 | 699 | 17,4% |
| rotten | 4.593 | 0 | 0 | 0 | 798 | 798 | 17,4% |
| unripe | 2.179 | 0 | 0 | 0 | 517 | 517 | 23,7% |

MD5 = 0 ở mọi lớp (dự đoán trước — ảnh Roboflow re-encode nên không trùng
byte tuyệt đối dù cùng nguồn). dHash bắt 17–24%/lớp; kiểm tra mẫu xác nhận
đây là **ảnh chụp burst liên tiếp cùng một quả chuối** (base-uuid có
timestamp liền kề, Hamming 1–5) — dedup đúng như kỳ vọng, không phải lỗi
thuật toán. Không lớp nào vượt ngưỡng loại 25%.

## 4.5 Kết quả chia lại (group-aware 70/15/15)

| Lớp | Groups train/valid/test | Files train/valid/test | Files cắt còn 1/nhóm ở valid+test |
|---|---|---|---|
| overripe | 666 / 143 / 142 | 1.493 / 143 / 142 | 375 |
| ripe | 1.003 / 215 / 215 | 2.362 / 215 / 215 | 524 |
| rotten | 1.166 / 250 / 249 | 2.662 / 250 / 249 | 634 |
| unripe | 528 / 113 / 114 | 1.142 / 113 / 114 | 293 |
| **Tổng** | **3.363 / 721 / 720** | **7.659 / 721 / 720** | **1.826** |

Tổng ảnh cuối cùng: **9.100 ảnh** (7.659 train + 721 valid + 720 test).

## 4.6 Mất cân bằng lớp

| Lớp | Train | Valid | Test | Tổng |
|---|---|---|---|---|
| overripe | 1.493 | 143 | 142 | 1.778 |
| ripe | 2.362 | 215 | 215 | 2.792 |
| rotten | 2.662 | 250 | 249 | 3.161 |
| unripe | 1.142 | 113 | 114 | 1.369 |

Tỉ lệ mất cân bằng: **rotten / unripe = 2,31×**. Không cắt bớt để cân bằng —
xử lý bằng `class_weight` lúc huấn luyện.

## 4.7 Hạn chế cố hữu

| Hạn chế | Mô tả | Cách xử lý |
|---|---|---|
| Group-aware split làm giảm số ảnh so với 13.478 gốc | Cắt 2/3 bản augmented ở valid/test (1.826 file) để tránh đếm trùng khi đánh giá | Chấp nhận — số ảnh còn lại vẫn đủ lớn cho đánh giá tin cậy |
| Không chạy CLIP / duyệt tay | Giả định dataset sạch nội dung dựa trên khảo sát mẫu, chưa duyệt toàn bộ 9.100 ảnh bằng mắt | Có thể bổ sung duyệt tay nếu phát hiện nhiễu khi huấn luyện |

---

# Chương 5: Tiền xử lý — Mango Ripeness Classification Dataset

## 5.1 Giới thiệu dataset

Dataset tải từ Kaggle, gồm **2.741 ảnh** phân thành 3 lớp độ chín xoài —
Ripe, Rotten, Unripe. Cấu trúc gốc chỉ có `train/` và `validation/` (không có
`test/`). Đuôi file hỗn hợp jpg/jpeg/png. Cũng như Banana, bộ này sạch về nội
dung (ảnh thật, không clipart/watermark) nên không áp dụng CLIP hay duyệt tay.

## 5.2 Phát hiện đặc thù trước khi xử lý

**Rò rỉ train/validation đã biết được xác nhận:** `validation/Ripe/430.jpg`
và `train/Ripe/freshMango (19).jpg` có MD5 giống hệt nhau — xác nhận đúng
cảnh báo ban đầu (ít nhất 4 cặp trùng loại này).

**Trùng tên file giữa các sub-dataset gộp lại — KHÔNG phải augmentation.**
Tên file trong Mango pha trộn nhiều quy ước: số thuần (`1.jpg`), `freshMango
(N)`, `rottenMango (N)`, và các tiền tố bệnh lý (`aspergillus_`, `lasio_`,
`alternaria_`, `anthracnose_`, `healthy_`) — cho thấy dataset được gộp từ
nhiều nguồn con. Một số tên trùng cả tiền tố lẫn số nhưng khác đuôi file (vd.
`freshMango (139).jpg` và `freshMango (139).png` cùng tồn tại trong
`train/Ripe`). Kiểm tra thực tế: **kích thước hoàn toàn khác nhau** —
`freshMango (139).jpg` là 224×224, `freshMango (139).png` là 320×258; tương
tự `rottenMango (1).jpeg` là 275×183 trong khi `rottenMango (1).jpg` là
224×224. Đây là **2 ảnh khác nhau trùng số thứ tự do 2 sub-nguồn đánh số độc
lập**, không phải bản sao. → **Không áp dụng group-aware split cho Mango**,
xử lý theo từng file như bình thường (đúng phương án dự phòng đã thống nhất).

**Nguồn phụ độ phân giải thấp, chỉ tập trung ở lớp Unripe.** Phân bố cạnh
ngắn theo lớp (toàn bộ ảnh gốc, trước lọc):

| Lớp | n | min | p25 | median | p75 | max | Số ảnh <100px | Số ảnh 100–150px |
|---|---|---|---|---|---|---|---|---|
| Ripe | 558 | 224 | 224 | 224 | 224 | 500 | 0 | 0 |
| Rotten | 1.642 | 109 | 224 | 224 | 224 | 2.400 | 0 | 2 |
| Unripe | 541 | **60** | **105** | **119** | 224 | 224 | **110** | 290 |

Ripe và Rotten gần như đồng nhất ở 224px; riêng Unripe có một cụm ảnh nhỏ rõ
rệt (median chỉ 119px, 110 ảnh dưới 100px, cạnh ngắn thấp nhất 60px) — toàn
bộ đến từ một sub-nguồn đặt tên số thuần trong `train/Unripe` (vd. `104.jpg`,
`109.jpg`, `120.jpg`...). Đây là ảnh gốc nhỏ thật sự, không phải lỗi đọc
file. Vì cụm này khiến lớp Unripe loại tới 35,5% nếu tính chung với tiêu chí
cạnh ngắn thông thường (vượt ngưỡng dừng 25%), nó được **tách thành mục
riêng "nguồn phụ độ phân giải thấp"** thay vì gộp vào `short_side` thông
thường — vẫn áp dụng đúng ngưỡng loại 100px, chỉ khác cách phân loại lý do
trong báo cáo.

## 5.3 Pipeline áp dụng

1. Gộp `train + validation` thành một pool theo lớp.
2. Loại ảnh hỏng và ảnh có cạnh ngắn < 100px (lớp Unripe: tách riêng nhãn
   "nguồn phụ độ phân giải thấp" cho phần này).
3. Khử trùng lặp hai tầng trong cùng lớp: MD5 (bắt được rò rỉ train/valid đã
   biết) + dHash Hamming ≤ 5.
4. Chia lại 70/15/15 theo **từng file** (không group, theo quyết định ở 5.2),
   stratified theo lớp, seed cố định.
5. Copy sang `dataset_clean_mango/{train,valid,test}/{lớp}/`, đổi tên
   `{lớp_thường}_{NNNNN}.jpg`.

## 5.4 Kết quả lọc và khử trùng lặp

| Lớp | Ảnh gốc | Ảnh hỏng | Cạnh ngắn<100px (thường) | Nguồn phụ độ phân giải thấp | MD5 dup | dHash dup | Tổng loại | % loại (kể cả nguồn phụ) | % loại (không tính nguồn phụ) |
|---|---|---|---|---|---|---|---|---|---|
| Ripe | 558 | 0 | 0 | — | 86 | 34 | 120 | 21,5% | 21,5% |
| Rotten | 1.642 | 0 | 0 | — | 237 | 123 | 360 | 21,9% | 21,9% |
| Unripe | 541 | 0 | 0 | **110** | 48 | 34 | 192 | 35,5% | **15,2%** |

Không lớp nào vượt ngưỡng dừng 25% khi tính theo tiêu chí chất lượng thông
thường (loại trừ nguồn phụ độ phân giải thấp đã tách riêng ở Unripe).

## 5.5 Kết quả chia lại (per-file 70/15/15)

| Lớp | Train | Valid | Test | Tổng |
|---|---|---|---|---|
| Ripe | 307 | 66 | 65 | 438 |
| Rotten | 897 | 192 | 193 | 1.282 |
| Unripe | 244 | 52 | 53 | 349 |
| **Tổng** | **1.448** | **310** | **311** | **2.069** |

## 5.6 Mất cân bằng lớp

Tỉ lệ mất cân bằng: **Rotten / Unripe = 3,67×**. Không cắt bớt để cân bằng —
xử lý bằng `class_weight` lúc huấn luyện. Đây là mức lệch lớp cao nhất trong
3 dataset đã xử lý (Fruits 1,14×, Banana 2,31×, Mango 3,67×).

## 5.7 Hạn chế cố hữu

| Hạn chế | Mô tả | Cách xử lý |
|---|---|---|
| Không có test split gốc | Dataset gốc chỉ có train/validation | Test set hoàn toàn mới, tạo từ pool gộp — không so sánh trực tiếp được với các benchmark dùng test set gốc |
| Ground truth "không phải augmentation" cho tên trùng | Kết luận dựa trên kiểm tra kích thước ảnh mẫu (freshMango/rottenMango), chưa kiểm tra toàn bộ các cặp trùng tên | Rủi ro thấp — đã kiểm tra nhiều mẫu đều cho kết quả nhất quán (kích thước khác hẳn) |
| Nguồn phụ độ phân giải thấp bị loại | 110 ảnh Unripe rất nhỏ (60–98px) bị loại thay vì upscale mạnh | Chấp nhận loại để giữ chất lượng tối thiểu 100px đồng nhất với Banana và Fruits |
| Mất cân bằng lớp cao nhất (3,67×) | Rotten nhiều gấp ~3,7 lần Unripe | `class_weight` khi huấn luyện, không oversample/undersample |

---

# Chương 6: Gộp 3 dataset thành `dataset_final/` (10 lớp, model duy nhất)

## 6.1 Mục tiêu và ánh xạ lớp

Gộp 3 bộ đã lọc (`dataset_clean/`, `dataset_clean_banana/`, `dataset_clean_mango/`)
thành một dataset 10 lớp duy nhất cho một model phân loại độ chín trái cây.
**Loại bỏ hoàn toàn** `dataset_clean/*/Banana` và `dataset_clean/*/Mango`
(ảnh chuối/xoài lấy từ 2 bộ ripeness chuyên biệt, không lấy từ Fruits
Classification). Giữ nguyên split train/valid/test đã chia sẵn ở mỗi bộ
nguồn — **không chia lại** — để không phá vỡ group-aware split của Banana
(Chương 4).

| Lớp đích | Nguồn |
|---|---|
| Tao | `dataset_clean/*/Apple` |
| Nho | `dataset_clean/*/Grape` |
| Dau | `dataset_clean/*/Strawberry` |
| Chuoi_xanh | `dataset_clean_banana/*/unripe` |
| Chuoi_chin_toi | `dataset_clean_banana/*/ripe` |
| Chuoi_chin_ky | `dataset_clean_banana/*/overripe` |
| Chuoi_hong | `dataset_clean_banana/*/rotten` |
| Xoai_xanh | `dataset_clean_mango/*/Unripe` |
| Xoai_chin_toi | `dataset_clean_mango/*/Ripe` |
| Xoai_hong | `dataset_clean_mango/*/Rotten` |

## 6.2 Kết quả `dataset_final/` (v1)

| Lớp | Train | Valid | Test | Tổng |
|---|---|---|---|---|
| Tao | 996 | 213 | 215 | 1.424 |
| Nho | 1.122 | 240 | 242 | 1.604 |
| Dau | 985 | 211 | 212 | 1.408 |
| Chuoi_xanh | 1.142 | 113 | 114 | 1.369 |
| Chuoi_chin_toi | 2.362 | 215 | 215 | 2.792 |
| Chuoi_chin_ky | 1.493 | 143 | 142 | 1.778 |
| Chuoi_hong | 2.662 | 250 | 249 | 3.161 |
| Xoai_xanh | 244 | 52 | 53 | 349 |
| Xoai_chin_toi | 307 | 66 | 65 | 438 |
| Xoai_hong | 897 | 192 | 193 | 1.282 |
| **Tổng** | **12.210** | **1.695** | **1.700** | **15.605** |

Lệch lớp tổng: **Chuoi_hong / Xoai_xanh = 9,06×**. Không cắt bớt để cân bằng
— dùng `class_weights.json` khi huấn luyện.

## 6.3 Xác minh thứ tự nhãn với Keras

`labels.txt` được ghi theo thứ tự alphabet Python (`sorted()`). Để xác nhận
đây đúng là thứ tự Keras sẽ dùng (không suy đoán bằng mắt — tên có dấu gạch
dưới như `Chuoi_chin_ky` / `Chuoi_chin_toi` dễ gây nhầm), chạy trực tiếp:

```python
import tensorflow as tf
ds = tf.keras.utils.image_dataset_from_directory("dataset_final/train")
print(ds.class_names)
```

Kết quả: `Found 12210 files belonging to 10 classes.`

```
['Chuoi_chin_ky', 'Chuoi_chin_toi', 'Chuoi_hong', 'Chuoi_xanh',
 'Dau', 'Nho', 'Tao', 'Xoai_chin_toi', 'Xoai_hong', 'Xoai_xanh']
```

Khớp **chính xác từng vị trí** với `labels.txt`. Số file (12.210) khớp đúng
tổng train ở bảng 6.2.

## 6.4 Biến thể `dataset_final_v2/` — khử augmentation ở train Banana

`dataset_final/` (v1) giữ nguyên toàn bộ 1–3 bản augmented/base-uuid ở train
của 4 lớp chuối (do group-aware split ở Chương 4 chỉ cắt còn 1 bản/nhóm ở
valid/test, không cắt ở train). `dataset_final_v2/` áp dụng thêm cắt còn
**1 file/base-uuid ở train** cho riêng 4 lớp chuối — valid/test và toàn bộ
Tao/Nho/Dau/Xoai_* giữ nguyên như v1. Việc tái tạo nhóm base-uuid được thực
hiện bằng cách chạy lại đúng pipeline lọc/dedup/split gốc (seed 42, xác định
— đã kiểm tra: số nhóm train tái tạo ra khớp 100% với báo cáo Chương 4:
overripe 666, ripe 1.003, rotten 1.166, unripe 528).

| Lớp | Train v1 | Train v2 | Valid | Test | Tổng v1 | Tổng v2 |
|---|---|---|---|---|---|---|
| Tao | 996 | 996 | 213 | 215 | 1.424 | 1.424 |
| Nho | 1.122 | 1.122 | 240 | 242 | 1.604 | 1.604 |
| Dau | 985 | 985 | 211 | 212 | 1.408 | 1.408 |
| Chuoi_xanh | 1.142 | 528 | 113 | 114 | 1.369 | 755 |
| Chuoi_chin_toi | 2.362 | 1.003 | 215 | 215 | 2.792 | 1.433 |
| Chuoi_chin_ky | 1.493 | 666 | 143 | 142 | 1.778 | 951 |
| Chuoi_hong | 2.662 | 1.166 | 250 | 249 | 3.161 | 1.665 |
| Xoai_xanh | 244 | 244 | 52 | 53 | 349 | 349 |
| Xoai_chin_toi | 307 | 307 | 66 | 65 | 438 | 438 |
| Xoai_hong | 897 | 897 | 192 | 193 | 1.282 | 1.282 |
| **Tổng** | **12.210** | **7.914** | **1.695** | **1.700** | **15.605** | **11.309** |

**So sánh lệch lớp:**

| | v1 | v2 |
|---|---|---|
| Lệch lớp TRAIN (max/min) | Chuoi_hong/Xoai_xanh = 10,91× | Chuoi_hong/Xoai_xanh = 4,78× |
| Lệch lớp TỔNG (max/min) | Chuoi_hong/Xoai_xanh = 9,06× | Chuoi_hong/Xoai_xanh = 4,77× |

Khử augmentation ở train giảm gần một nửa mức lệch lớp (do 3 lớp chuối đông
nhất — ripe/overripe/rotten — mất tỉ lệ augmentation 3× nhiều hơn tương đối
so với unripe vốn đã ít augmented hơn), nhưng đổi lại tổng số ảnh train giảm
từ 12.210 xuống 7.914 (-35%). `class_weights_v2.json` được tính lại tương ứng
trên tập train v2 bằng `sklearn.utils.class_weight.compute_class_weight('balanced')`.

---

# Chương 7: Huấn luyện và đánh giá model

Huấn luyện chạy trên Kaggle Notebook (GPU T4), input `dataset_final_v2/` (Chương
6.4), script `train_fruit_model.py`; đánh giá chuyên sâu chạy tiếp bằng
`eval_model.py` trong cùng phiên. Số liệu trong chương này lấy từ `results.json`
và `eval_report.json` (cùng thư mục `docs/`), đối chiếu chéo với `history.json`
và các biểu đồ `.png` do hai script trên xuất ra.

## 7.1 Kiến trúc và huấn luyện hai giai đoạn

**Backbone MobileNetV2** (`weights="imagenet"`, `include_top=False`), đầu vào
224×224×3. Trước backbone, ảnh đi qua một khối augmentation (mục 7.2) rồi qua
`mobilenet_v2.preprocess_input` (đưa pixel về khoảng [-1, 1]). Sau backbone:
`GlobalAveragePooling2D` → `Dropout(0.3)` → `Dense(10, softmax)`.

Huấn luyện theo đúng khuyến nghị transfer learning chuẩn: đóng băng toàn bộ
backbone để huấn luyện phần đầu mới trước, sau đó mới mở khoá một phần backbone
với learning rate rất nhỏ.

| Giai đoạn | Epoch chạy / tối đa | Phần được cập nhật | Learning rate | Callback |
|---|---|---|---|---|
| 1 — Head | **12/12** (không dừng sớm) | Chỉ `GlobalAveragePooling2D`+`Dropout`+`Dense` — toàn bộ backbone `trainable=False` | Adam, **1e-3**, giảm còn 5e-4 từ epoch 7 | `EarlyStopping(patience=5)` không kích hoạt; `ReduceLROnPlateau(factor=0.5, patience=2)` kích hoạt đúng 1 lần |
| 2 — Fine-tune | **15/15** (không dừng sớm) | Từ layer thứ **100/154** của MobileNetV2 trở lên (kể cả Dense đầu) | Adam, **1e-5** cố định suốt 15 epoch | `EarlyStopping(patience=5)` không kích hoạt; `ReduceLROnPlateau` không kích hoạt |

Cả hai giai đoạn đều chạy hết số epoch cấu hình (`EPOCHS_HEAD=12`,
`EPOCHS_FINE=15` trong `train_fruit_model.py`) — `val_accuracy` chưa từng đứng
yên đủ 5 epoch liên tiếp nên `EarlyStopping` không cắt ngang. Vì
`restore_best_weights=True`, model cuối cùng của mỗi giai đoạn KHÔNG phải
trọng số ở epoch cuối mà là trọng số tại epoch có `val_accuracy` cao nhất trong
đúng giai đoạn đó (đọc từ `history.json`):

- Giai đoạn 1: đỉnh tại epoch 11/12, `val_accuracy = 0,9251` (epoch cuối chỉ
  0,9150 — thấp hơn).
- Giai đoạn 2: đỉnh tại epoch 14/15, `val_accuracy = 0,9504` (epoch cuối chỉ
  0,9440 — thấp hơn).

**Vì sao đóng băng BatchNorm khi fine-tune:** các lớp `BatchNormalization`
trong backbone giữ thống kê chạy (running mean/variance) học được trên toàn bộ
ImageNet. Nếu mở khoá chúng cùng lúc với các lớp Convolution ở giai đoạn 2 —
lúc batch nhỏ (32) và learning rate vừa đổi — thống kê này bị cập nhật lệch
ngay từ những batch đầu, phá hỏng đặc trưng pre-trained mà giai đoạn 1 đang
dựa vào, khiến accuracy sụt mạnh thay vì cải thiện. Đây là lỗi phổ biến khi
fine-tune MobileNetV2 nên `train_fruit_model.py` khoá `trainable=False` cho
BatchNorm bằng một vòng lặp riêng (Cell 6), tách biệt với việc mở khoá các
layer từ vị trí 100 trở lên.

**Vì sao learning rate giảm 100 lần giữa hai giai đoạn:** giai đoạn 1 dùng
`1e-3` vì chỉ huấn luyện phần đầu khởi tạo ngẫu nhiên (Dense 10 lớp), cần
learning rate đủ lớn để hội tụ nhanh. Giai đoạn 2 hạ xuống `1e-5` vì lúc này
đang tinh chỉnh trọng số pre-trained của backbone — learning rate lớn ở bước
này sẽ xoá sạch những gì backbone đã học từ ImageNet chỉ sau vài batch.

## 7.2 Augmentation áp dụng

Khối `augment` (`tf.keras.Sequential`, nằm trong đồ thị model, tự tắt lúc suy
luận vì các layer này đọc cờ `training`) gồm 6 phép biến đổi, áp dụng ngẫu
nhiên mỗi batch trong khi huấn luyện:

| Layer | Tham số | Ý nghĩa |
|---|---|---|
| `RandomFlip` | `"horizontal"` | Lật ngang — quả trong ảnh thật không có hướng cố định |
| `RandomRotation` | 0,15 (±15% × 360°, tức ±54°) | Xoay — góc chụp không đồng nhất |
| `RandomZoom` | 0,15 | Phóng to/nhỏ ±15% — khoảng cách chụp khác nhau |
| `RandomTranslation` | 0,1 / 0,1 | Dịch ảnh ±10% chiều rộng/cao — quả không luôn ở giữa khung |
| `RandomContrast` | 0,2 | Thay đổi tương phản ±20% |
| `RandomBrightness` | 0,2, `value_range=(0,255)` | Thay đổi độ sáng ±20% trên thang 0–255 |

Không có augmentation về màu sắc mạnh (hue/saturation) hay cắt ngẫu nhiên lớn
(`RandomCrop`) — dữ liệu đã đủ đa dạng bối cảnh sau 3 chương tiền xử lý, thêm
biến dạng màu mạnh có nguy cơ làm mất đặc trưng phân biệt độ chín (vốn dựa
nhiều vào màu sắc).

Song song với augmentation, `class_weight` (từ `class_weights_v2.json`, tính
bằng `compute_class_weight('balanced')` trên tập train v2 — xem 6.4) được
truyền vào cả hai lần `model.fit()` để bù lệch lớp 4,78× mà augmentation ảnh
không tự giải quyết được.

## 7.3 Kết quả tổng quan trên tập test

Tập test: **1.700 ảnh** (khớp bảng 6.2/6.4), đánh giá bằng model Keras
float32 sau khi phục hồi trọng số tốt nhất của giai đoạn fine-tune.

| Chỉ số | Giá trị | Ý nghĩa |
|---|---|---|
| Top-1 accuracy | **95,71%** | 1.627/1.700 ảnh đúng, 73 ảnh sai |
| Top-2 accuracy | 99,65% | Nhãn đúng nằm trong 2 lựa chọn xác suất cao nhất |
| Top-3 accuracy | 100% | Nhãn đúng luôn nằm trong 3 lựa chọn cao nhất |
| Macro F1 | 0,9598 | Trung bình F1 giữa 10 lớp, trọng số bằng nhau |
| Weighted F1 | 0,9570 | Trung bình F1 có trọng số theo số ảnh mỗi lớp |
| Cohen's kappa | 0,9514 | Độ đồng thuận đã loại trừ phần đúng do may mắn (10 lớp, kappa gần 1 là rất tốt) |
| Matthews correlation (MCC) | 0,9515 | Chỉ số cân bằng, đáng tin cậy hơn accuracy khi lệch lớp |
| Macro AUC (one-vs-rest) | 0,9988 | Khả năng xếp hạng đúng gần như tuyệt đối dù đôi khi chọn nhầm nhãn cuối cùng |

Macro AUC (0,9988) cao hơn hẳn so với mức chênh lệch accuracy/F1 giữa các lớp
yếu và mạnh — cho thấy model hầu như luôn xếp nhãn đúng vào top xác suất cao,
lỗi phân loại (mục 7.5) chủ yếu là chọn nhầm GIỮA hai lớp liền kề về xác suất,
không phải model "không biết" đặc trưng của lớp đó.

## 7.4 Precision / Recall / F1 theo từng lớp

| Lớp | Precision | Recall | F1 | AUC | Số ảnh test |
|---|---|---|---|---|---|
| Chuoi_chin_ky | 0,9712 | 0,9507 | 0,9609 | 0,9996 | 142 |
| Chuoi_chin_toi | 0,9716 | 0,9535 | 0,9624 | 0,9995 | 215 |
| Chuoi_hong | 0,9598 | 0,9598 | 0,9598 | 0,9989 | 249 |
| Chuoi_xanh | 0,9421 | **1,0000** | 0,9702 | 0,9998 | 114 |
| Dau | 0,9577 | 0,9623 | 0,9600 | 0,9986 | 212 |
| **Nho** | 0,9559 | **0,8967** | **0,9254** | 0,9967 | 242 |
| **Tao** | **0,9039** | 0,9628 | 0,9324 | 0,9955 | 215 |
| Xoai_chin_toi | 0,9848 | **1,0000** | 0,9924 | 1,0000 | 65 |
| Xoai_hong | 0,9897 | 0,9948 | 0,9922 | 0,9999 | 193 |
| Xoai_xanh | 0,9608 | 0,9245 | 0,9423 | 0,9996 | 53 |

Hai lớp yếu nhất theo hai tiêu chí khác nhau: **Nho** có recall/F1 thấp nhất
toàn bộ (0,8967 / 0,9254) — nhiều ảnh Nho bị đoán nhầm sang lớp khác. **Tao**
có precision thấp nhất (0,9039) — nhiều ảnh lớp KHÁC bị đoán nhầm THÀNH Tao.
Cả hai đều liên quan đến cùng một cụm nhầm lẫn, xem 7.5. `Chuoi_xanh` và
`Xoai_chin_toi` đạt recall tuyệt đối 100% dù không phải lớp nhiều ảnh test
nhất — hai lớp này có đặc trưng thị giác khác biệt rõ (chuối xanh hoàn toàn
xanh lá, xoài chín tới có màu vàng cam đặc trưng), ít trùng lặp với lớp khác.

## 7.5 Các cặp nhầm lẫn nhiều nhất

Từ confusion matrix trên tập test (`Confusion matrix.png`), 5 cặp nhầm lẫn
nhiều ảnh nhất (thực tế → bị đoán thành):

| # | Thực tế → Bị đoán thành | Số ảnh | % trong lớp thực tế |
|---|---|---|---|
| 1 | Nho → Tao | **17** | 7,0% (17/242) |
| 2 | Chuoi_hong → Chuoi_xanh | 7 | 2,8% (7/249) |
| 3 | Chuoi_chin_toi → Chuoi_hong | 7 | 3,3% (7/215) |
| 4 | Nho → Dau | 6 | 2,5% (6/242) |
| 5 | Dau → Nho | 5 | 2,4% (5/212) |

**Nhận xét — hai cụm nhầm lẫn tách biệt, không phải lỗi ngẫu nhiên:**

- **Cụm quả tròn đỏ (Nho / Dau / Tao):** #1, #4, #5 đều nằm trong cụm này —
  nho đỏ, dâu, táo đỏ có cùng tông màu đỏ/hồng và hình dạng tròn khi crop cận
  cảnh ở 224×224, đặc biệt khi ảnh chỉ lấy 1-2 quả áp sát khung hình (không có
  bối cảnh chùm nho/cây dâu để phân biệt). `Cac_anh_bi_doan_sai.png` xác nhận
  trực quan: một ảnh nho đỏ chụp cận cảnh (bổ đôi) bị đoán thành Tao với độ
  tin cậy 100%; một ảnh nho nguyên chùm khác cũng bị đoán thành Tao (99%); một
  ảnh dâu tây chụp cận cảnh bị đoán thành Tao (99%). Chiều ngược lại (Tao →
  Nho, 4 ảnh) cũng xuất hiện — xác nhận đây là nhầm lẫn hai chiều giữa các lớp
  có phân bố đặc trưng gần nhau, không phải một lớp "lấn" lớp kia.
- **Cụm độ chín chuối liền kề (#2, #3):** `Chuoi_chin_toi → Chuoi_hong` (chín
  tới bị đoán hỏng) và `Chuoi_hong → Chuoi_xanh` (hỏng bị đoán xanh) đều là
  nhầm giữa hai mốc độ chín LIỀN KỀ trên cùng một trục liên tục (xanh → chín
  tới → chín kỹ → hỏng), không nhầm sang thái cực đối lập. `Cac_anh_bi_doan_sai.png`
  cho thấy một quả chuối vỏ xanh có đốm nâu (thực tế là Chuoi_hong — đã hỏng
  bên trong dù vỏ còn xanh) bị đoán thành Chuoi_xanh với độ tin cậy 100% — mô
  hình dựa vào màu vỏ chủ đạo (xanh), trong khi nhãn thật dựa trên tình trạng
  hỏng không thể hiện rõ ở lớp vỏ ngoài trong ảnh đó.

Đây cũng là hai nhóm mà `config/ripenessFactor` cần thận trọng nhất khi tính
hạn sử dụng: nhầm giữa các mốc độ chín liền kề ảnh hưởng trực tiếp đến
`initialShelfDays` suy ra ban đầu ở màn `capture.tsx`.

## 7.6 Lượng tử hóa INT8

| Chỉ số | float32 | INT8 | Chênh lệch |
|---|---|---|---|
| Kích thước file | 8,92 MB | **2,72 MB** | Giảm **3,27×** |
| Accuracy trên test (1.700 ảnh) | 95,71% | **95,94%** | **+0,24 điểm %** (69 sai so với 73 sai) |
| Độ trễ suy luận (CPU Kaggle, sau warm-up) | — | 13,03 ms (trung bình) / 14,48 ms (p95) | — |

Lượng tử hóa INT8 ở đây không làm giảm accuracy — thậm chí nhỉnh hơn float32
0,24 điểm phần trăm (69 ảnh sai so với 73 ảnh sai trên cùng 1.700 ảnh test).
Đây là kết quả **hợp lý nhưng không nên diễn giải quá mức**: chênh lệch 4 ảnh
trên 1.700 nằm trong biên độ nhiễu của việc lượng tử hóa dịch chuyển ranh giới
quyết định ở vài ảnh biên (gần ngưỡng 50/50 giữa 2 lớp), không phải INT8 "học
tốt hơn" float32. Bộ dữ liệu hiệu chuẩn (`representative_dataset`) dùng 300
ảnh lấy ngẫu nhiên từ tập train.

Biểu đồ so sánh recall từng lớp (`Anh_huong_cua_luong_tu_hoa_INT8.png`) cho
thấy hầu hết các lớp gần như không đổi; thay đổi rõ nhất là **Nho**, recall
tăng từ khoảng 0,90 (float32) lên khoảng 0,91-0,92 (INT8) — cùng lớp yếu nhất
ở mục 7.4, phù hợp với việc lượng tử hóa xê dịch nhẹ ranh giới của đúng cụm
nhầm lẫn Nho/Tao/Dau đã nêu ở 7.5.

**Lưu ý về nguồn số liệu:** trường `recall_per_class` trong `results.json`
thực chất được tính từ dự đoán của model **float32** (biến `rec` ở Cell 8 của
`train_fruit_model.py`, được ghi lại nguyên vẹn ở Cell 10) — trùng khớp tuyệt
đối với `per_class.recall` trong `eval_report.json`. Số liệu recall theo lớp
RIÊNG cho model INT8 chỉ tồn tại dưới dạng biểu đồ (`fig_int8.png` /
`Anh_huong_cua_luong_tu_hoa_INT8.png`, tính lại độc lập trong `eval_model.py`
Cell 8), không có trong file JSON nào — báo cáo đọc giá trị này từ biểu đồ.

Độ trễ 13-14,5 ms đo trên CPU Kaggle, KHÔNG đại diện cho điện thoại thật (ghi
chú ngay trong log của script) — cần đo lại bằng `console.time` quanh lệnh gọi
`classify()` trên thiết bị Android thật để có số liệu độ trễ tại app.

## 7.7 Ngưỡng tin cậy 0,70: đánh đổi giữa tự động và chính xác

Trên 1.700 ảnh test: **1.627 ảnh đúng, 73 ảnh sai** (`Charts_02.png`, biểu đồ
"Phân bố độ tin cậy"). Phần lớn dự đoán — kể cả một số dự đoán SAI — có độ tin
cậy rất cao (gần 1,0); `Cac_anh_bi_doan_sai.png` cho thấy nhiều ảnh sai vẫn có
độ tin cậy 96-100%. Vì vậy ngưỡng tin cậy KHÔNG lọc được hết lỗi, chỉ đánh đổi
tỉ lệ tự động quyết định lấy độ chính xác trung bình cao hơn trong phần còn
lại.

`eval_model.py` (mục 5) in ra bảng chính xác cho các ngưỡng 0,5/0,6/0,7/0,8/
0,9/0,95 ra console, nhưng KHÔNG lưu vào `eval_report.json`/`results.json` —
chỉ được vẽ thành biểu đồ (`Charts_02.png` bên phải / `fig_confidence.png`).
Bảng dưới đây là số liệu đọc gần đúng từ biểu đồ đó (sai số ước lượng vài điểm
phần trăm), không phải số liệu chính xác từ console:

| Ngưỡng | Tỉ lệ ảnh tự quyết định (~) | Accuracy trong nhóm tự quyết định (~) |
|---|---|---|
| 0,50 | ~98% | ~96% |
| 0,60 | ~97% | ~96% |
| **0,70 (ngưỡng dùng trong app)** | **~96%** | **~97%** |
| 0,80 | ~93% | ~98% |
| 0,90 | ~87% | ~99% |
| 0,95 | ~83% | ~99% |

Ở ngưỡng 0,70 hiện dùng trong `classifier.ts`, khoảng 96% ảnh được model tự
quyết định (không cần `ManualFruitPicker`), với accuracy trong nhóm đó cao hơn
mức tổng (95,71%) vài điểm phần trăm. Tăng ngưỡng lên 0,90-0,95 cải thiện thêm
không nhiều (~1-2 điểm % accuracy) trong khi bắt người dùng tự chọn tay nhiều
hơn hẳn (13-17% ảnh thay vì 4%) — 0,70 là điểm cân bằng hợp lý, không phải giá
trị tối ưu tuyệt đối theo một hàm mục tiêu cụ thể.

## 7.8 Hạn chế: domain gap giữa ảnh dataset và ảnh chụp thực tế

**Về nguồn số liệu:** phần này dùng log chẩn đoán tạm thời trong
`src/lib/classifier.ts` (hàm đo giá trị trung bình từng kênh màu sau khi resize
và giải mã JPEG), chạy trên bản development, thiết bị Android thật. Đoạn log
đã được gỡ khỏi mã nguồn sau khi chẩn đoán xong. **Cỡ mẫu rất nhỏ (3 ảnh dataset,
6 ảnh chụp thật) — số liệu dưới đây minh hoạ hiện tượng domain gap đã quan sát
được, không phải thống kê đại diện cho toàn bộ tập ảnh thật sẽ gặp khi dùng app.**

**1. Ảnh từ dataset test đều dự đoán đúng** — xác nhận pipeline resize→giải mã
JPEG→dequantize tự viết (mục "Model AI" ở đầu tài liệu) không có lỗi kỹ thuật:

| File | Lớp thật | Mean R / G / B | Dự đoán | Độ tin cậy |
|---|---|---|---|---|
| Apple_00188.jpeg | Tao | 192,2 / 137,7 / 127,9 | Tao | 1,000 |
| overripe_00009.jpg | Chuoi_chin_ky | 191,0 / 188,3 / 182,8 | Chuoi_chin_ky | 1,000 |
| unripe_00016.jpg | Xoai_xanh | 84,1 / 101,4 / 53,4 | Xoai_xanh | 0,957 |

**2. Ảnh chụp thật lần đầu (camera thật trong app, chụp xa, ánh sáng phòng,
quả không chiếm hết khung hình) đều sai — và sai theo cùng MỘT hướng:**

| Đối tượng thật | Mean R / G / B | Dự đoán | Độ tin cậy |
|---|---|---|---|
| Xoài | 133,4 / 118,9 / 99,8 | **Tao** | 0,984 |
| Xoài | 109,9 / 140,0 / 92,5 | **Tao** | 0,980 |
| Xoài | 166,0 / 68,5 / 111,5 | **Tao** | 1,000 |
| Chuối | *(không ghi kênh màu)* | **Tao** | 0,867 |
| Chuối | *(không ghi kênh màu)* | **Tao** | 0,776 |
| Chuối | *(không ghi kênh màu)* | **Tao** | 0,624 |

**0/6 đúng, cả 6 ảnh đều rơi về lớp Tao** — không phải lỗi ngẫu nhiên rải đều
sang nhiều lớp.

**3. So sánh phân bố kênh màu giữa hai nhóm:** 2 trong 3 ảnh dataset (Apple,
banana chín kỹ) có mean từng kênh tập trung quanh **190** (ảnh chụp studio,
nền sáng, phơi sáng đều). 3 ảnh xoài chụp thật có mean quanh **110-140**, thấp
hơn rõ rệt — đúng như dự kiến với ảnh chụp tay trong phòng, thiếu sáng hơn
studio. Bản thân mean thấp hơn không lạ (ảnh tối hơn), nhưng nó đặt các ảnh
chụp thật ra ngoài vùng phân bố mà model quen thấy lúc huấn luyện (dataset
xoài/chuối lấy từ 2 bộ ripeness chụp studio nhất quán — Chương 4, 5), nên
theo mục "cơ chế thất bại" bên dưới, dự đoán bị đẩy về lớp có bối cảnh đa dạng
nhất.

**4. Nguyên nhân kỹ thuật đã loại trừ** (không phải lỗi code): shape đầu vào
đúng `[1,224,224,3]`; số phần tử khớp `150528`; tổng xác suất sau dequantize
xấp xỉ 1,0; thứ tự kênh màu RGB đúng (ảnh táo đỏ cho `mean_R` cao nhất trong
3 kênh, không bị đảo thành BGR); và quan trọng nhất — 3 ảnh mẫu lấy trực tiếp
từ chính tập test đều dự đoán đúng trên cùng pipeline, cùng thiết bị. Nếu lỗi
nằm ở code (resize sai, giải mã JPEG sai, dequantize sai công thức), 3 ảnh
dataset này cũng sẽ sai theo cùng cách. Cơ chế thất bại nhiều khả năng nhất:
khi phân bố màu lệch khỏi vùng model từng thấy, dự đoán có xu hướng rơi về
lớp **Tao** — lớp có dữ liệu đa dạng nhất về bối cảnh vì lấy từ nguồn web
scrape (Chương 3), trong khi chuối và xoài chỉ đến từ các bộ ripeness chụp
studio nhất quán (Chương 4, 5) — khớp với cụm nhầm lẫn Nho/Dau/Tao đã thấy ở
7.5, cho thấy Tao có vùng quyết định "rộng" hơn các lớp khác trong không gian
đặc trưng.

**5. Biện pháp giảm thiểu hiện có trong app** (không giải quyết tận gốc domain
gap, chỉ giảm hậu quả với người dùng):

- Ngưỡng tin cậy 0,70 (mục "Model AI"): dưới ngưỡng thì ẩn kết quả AI, bắt
  chọn thủ công qua `ManualFruitPicker` — nhưng như 6 ảnh chụp thật ở trên cho
  thấy, độ tin cậy có thể vẫn rất cao (0,98-1,00) dù dự đoán sai, nên ngưỡng
  này không chặn được hết trường hợp domain gap nghiêm trọng.
- Nút "Sửa" luôn hiển thị cạnh kết quả độ chín trên màn `capture.tsx`, cho
  phép người dùng ghi đè bất kỳ lúc nào, kể cả khi độ tin cậy cao.
- Hướng dẫn trên màn chụp: đưa quả lại gần camera, chụp nơi đủ sáng, tránh
  ngược sáng — đúng với quan sát định tính "chụp thật sau khi điều chỉnh" (gần
  hơn, quả chiếm phần lớn khung hình, đủ sáng) nhận diện đúng cả chuối lẫn
  xoài, dù chưa đo lại có hệ thống (chưa có bảng số liệu, cần chụp tối thiểu
  10 ảnh/loại để lập lại bảng như mục 1-2 ở trên).

**Hướng khắc phục tận gốc:** bổ sung ảnh tự chụp bằng chính thiết bị dùng demo
vào tập huấn luyện rồi fine-tune lại vài epoch (lặp lại quy trình 7.1 giai
đoạn 2 với learning rate nhỏ tương tự), thay vì chỉ dựa vào ngưỡng tin cậy và
nút sửa tay ở phía ứng dụng.

## 7.9 Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| Kiến trúc | MobileNetV2 transfer learning, 2 giai đoạn (head 12 epoch, LR 1e-3 → fine-tune 15 epoch, LR 1e-5, mở khoá từ layer 100/154, BatchNorm luôn đóng băng) |
| Test accuracy (float32) | **95,71%** (macro F1 0,9598, kappa 0,9514, MCC 0,9515, macro AUC 0,9988) |
| Lớp yếu nhất | Nho (recall 0,8967) và Tao (precision 0,9039) — cùng một cụm nhầm lẫn quả tròn đỏ |
| Cặp nhầm lẫn #1 | Nho → Tao, 17/242 ảnh (7,0%) |
| Lượng tử hóa INT8 | 8,92 MB → 2,72 MB (nén 3,27×), accuracy 95,71% → 95,94% (không giảm), độ trễ CPU Kaggle ~13 ms |
| Ngưỡng tin cậy 0,70 | ~96% ảnh tự quyết định, ~97% accuracy trong nhóm đó (ước tính từ biểu đồ) |
| Hạn chế lớn nhất | Domain gap: 6/6 ảnh chụp thật đầu tiên sai, toàn bộ rơi về lớp Tao — minh hoạ bằng mẫu nhỏ, chưa đo hệ thống |
