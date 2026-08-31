# FruitTrace — Ứng dụng quản lý lô trái cây

## Bối cảnh

Đồ án môn Phát triển ứng dụng di động, HCMUTE. App React Native quản lý lô trái cây
từ vườn đến đại lý, kết nối với trạm IoT ESP32 qua Firebase Realtime Database.

Người dùng cuối là chủ vườn và nhân viên đại lý ở Việt Nam. **Toàn bộ giao diện
tiếng Việt.** Code, tên biến, comment dùng tiếng Anh.

## Hai vai trò

**Chủ vườn (grower)** — chụp ảnh lô hàng, AI nhận diện loại quả và độ chín, nhập
thông tin lô, hệ thống tính hạn sử dụng, sinh mã QR để dán lên thùng.

**Đại lý (retailer)** — quét QR lô nhận về, xem hồ sơ và đếm ngược thời gian thực,
theo dõi kho theo màu trạng thái, nhận cảnh báo.

Vai trò chọn lúc đăng nhập, lưu trong `users/{uid}/role`. Hai luồng màn hình tách
biệt hoàn toàn.

## Ngăn xếp công nghệ

| Thành phần | Lựa chọn | Ghi chú |
|---|---|---|
| Framework | Expo (managed) + Expo Router | điều hướng theo file |
| Ngôn ngữ | TypeScript | |
| Backend | Firebase JS SDK (modular v10+) | Realtime Database + Auth |
| Camera & QR | `expo-camera` (`CameraView`) | KHÔNG dùng expo-barcode-scanner, đã khai tử |
| Sinh mã QR | `react-native-qrcode-svg` + `react-native-svg` | |
| AI on-device | `react-native-fast-tflite` | thêm sau cùng |
| Lưu cục bộ | `@react-native-async-storage/async-storage` | phiên đăng nhập |

Chạy bằng **EAS development build** trên điện thoại Android thật. Expo Go không
chạy được vì camera và TFLite là native module.

## Cấu trúc dữ liệu Firebase

```
users/{uid}              role: "grower" | "retailer", name, orgName
lots/{lotId}             fruitType, ripeness, harvestDate, quantity, unit,
                         storageType, gardenName, initialShelfDays,
                         consumedRatio, expiryDate, status, growerId,
                         currentHolderId, imageUrl, createdAt
lots/{lotId}/history     [{ event, timestamp, actorId, note }]
stations/{stationId}     temp, humid, updatedAt, retailerId
alerts/{alertId}         lotId, level: "green"|"yellow"|"red", type, createdAt, isRead
config/ripenessFactor    hệ số độ chín theo loại quả và trạng thái
config/shelfLifeBase     T0 theo loại quả, lấy từ USDA FoodKeeper
config/ripenessSupported ["Chuoi", "Xoai"]
```

`status` của lô: `at_garden` → `in_transit` → `in_stock` → `sold` | `discarded`

## Quy tắc nghiệp vụ

**Mã QR chỉ chứa mã lô**, dạng `FC-2026-A7X92K`. Không nhúng dữ liệu vào QR vì
hạn sử dụng thay đổi theo thời gian và nhiệt độ. Quét QR → lấy mã → tra Firebase.

**Không bao giờ ghi cứng `expiryDate`.** Luôn tính từ `initialShelfDays` và
`consumedRatio`:

```
remainingRatio = 1 - consumedRatio
remainingDays  = remainingRatio * initialShelfDays
```

**Ngưỡng màu tính theo phần trăm vòng đời còn lại**, không theo số ngày tuyệt đối:

| Màu | Điều kiện | Ý nghĩa |
|---|---|---|
| green | remainingRatio > 0.5 | còn an toàn |
| yellow | 0.2 < remainingRatio ≤ 0.5 | ưu tiên bán |
| red | remainingRatio ≤ 0.2 | quá hạn hoặc sắp hết |

**Bộ đếm ngược chạy phía client** bằng `setInterval` từ `expiryDate` suy ra, không
gọi Firebase mỗi giây.

## Model AI

Một model 10 lớp, file `assets/model/fruit_int8.tflite` và `assets/model/labels.txt`.

```
Chuoi_chin_ky, Chuoi_chin_toi, Chuoi_hong, Chuoi_xanh,
Dau, Nho, Tao, Xoai_chin_toi, Xoai_hong, Xoai_xanh
```

**Thứ tự trên là thứ tự alphabet, không phải thứ tự logic độ chín.**
`Chuoi_chin_ky` đứng TRƯỚC `Chuoi_chin_toi`. Luôn map nhãn bằng chuỗi, tuyệt đối
không dùng index.

- Input: 224×224×3, uint8 (0–255), model tự chuẩn hoá bên trong
- Output: 10 xác suất
- **Ngưỡng tin cậy 0.70** — dưới ngưỡng thì hiện nút chọn thủ công
- Nhãn `*_hong` (hỏng) → chặn tạo lô, hiện cảnh báo
- Táo, nho, dâu không có nhãn độ chín → người dùng tự chọn, mặc định "Chín tới"

## Quy ước code

- Component hàm, hook. Không dùng class.
- Đặt tên: `PascalCase` cho component, `camelCase` cho hàm và biến, `SCREAMING_SNAKE` cho hằng.
- Mọi truy cập Firebase gom vào `src/services/`, màn hình không gọi trực tiếp.
- Logic tính hạn sử dụng gom vào `src/lib/shelfLife.ts`, có unit test.
- Text hiển thị gom vào `src/constants/strings.ts`, không rải chuỗi trong JSX.
- Định dạng ngày `dd/MM/yyyy`, giờ `HH:mm`.

## Bảng màu

```
green.dark   #14532D   tiêu đề, nút chính
green.main   #2E7D32   nhấn mạnh của vai trò chủ vườn
blue.main    #1D4ED8   nhấn mạnh của vai trò đại lý
amber.main   #D97706   cảnh báo mức vàng
red.main     #DC2626   cảnh báo mức đỏ
ink          #1F2937   chữ chính
muted        #5B6B5F   chữ phụ
bg           #F9FBF8   nền
card         #FFFFFF   thẻ
border       #D6E5D4   viền
```

## Cách làm việc

- Làm từng mốc một, không nhảy cóc. Xong mốc nào commit mốc đó.
- **Giai đoạn đầu dùng dữ liệu giả** trong `src/mocks/`. Chỉ nối Firebase khi
  toàn bộ 8 màn hình đã hiển thị được.
- Sau mỗi thay đổi lớn, chạy `npx tsc --noEmit` để bắt lỗi kiểu.
- Không tự ý thêm thư viện mới nếu chưa hỏi. Thư viện native cần build lại APK.
- Không viết file dài quá 250 dòng, tách nhỏ ra.

## Điều tuyệt đối tránh

- Ghi `expiryDate` cố định vào Firebase
- Nhúng dữ liệu lô vào mã QR
- Map nhãn AI bằng chỉ số mảng
- Gọi Firebase trong vòng lặp đếm ngược
- Dùng `expo-barcode-scanner` (đã khai tử)
- Hardcode hệ số độ chín trong code, phải đọc từ `config/`


## Lưu ý môi trường
- Có xung đột peer dependency giữa expo-router và react.
  Mọi lệnh cài thư viện phải kèm --legacy-peer-deps
- Expo SDK 57
- Xung đột peer dependency giữa expo-router và react.
  Với npm:  npm install <pkg> --legacy-peer-deps
  Với expo: npx expo install <pkg> -- --legacy-peer-deps