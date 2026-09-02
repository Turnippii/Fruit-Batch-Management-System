export type FruitTypeCode = 'Chuoi' | 'Xoai' | 'Tao' | 'Nho' | 'Dau';
export type LotStatus = 'at_garden' | 'in_transit' | 'in_stock' | 'sold' | 'discarded';
export type StorageTypeCode = 'lanh' | 'thuong';

export interface LotHistoryEntry {
  event: string;
  timestamp: string;
  actorId: string;
  note?: string;
}

export interface Lot {
  id: string;
  fruitType: FruitTypeCode;
  ripeness: string;
  harvestDate: string;
  quantity: number;
  unit: string;
  storageType: StorageTypeCode;
  gardenName: string;
  initialShelfDays: number;
  /**
   * Nguồn sự thật do ESP32/app ghi — CHỈ có ý nghĩa khi status là "in_stock" trở
   * lên (ghi một lần lúc đại lý nhận lô, sau đó ESP32 cập nhật định kỳ). Với
   * "at_garden"/"in_transit" luôn để null — app tính tại chỗ bằng
   * resolveConsumedRatio, không đọc field này. Không màn hình nào được đọc
   * lot.consumedRatio trực tiếp, luôn qua resolveConsumedRatio() trong shelfLife.ts.
   */
  consumedRatio: number | null;
  /** Thời điểm consumedRatio được ghi lần gần nhất — bắt buộc có khi consumedRatio khác null. */
  updatedAt?: string;
  status: LotStatus;
  growerId: string;
  currentHolderId: string;
  imageUrl?: string;
  createdAt: string;
  history: LotHistoryEntry[];
  note?: string;
}

