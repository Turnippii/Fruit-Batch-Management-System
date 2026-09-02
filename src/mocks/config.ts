// Mô phỏng config/shelfLifeBase và config/ripenessFactor trên Firebase (nguồn: USDA FoodKeeper).
export const shelfLifeBase: Record<string, number> = {
  Chuoi: 6,
  Xoai: 9,
  Tao: 21,
  Nho: 14,
  Dau: 4,
};

// Hệ số nhân lên T0 tuỳ độ chín — trái càng chín thì hạn sử dụng gốc càng ngắn.
export const ripenessFactor: Record<string, number> = {
  Chuoi_xanh: 1.4,
  Chuoi_chin_toi: 1,
  Chuoi_chin_ky: 0.6,
  Xoai_xanh: 1.3,
  Xoai_chin_toi: 1,
  Chin_toi: 1,
};

export const ripenessSupported = ['Chuoi', 'Xoai'];

// Mô phỏng config/assumedTemp trên Firebase — nhiệt độ giả định dùng để tính
// tiêu hao ở các chặng chưa có cảm biến thật (tại vườn, trên xe vận chuyển).
export interface AssumedTempConfig {
  at_garden_normal: number;
  at_garden_cold: number;
  in_transit: number;
  in_transit_cold: number;
}

export const assumedTemp: AssumedTempConfig = {
  at_garden_normal: 30,
  at_garden_cold: 15,
  in_transit: 32,
  in_transit_cold: 18,
};
