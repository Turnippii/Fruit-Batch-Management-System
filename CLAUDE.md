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

Vai trò chọn lúc đăng ký, lưu trong `users/{uid}/role`. Đăng nhập chỉ xác thực
bằng email/mật khẩu rồi đọc lại role từ đó — không hỏi lại vai trò mỗi lần đăng
nhập. Hai luồng màn hình tách biệt hoàn toàn.

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
                         consumedRatio (null khi at_garden/in_transit),
                         updatedAt (mốc ghi consumedRatio gần nhất),
                         status, growerId, currentHolderId, imageUrl, createdAt
lots/{lotId}/history     [{ event, timestamp, actorId, note }]
stations/{stationId}     temp, humid, updatedAt, retailerId
alerts/{alertId}         lotId, level: "green"|"yellow"|"red", type, createdAt,
                         isRead, message, retailerId, growerId
config/ripenessFactor    hệ số độ chín theo loại quả và trạng thái
config/shelfLifeBase     T0 theo loại quả, lấy từ USDA FoodKeeper
config/ripenessSupported ["Chuoi", "Xoai"]
config/assumedTemp       nhiệt độ giả định chặng at_garden/in_transit (xem Quy tắc nghiệp vụ)
```

`status` của lô: `at_garden` → `in_transit` → `in_stock` → `sold` | `discarded`

## Kết nối Firebase

Kiến trúc 3 lớp, không màn hình nào gọi Firebase SDK trực tiếp:

- `src/services/` — duy nhất nơi gọi Firebase SDK. `firebase.ts` export
  `getFirebaseAuth()`/`getFirebaseDatabase()` — khởi tạo TRỄ (app/auth với
  persistence AsyncStorage/database), chỉ chạm Firebase ở lần gọi thật đầu
  tiên, để `USE_MOCK = true` chạy được kể cả khi `.env` thiếu hoặc mất mạng.
  `auth.ts`, `lots.ts`, `stations.ts`, `config.ts`, `alerts.ts` mỗi file bọc
  một nhóm thao tác (CRUD, `onValue`/`get`, query `orderByChild`+`equalTo`),
  luôn gọi `getFirebaseAuth()/getFirebaseDatabase()` bên trong hàm — KHÔNG
  import `auth`/`database` như hằng số ở đầu file (sẽ ép khởi tạo sớm).
- `src/hooks/` — bọc service thành hook React (`useConfig`, `useStationTemp`,
  `useLotById`, `useLotsByHolder`, `useLotsByGrower`, `useAlerts`), tự hủy
  listener trong cleanup của `useEffect`, tự chuyển sang dữ liệu giả khi
  `USE_MOCK = true`.
- `src/context/AuthContext.tsx` (qua `useAuth`) và `src/state/LotsContext.tsx`
  (qua `useLots`) — 2 context toàn app, cùng cơ chế chuyển mock/thật.

**Mọi hook subscribe theo uid (`useStationTemp`, `useLotById`, `useLotsByHolder`,
`useLotsByGrower`, `useAlerts`) đều gọi `useAuth()` bên trong để tự bảo vệ,
không phụ thuộc caller truyền đúng:**

- Không subscribe khi `AuthContext.loading === true` (chưa có token thật —
  tránh query lúc app vừa mở hoặc vừa đổi tài khoản).
- `useEffect` liệt kê CẢ `profile?.uid` lẫn `authLoading` trong dependency
  array, không chỉ id đang truy vấn — vì `AuthContext.loading` chỉ `false`
  MỘT LẦN khi app mở (không bật lại `true` giữa phiên), nên riêng đổi
  `profile.uid` (đăng xuất rồi đăng nhập tài khoản khác, KHÔNG reload app)
  mới là tín hiệu đúng để huỷ listener mang token cũ và mở lại listener mới —
  thiếu `profile?.uid` trong deps thì hook không biết phiên đã đổi.
- Lỗi `permission_denied` từ Firebase được coi là THOÁNG QUA (đúng lúc token
  cũ chưa kịp thay bằng token mới) — `src/lib/firebaseErrors.ts` nhận diện,
  hook giữ nguyên trạng thái `loading: true` thay vì hiện lỗi thật ra UI. Đánh
  đổi có chủ đích: nếu rules sai thật (không tự khỏi), màn hình đứng ở loading
  thay vì báo lỗi rõ ràng — chấp nhận được cho demo, khó debug hơn nếu rules
  hỏng thật.
- `useStationTemp` còn nhận thêm `role` (xem `src/lib/lotHolder.ts` —
  `getHolderRole(lot.status)`) — chỉ subscribe khi `role === 'retailer'`, trả
  `station: undefined` ngay nếu không (chủ vườn tra station theo uid của
  chính mình sẽ luôn ra null vô ích vì không có trạm nào gắn với chủ vườn).

**`src/config.ts` — cờ `USE_MOCK`.** `true` = mọi hook/context trên đọc thẳng
`src/mocks/`, không đụng mạng. `false` = dùng Firebase thật. Đổi tay khi cần,
dùng làm phương án dự phòng lúc demo mất mạng — không xoá `src/mocks/`. Hai
tài khoản demo trong `src/mocks/users.ts` (`vuon@test.com`, `daily@test.com`)
dùng đúng email của 2 tài khoản Firebase Auth thật — đổi `USE_MOCK` không
phải đổi cách đăng nhập, chỉ mật khẩu bị bỏ qua ở chế độ mock. `growerId`/
`currentHolderId`/`actorId` trong `src/mocks/lots.ts` cũng dùng đúng
`mock-grower`/`mock-retailer` — khớp uid mock mà `AuthContext` gán
(`mock-${role}`), để `useLotsByGrower`/`useLotsByHolder`/`useAlerts` lọc
đúng ở cả hai chế độ.

**Biến môi trường** (`.env`, tiền tố bắt buộc `EXPO_PUBLIC_` để lọt vào bundle
client): `EXPO_PUBLIC_FB_API_KEY`, `EXPO_PUBLIC_FB_AUTH_DOMAIN`,
`EXPO_PUBLIC_FB_DATABASE_URL`, `EXPO_PUBLIC_FB_PROJECT_ID`,
`EXPO_PUBLIC_FB_APP_ID`. `.env` nằm trong `.gitignore`, không commit.
`app.config.js` đọc `process.env.EXPO_PUBLIC_FB_*` lúc build, gom vào
`extra.firebase`; `src/services/firebase.ts` đọc lại qua `expo-constants`
(`Constants.expoConfig.extra.firebase`), KHÔNG đọc `process.env` trực tiếp
trong code app.

`firebase-seed.json` ở gốc repo là dữ liệu mẫu để import thủ công vào Realtime
Database qua Firebase Console (Import JSON) — khớp đúng cấu trúc ở trên, dùng
UID Auth thật thay cho 2 tài khoản test.

**`database.rules.json` ở gốc repo — dán trực tiếp vào Console (Realtime
Database → Rules).** Phân quyền theo đúng vai trò, hệ quả quan trọng cho cách
đọc dữ liệu:

- `lots`: đọc theo DANH SÁCH (list/query không lọc) CHỈ được phép khi query
  đúng `orderByChild('growerId'|'currentHolderId').equalTo(auth.uid)` — khớp
  `useLotsByGrower`/`useLotsByHolder`. KHÔNG còn cách nào "đọc toàn bộ lots/"
  qua rules này — `src/state/LotsContext.tsx` vì vậy KHÔNG tự subscribe toàn
  bộ `lots/` ở chế độ Firebase thật nữa (chỉ giữ 3 hàm CRUD ghi), mọi màn cần
  danh sách phải dùng `useLotsByGrower`/`useLotsByHolder`.
- `lots/$lotId`: đọc TRỰC TIẾP một lô theo đúng mã thì mở cho mọi user đã đăng
  nhập — khớp đúng thiết kế "mã QR chỉ chứa mã lô, quét QR → tra Firebase":
  biết đúng mã coi như đã có quyền tra cứu, không cần là grower/retailer của
  lô đó. Dùng cho `useLotById`.
- `stations`: giống `lots` — `.read` query-scoped PHẢI đặt ở nhánh CHA
  `stations` (không phải `stations/$stationId`), vì Firebase Realtime Database
  đánh giá quyền đọc ở đúng nhánh được truy vấn (`orderByChild`/`equalTo`
  chạy ở `stations`, không "thấm" xuống filter từng con) — thiếu rule ở nhánh
  cha thì `orderByChild('retailerId').equalTo(uid)` bị permission_denied dù
  rule ở `$stationId` đúng. Rule ở `$stationId` chỉ áp dụng khi đọc trực tiếp
  1 station theo đúng key.
- `alerts`: mỗi alert lưu sẵn `retailerId` (đại lý đang giữ lô lúc cảnh báo
  phát sinh) và `growerId` (chủ vườn của lô đó) — denormalize từ lô liên quan
  tại thời điểm tạo, không tra chéo sang `lots` mỗi lần đọc. Đọc DANH SÁCH chỉ
  được phép khi query đúng `orderByChild('retailerId'|'growerId').equalTo(auth.uid)`
  — khớp `useAlerts(role, uid)`: đại lý lọc theo `retailerId` (kho của mình),
  chủ vườn lọc theo `growerId` (lô mình gửi đi). Ghi (tạo/sửa alert) chỉ đại
  lý liên quan làm được — chủ vườn chỉ đọc, không ghi.
- `app/(retailer)/scan.tsx` mô phỏng "vừa quét được" bằng cách lấy lô đầu
  tiên có status `in_transit` từ danh sách toàn bộ — cũng không còn đọc được
  ở chế độ Firebase thật vì cùng lý do trên. Cần đổi sang nhập/tra đúng 1 mã
  lô (khớp thiết kế QR ở trên) khi nối camera thật.

## Quy tắc nghiệp vụ

**Mã QR chỉ chứa mã lô**, dạng `FC-2026-A7X92K`. Không nhúng dữ liệu vào QR vì
hạn sử dụng thay đổi theo thời gian và nhiệt độ. Quét QR → lấy mã → tra Firebase.

**Không bao giờ ghi cứng `expiryDate`.** Luôn tính từ `initialShelfDays` và
`consumedRatio`:

```
remainingRatio = 1 - consumedRatio
remainingDays  = remainingRatio * initialShelfDays
```

**`consumedRatio` LUÔN tích lũy từ `harvestDate`, không có chặng nào được coi là
"chưa tiêu hao".** Trái cây hao mòn cả khi còn ở vườn và khi đang vận chuyển,
chỉ khác nguồn nhiệt độ dùng để tính từng chặng:

| Chặng | Từ — đến | Nguồn nhiệt độ |
|---|---|---|
| `at_garden` | `harvestDate` → lúc xuất kho | `config/assumedTemp.at_garden_normal` (30°C) hoặc `.at_garden_cold` (15°C) nếu `storageType = "lanh"` |
| `in_transit` | lúc xuất kho → lúc đại lý nhận | `config/assumedTemp.in_transit` (32°C) hoặc `.in_transit_cold` (18°C) nếu `storageType = "lanh"` |
| `in_stock` | lúc đại lý nhận → hiện tại | nhiệt độ đo thật từ `stations/{stationId}` |

Mỗi chặng cộng dồn theo công thức:

```
consumedRatio += (dt/24) * 2^((T-25)/10) / initialShelfDays
```

trong đó `dt` tính bằng giờ, `T` là nhiệt độ (giả định hoặc đo thật) của chặng đó.

**Nguồn sự thật của `consumedRatio` khác nhau theo `status`, và KHÔNG màn hình
nào được đọc `lot.consumedRatio` trực tiếp — luôn gọi `resolveConsumedRatio(lot,
config, stationTemp, now)` trong `src/lib/shelfLife.ts`:**

- `at_garden` / `in_transit`: field `consumedRatio` trong dữ liệu luôn là `null`.
  App bỏ qua nó, tự tính tại chỗ từ `harvestDate` bằng
  `getConsumedRatioBreakdown` + `getTotalConsumedRatio`.
- `in_stock`: đọc `consumedRatio` đã lưu (do ESP32 ghi định kỳ), cộng thêm phần
  tiêu hao trôi qua từ `updatedAt` đến hiện tại bằng nhiệt độ cảm biến gần nhất
  (`getStageConsumedRatio(updatedAt, now, stationTemp, initialShelfDays)`).
  Thiếu `updatedAt` hoặc chưa có nhiệt độ cảm biến thì trả nguyên giá trị đã lưu,
  không cộng dồn.
- `sold` / `discarded`: lô đã rời khỏi kho, KHÔNG còn cộng drift theo nhiệt độ
  kho nữa — trả nguyên `consumedRatio` đã lưu tại thời điểm đó, đứng yên vĩnh
  viễn. Nhầm nhánh này với `in_stock` sẽ khiến lô đã bán vẫn tiếp tục "hết hạn"
  trên giấy tờ dù không còn nằm trong kho.
- **Thời điểm đại lý quét nhận lô** (`at_garden`/`in_transit` → `in_stock`): app
  tính một lần toàn bộ phần `at_garden` + `in_transit` bằng
  `getTotalConsumedRatio(getConsumedRatioBreakdown(...))` rồi GHI kết quả đó
  vào `consumedRatio` làm giá trị khởi đầu, kèm `updatedAt` = thời điểm nhận.
  Từ đây nguồn sự thật chuyển hẳn sang giá trị lưu (nhánh `in_stock` ở trên).

Màn chi tiết lô hiển thị rõ từng chặng dùng nhiệt độ giả định hay cảm biến
thật ở thẻ "Nguồn nhiệt độ" (`getConsumedRatioBreakdown`, độc lập với
`resolveConsumedRatio`), để người dùng không hiểu lầm số liệu là đo được 100%.

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
- Đã nối Firebase thật (xem mục "Kết nối Firebase"). `src/mocks/` vẫn giữ lại
  làm phương án dự phòng — bật bằng cờ `USE_MOCK` trong `src/config.ts`, không
  xoá dù không còn là đường chính.
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
- Coi `consumedRatio = 0` khi lô còn ở `at_garden`/`in_transit` — luôn tính tiêu hao
  từ `harvestDate`, chỉ đổi nguồn nhiệt độ theo chặng
- Đọc `lot.consumedRatio` trực tiếp ở màn hình/component — luôn qua
  `resolveConsumedRatio()`, nguồn tính khác nhau tuỳ `status`

  ## Lưu ý môi trường
- Expo SDK 57, package name com.liam0412steam.fruitbatchmanagementsystem
- Có .npmrc với legacy-peer-deps=true, đừng xoá
- Cài thư viện: npm install <pkg> --legacy-peer-deps
  hoặc npx expo install <pkg> -- --legacy-peer-deps
- slug trong app.json phải giữ "fruit-batch-management-system" cho khớp projectId EAS
- Đã build development APK thành công, chỉ build lại khi thêm thư viện native
- `firebase`, `expo-constants`, `@react-native-async-storage/async-storage` đã
  có sẵn trong package.json — không cần cài lại hay build lại APK cho phần
  Firebase (đều là JS package, không phải native module mới)
- Sửa `.env` xong phải `expo start -c` (xoá cache) mới nạp lại `app.config.js`;
  thiếu biến `EXPO_PUBLIC_FB_*` thì app throw ngay lúc khởi động
  (`src/services/firebase.ts`), không phải lỗi Firebase Console