export const mockLots: Lot[] = [
  {
    id: 'FC-2026-A7X92K',
    fruitType: 'Xoai',
    ripeness: 'Xoai_chin_toi',
    harvestDate: '2026-08-28',
    quantity: 120,
    unit: 'kg',
    storageType: 'lanh',
    gardenName: 'Vườn Xoài Cát Hòa Lộc',
    initialShelfDays: 9,
    consumedRatio: 0.15,
    updatedAt: '2026-09-01T08:00:00.000Z',
    status: 'in_stock',
    growerId: 'mock-grower',
    currentHolderId: 'mock-retailer',
    createdAt: '2026-08-28T02:00:00.000Z',
    history: [
      { event: 'harvested', timestamp: '2026-08-28T02:00:00.000Z', actorId: 'mock-grower', note: 'Thu hoạch tại vườn' },
      { event: 'qr_generated', timestamp: '2026-08-28T03:00:00.000Z', actorId: 'mock-grower', note: 'Tạo mã QR FC-2026-A7X92K' },
      { event: 'shipped', timestamp: '2026-08-28T06:00:00.000Z', actorId: 'mock-grower', note: 'Xuất kho vận chuyển' },
      { event: 'received', timestamp: '2026-08-29T01:00:00.000Z', actorId: 'mock-retailer', note: 'Đại lý tiếp nhận' },
      { event: 'in_stock', timestamp: '2026-08-29T01:30:00.000Z', actorId: 'mock-retailer', note: 'Nhập kho đại lý' },
    ],
  },
  {
    id: 'FC-2026-B3M18P',
    fruitType: 'Chuoi',
    ripeness: 'Chuoi_chin_toi',
    harvestDate: '2026-08-27',
    quantity: 80,
    unit: 'kg',
    storageType: 'thuong',
    gardenName: 'Vườn Chuối Laba Đà Lạt',
    initialShelfDays: 6,
    consumedRatio: 0.65,
    updatedAt: '2026-09-01T08:00:00.000Z',
    status: 'in_stock',
    growerId: 'mock-grower',
    currentHolderId: 'mock-retailer',
    createdAt: '2026-08-27T01:00:00.000Z',
    history: [
      { event: 'harvested', timestamp: '2026-08-27T01:00:00.000Z', actorId: 'mock-grower', note: 'Thu hoạch tại vườn' },
      { event: 'qr_generated', timestamp: '2026-08-27T02:00:00.000Z', actorId: 'mock-grower', note: 'Tạo mã QR FC-2026-B3M18P' },
      { event: 'shipped', timestamp: '2026-08-27T05:00:00.000Z', actorId: 'mock-grower', note: 'Xuất kho vận chuyển' },
      { event: 'received', timestamp: '2026-08-28T00:00:00.000Z', actorId: 'mock-retailer', note: 'Đại lý tiếp nhận' },
      { event: 'in_stock', timestamp: '2026-08-28T00:30:00.000Z', actorId: 'mock-retailer', note: 'Nhập kho, nhiệt độ kho tăng nhẹ' },
    ],
  },
  {
    id: 'FC-2026-C9Q54R',
    fruitType: 'Dau',
    ripeness: 'Chin_toi',
    harvestDate: '2026-08-26',
    quantity: 30,
    unit: 'kg',
    storageType: 'lanh',
    gardenName: 'Vườn Dâu Đà Lạt Xanh',
    initialShelfDays: 4,
    consumedRatio: 0.85,
    updatedAt: '2026-09-01T08:00:00.000Z',
    status: 'in_stock',
    growerId: 'mock-grower',
    currentHolderId: 'mock-retailer',
    createdAt: '2026-08-26T01:00:00.000Z',
    history: [
      { event: 'harvested', timestamp: '2026-08-26T01:00:00.000Z', actorId: 'mock-grower', note: 'Thu hoạch tại vườn' },
      { event: 'qr_generated', timestamp: '2026-08-26T02:00:00.000Z', actorId: 'mock-grower', note: 'Tạo mã QR FC-2026-C9Q54R' },
      { event: 'shipped', timestamp: '2026-08-26T04:00:00.000Z', actorId: 'mock-grower', note: 'Xuất kho vận chuyển' },
      { event: 'received', timestamp: '2026-08-26T20:00:00.000Z', actorId: 'mock-retailer', note: 'Đại lý tiếp nhận' },
      { event: 'in_stock', timestamp: '2026-08-26T20:30:00.000Z', actorId: 'mock-retailer', note: 'Nhập kho, cảnh báo sắp hết hạn' },
    ],
  },
  {
    id: 'FC-2026-D2N77T',
    fruitType: 'Tao',
    ripeness: 'Chin_toi',
    harvestDate: '2026-08-20',
    quantity: 200,
    unit: 'kg',
    storageType: 'lanh',
    gardenName: 'Vườn Táo Sa Pa',
    initialShelfDays: 21,
    consumedRatio: 0.3,
    updatedAt: '2026-09-01T08:00:00.000Z',
    status: 'in_stock',
    growerId: 'mock-grower',
    currentHolderId: 'mock-retailer',
    createdAt: '2026-08-20T01:00:00.000Z',
    history: [
      { event: 'harvested', timestamp: '2026-08-20T01:00:00.000Z', actorId: 'mock-grower', note: 'Thu hoạch tại vườn' },
      { event: 'qr_generated', timestamp: '2026-08-20T02:00:00.000Z', actorId: 'mock-grower', note: 'Tạo mã QR FC-2026-D2N77T' },
      { event: 'shipped', timestamp: '2026-08-20T05:00:00.000Z', actorId: 'mock-grower', note: 'Xuất kho vận chuyển' },
      { event: 'received', timestamp: '2026-08-21T00:00:00.000Z', actorId: 'mock-retailer', note: 'Đại lý tiếp nhận' },
      { event: 'in_stock', timestamp: '2026-08-21T00:30:00.000Z', actorId: 'mock-retailer', note: 'Nhập kho đại lý' },
    ],
  },
  {
    id: 'FC-2026-E5K33W',
    fruitType: 'Nho',
    ripeness: 'Chin_toi',
    harvestDate: '2026-08-25',
    quantity: 60,
    unit: 'kg',
    storageType: 'lanh',
    gardenName: 'Vườn Nho Ninh Thuận',
    initialShelfDays: 14,
    consumedRatio: 0.95,
    updatedAt: '2026-09-01T08:00:00.000Z',
    status: 'in_stock',
    growerId: 'mock-grower',
    currentHolderId: 'mock-retailer',
    createdAt: '2026-08-25T01:00:00.000Z',
    history: [
      { event: 'harvested', timestamp: '2026-08-25T01:00:00.000Z', actorId: 'mock-grower', note: 'Thu hoạch tại vườn' },
      { event: 'qr_generated', timestamp: '2026-08-25T02:00:00.000Z', actorId: 'mock-grower', note: 'Tạo mã QR FC-2026-E5K33W' },
      { event: 'shipped', timestamp: '2026-08-25T05:00:00.000Z', actorId: 'mock-grower', note: 'Xuất kho vận chuyển' },
      { event: 'received', timestamp: '2026-08-25T22:00:00.000Z', actorId: 'mock-retailer', note: 'Đại lý tiếp nhận' },
      { event: 'in_stock', timestamp: '2026-08-25T22:30:00.000Z', actorId: 'mock-retailer', note: 'Nhập kho, gần hết hạn sử dụng' },
    ],
  },
  {
    id: 'FC-2026-F1H60Y',
    fruitType: 'Xoai',
    ripeness: 'Xoai_xanh',
    harvestDate: '2026-08-31',
    quantity: 150,
    unit: 'kg',
    storageType: 'thuong',
    gardenName: 'Vườn Xoài Cát Hòa Lộc',
    initialShelfDays: 9,
    consumedRatio: null,
    status: 'in_transit',
    growerId: 'mock-grower',
    currentHolderId: 'mock-grower',
    createdAt: '2026-08-31T02:00:00.000Z',
    history: [
      { event: 'harvested', timestamp: '2026-08-31T02:00:00.000Z', actorId: 'mock-grower', note: 'Thu hoạch tại vườn' },
      { event: 'qr_generated', timestamp: '2026-08-31T03:00:00.000Z', actorId: 'mock-grower', note: 'Tạo mã QR FC-2026-F1H60Y' },
      { event: 'shipped', timestamp: '2026-08-31T06:00:00.000Z', actorId: 'mock-grower', note: 'Xuất kho vận chuyển' },
    ],
  },
  {
    id: 'FC-2026-G8J41L',
    fruitType: 'Chuoi',
    ripeness: 'Chuoi_xanh',
    harvestDate: '2026-09-01',
    quantity: 90,
    unit: 'kg',
    storageType: 'thuong',
    gardenName: 'Vườn Chuối Laba Đà Lạt',
    initialShelfDays: 6,
    consumedRatio: null,
    status: 'at_garden',
    growerId: 'mock-grower',
    currentHolderId: 'mock-grower',
    createdAt: '2026-09-01T01:00:00.000Z',
    history: [
      { event: 'harvested', timestamp: '2026-09-01T01:00:00.000Z', actorId: 'mock-grower', note: 'Thu hoạch tại vườn' },
      { event: 'qr_generated', timestamp: '2026-09-01T01:30:00.000Z', actorId: 'mock-grower', note: 'Tạo mã QR FC-2026-G8J41L' },
    ],
  },
];

