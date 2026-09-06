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
| AI on-device | `react-native-fast-tflite` | đã tích hợp, xem "Model AI" |
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
  1 station theo đúng key. **Ghi** vào `stations/$stationId` CHỈ được phép khi
  `retailerId` đã lưu của đúng station đó bằng `auth.uid` (đại lý sở hữu trạm
  mới ghi được nhiệt độ của chính mình) — trước đây `.write` là
  `auth != null` cho `temp`/`humid`/`updatedAt`, nghĩa là BẤT KỲ tài khoản
  nào đăng nhập cũng hạ được nhiệt độ giả của bất kỳ kho nào để kéo dài hạn
  sử dụng hiển thị, đã siết lại. Kèm `.validate`: `temp` phải trong
  khoảng [-10, 60], `humid` trong [0, 100], và `retailerId` KHÔNG được đổi
  sau khi trạm đã tồn tại (chỉ set được lúc tạo mới).
  **Lưu ý cho phần cứng (ESP32):** thiết bị ghi nhiệt độ bằng **Database
  Secret** (legacy secret key), truy cập này ĐI VÒNG QUA toàn bộ Security
  Rules ở trên — ESP32 không bị ảnh hưởng bởi các ràng buộc ownership/range
  vừa thêm, vẫn ghi bình thường như cũ. Các ràng buộc này chỉ chặn truy cập
  qua Firebase JS SDK với ID token của user (app di động, Console, hoặc gọi
  REST API kèm ID token) — tức chặn đúng lỗ hổng "một tài khoản bất kỳ tự ý
  sửa nhiệt độ kho người khác qua app/API", không phải lớp bảo vệ cho ESP32.
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

**`generateLotCode`/`isValidLotCode` (`src/lib/lotCode.ts`) CỐ Ý dùng hai bảng ký
tự khác nhau — sinh thì chặt, chấp nhận thì rộng:**

- `generateLotCode` sinh 6 ký tự cuối chỉ từ `CODE_CHARS` (A-Z0-9 loại bỏ
  `0/O` và `1/I`) — hai cặp này quá giống nhau khi in nhỏ lên tem hoặc đọc
  bằng mắt lúc đối chiếu thủ công.
- `isValidLotCode` KHÔNG dùng chung `CODE_CHARS` — chấp nhận đầy đủ
  `/^FC-\d{4}-[A-Z0-9]{6}$/` (có cả 0/O/1/I), vì mã hợp lệ có thể đến từ
  nguồn khác app tự sinh: `firebase-seed.json`, hệ thống cũ, người dùng gõ
  tay. Từng bị bug thật: validate dùng chung `CODE_CHARS` khiến mã hợp lệ
  như `FC-2026-F1H60Y` (chứa `1` và `0`) bị từ chối nhầm.
- Trước khi so khớp, luôn chuẩn hoá bằng `normalizeLotCode` (`trim()` +
  `toUpperCase()`) — QR từ nhiều nguồn hay chèn khoảng trắng/xuống dòng ở
  cuối và không nhất quán hoa/thường.

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

**Đã tích hợp thật (`src/lib/classifier.ts`)**, chữ ký giữ nguyên
`classify(uri) => { label, confidence, top3 }` như `src/mocks/classifier.ts` —
`app/(grower)/capture.tsx` chọn hàm nào chạy bằng
`const classify = USE_MOCK ? classifyMock : classifyReal` (đấu theo cờ
`USE_MOCK` ở `src/config.ts`, giống mọi service khác). Vài quyết định đáng
nhớ khi đọc lại code:

- **Không có API đọc pixel thô trực tiếp từ ảnh chụp.** `expo-camera` chỉ cho
  file JPEG, `expo-image-manipulator` chỉ resize ra file/base64 JPEG khác
  (vẫn nén, không phải mảng pixel). Pipeline thật: resize 224×224 bằng
  `expo-image-manipulator` (native, nhanh) → giải mã JPEG kết quả bằng
  `jpeg-js` (JS thuần) → bỏ kênh Alpha, giữ đúng thứ tự R-G-B → uint8 array
  150528 byte truyền thẳng cho model.
- **`jpeg-js` phải gọi với `{ useTArray: true }`** — mặc định thư viện dùng
  `Buffer.alloc()` (global `Buffer` của Node), không có trong Hermes/React
  Native, sẽ throw "Buffer is not defined". `useTArray: true` chuyển sang
  `Uint8Array` thuần, không cần polyfill gì thêm.
- **Đã CÂN NHẮC và TỪ CHỐI `pngjs`** (định dùng để tránh nén JPEG lần 2 khi
  resize) — `pngjs` `require('zlib')`/`require('stream')`/`require('buffer')`
  của Node ở nhiều file lõi (`sync-inflate.js`, `chunkstream.js`...), không
  chạy được trong RN nếu không polyfill cả chuỗi zlib/stream — đổi lại dùng
  JPEG (`compress: 1`, giảm mất mát) + `jpeg-js` cho gọn.
- **Base64 → bytes tự viết tay** (`src/lib/base64.ts`, có unit test) — không
  dùng `Buffer`/`atob` của Node vì lý do y hệt trên.