export const mockStation = {
  stationId: 'station-001',
  name: 'Kho đại lý Bình Thạnh',
  // Kho thường ở Việt Nam ~28-30°C — ở 6.5°C thì k = 2^((6.5-25)/10) ≈ 0.28,
  // lô gần như không hao mòn nên không demo được hiệu ứng nhiệt độ.
  temp: 29.0,
  humid: 75,
  updatedAt: '2026-09-01T08:00:00.000Z',
  retailerId: 'mock-retailer',
};

export const mockAlerts = [
  {
    id: 'alert-001',
    lotId: 'FC-2026-A7X92K',
    level: 'green' as const,
    type: 'new_stock',
    createdAt: '2026-08-29T01:30:00.000Z',
    isRead: true,
    message: 'Lô xoài mới nhập kho, tình trạng ổn định.',
    retailerId: 'mock-retailer',
    growerId: 'mock-grower',
  },
  {
    id: 'alert-002',
    lotId: 'FC-2026-B3M18P',
    level: 'yellow' as const,
    type: 'expiring_soon',
    createdAt: '2026-09-01T06:00:00.000Z',
    isRead: false,
    message: 'Lô chuối sắp hết hạn, ưu tiên bán trước.',
    retailerId: 'mock-retailer',
    growerId: 'mock-grower',
  },
  {
    id: 'alert-003',
    lotId: 'FC-2026-E5K33W',
    level: 'red' as const,
    type: 'overdue',
    createdAt: '2026-09-01T07:00:00.000Z',
    isRead: false,
    message: 'Lô nho sắp quá hạn sử dụng, cần xử lý ngay.',
    retailerId: 'mock-retailer',
    growerId: 'mock-grower',
  },
];