- **`labels.txt` đọc THẬT lúc runtime** qua `expo-asset`
  (`Asset.fromModule(...).downloadAsync()` rồi `fetch(uri).then(r=>r.text())`)
  — không hardcode danh sách nhãn trong code, đổi model+labels.txt sau này
  không cần sửa `classifier.ts`. `metro.config.js` phải có `txt` trong
  `resolver.assetExts` (thêm cùng lúc với `tflite`) để `require()` file này
  không bị Metro cố parse như code.
- **Dequantize output theo quy ước CHUẨN, không có scale/zero_point thật từ
  thư viện.** `Tensor` type của `react-native-fast-tflite` chỉ có
  `{name, dataType, shape}`, không lộ `scale`/`zero_point` của tensor lượng
  tử hoá — model int8 thường xuất output cũng ở dạng uint8/int8, không phải
  float trực tiếp. `classifier.ts` giả định quy ước chuẩn cho lớp softmax
  (`uint8`: giá trị/255; `int8`: (giá trị+128)/255). Nếu confidence hiển thị
  luôn ra ~0% hoặc ~100% bất thường, mở model bằng Netron kiểm tra scale/
  zero_point thật của tensor output rồi sửa `dequantizeOutput()`.
- **Nạp model một lần, cache theo `Promise`** (`loadPromise` module-level) —
  nạp thất bại thì XOÁ cache lỗi (không giữ lỗi vĩnh viễn), lần `classify()`
  kế tiếp được thử nạp lại. Lỗi nạp/suy luận không làm crash app — bắt ở
  `capture.tsx`, rơi về `ManualFruitPicker` (coi như tin cậy thấp) kèm banner
  báo lỗi màu cam.
- **Console log 2 mốc thời gian** (phục vụ báo cáo): `Thời gian nạp model`
  (một lần, lúc load xong) và `Thời gian suy luận (1 lần)` (mỗi lần
  `classify()` chạy) — không tính thời gian resize/giải mã ảnh vào 2 số này.

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
- `expo-splash-screen` mới thêm (mốc hoàn thiện trước bảo vệ) — CẦN build lại
  APK mới thấy icon/splash mới, gộp chung với lần build cho `react-native-fast-tflite`
  ở mốc 4 (đỡ build 2 lần). Icon/splash: `assets/icon.png`, `assets/adaptive-icon.png`
  (foreground trong suốt, nền `#14532D` khai trong `app.json`), `assets/splash.png`,
  `assets/favicon.png` — 4 file do người dùng cung cấp, không phải sinh bằng code.
- `react-native-fast-tflite` + `react-native-nitro-modules` đã cài VÀ đã tích hợp
  xong (`src/lib/classifier.ts`, xem chi tiết ở "Model AI"). Thêm 3 gói nữa lúc tích
  hợp: `expo-image-manipulator` (native, resize ảnh — cần build lại APK, gộp chung),
  `expo-asset` (native nhưng đã transitive sẵn từ `expo` từ mốc 0 nên KHÔNG tốn thêm
  build), `jpeg-js` (JS thuần, không native, không tốn build — xem lý do chọn thay
  `pngjs` ở "Model AI"). Lưu ý cài đặt các gói native gốc ban đầu:
  - `react-native-nitro-modules` là peer dependency BẮT BUỘC của
    `react-native-fast-tflite` (thư viện dựng trên Nitro Modules) — `npm install`
    không tự cài peer dependency, phải cài tay cả hai gói, thiếu gói này app crash
    lúc load native module chứ không phải lỗi cấu hình.
  - `app.json` có thêm plugin `"react-native-fast-tflite"` (không kèm object cấu
    hình) — plugin này CHỈ có tác dụng khi truyền `enableCoreMLDelegate` (iOS) hoặc
    `enableAndroidGpuLibraries` (Android GPU/NNAPI), cả hai đều KHÔNG dùng ở đây
    (model nhỏ, chạy CPU đủ nhanh) nên hiện tại plugin này là no-op, giữ chỗ khai
    báo sẵn cho lúc cần bật GPU delegate sau này.
  - `metro.config.js` (mới tạo) thêm `tflite` vào `resolver.assetExts` — thiếu dòng
    này thì `require('assets/model/fruit_int8.tflite')` bị Metro cố parse như code
    và lỗi ngay lúc bundle, không phải lỗi runtime.
  - `assets/model/fruit_int8.tflite` + `assets/model/labels.txt` đã có sẵn trong
    repo (người dùng tự chép), khớp đúng 10 nhãn ở "Model AI" — chưa có code nào
    `require()` file này.
  - Đã chạy `npx expo prebuild --clean` để xác nhận cấu hình hợp lệ (sinh thư mục
    `android/` cục bộ, đã có sẵn trong `.gitignore`) — thư mục này chỉ để kiểm tra,
    KHÔNG dùng để build tay, vẫn build qua EAS như quy trình cũ. CẦN build lại APK
    (gộp chung với `expo-splash-screen` ở trên) mới nạp được 2 thư viện native này.
- `firebase`, `expo-constants`, `@react-native-async-storage/async-storage` đã
  có sẵn trong package.json — không cần cài lại hay build lại APK cho phần
  Firebase (đều là JS package, không phải native module mới)
- Sửa `.env` xong phải `expo start -c` (xoá cache) mới nạp lại `app.config.js`;
  thiếu biến `EXPO_PUBLIC_FB_*` thì app throw ngay lúc khởi động
  (`src/services/firebase.ts`), không phải lỗi Firebase Console