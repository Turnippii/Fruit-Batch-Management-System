import type { FruitTypeCode } from './lots';

export interface ClassifyOption {
  label: string;
  confidence: number;
}

export interface ClassifyResult {
  label: string;
  confidence: number;
  top3: ClassifyOption[];
}

export type MockScenario = 'high_confidence' | 'low_confidence' | 'spoiled';

export interface MockPhoto {
  id: string;
  uri: string;
  emoji: string;
  color: string;
  scenario: MockScenario;
}

// Ảnh mẫu để demo luồng chụp — placeholder emoji/màu thay cho file ảnh thật vì chưa nối camera (để mốc 3).
export const mockPhotos: MockPhoto[] = [
  { id: 'xoai-chin-toi', uri: 'mock://xoai-chin-toi', emoji: '🥭', color: '#F4A742', scenario: 'high_confidence' },
  { id: 'chuoi-chin-ky', uri: 'mock://chuoi-chin-ky', emoji: '🍌', color: '#E9D14A', scenario: 'high_confidence' },
  { id: 'dau-mo-ho', uri: 'mock://dau-mo-ho', emoji: '🍓', color: '#E85C6B', scenario: 'low_confidence' },
  { id: 'chuoi-hong', uri: 'mock://chuoi-hong', emoji: '🍌', color: '#6B4A3A', scenario: 'spoiled' },
];

const CLASSIFY_RESULTS: Record<string, ClassifyResult> = {
  'mock://xoai-chin-toi': {
    label: 'Xoai_chin_toi',
    confidence: 0.92,
    top3: [
      { label: 'Xoai_chin_toi', confidence: 0.92 },
      { label: 'Xoai_xanh', confidence: 0.05 },
      { label: 'Xoai_hong', confidence: 0.03 },
    ],
  },
  'mock://chuoi-chin-ky': {
    label: 'Chuoi_chin_ky',
    confidence: 0.88,
    top3: [
      { label: 'Chuoi_chin_ky', confidence: 0.88 },
      { label: 'Chuoi_chin_toi', confidence: 0.09 },
      { label: 'Chuoi_hong', confidence: 0.03 },
    ],
  },
  'mock://dau-mo-ho': {
    label: 'Dau',
    confidence: 0.42,
    top3: [
      { label: 'Dau', confidence: 0.42 },
      { label: 'Nho', confidence: 0.35 },
      { label: 'Tao', confidence: 0.23 },
    ],
  },
  'mock://chuoi-hong': {
    label: 'Chuoi_hong',
    confidence: 0.95,
    top3: [
      { label: 'Chuoi_hong', confidence: 0.95 },
      { label: 'Chuoi_chin_ky', confidence: 0.04 },
      { label: 'Chuoi_chin_toi', confidence: 0.01 },
    ],
  },
};

const CLASSIFY_DELAY_MS = 800;

/** Chữ ký hàm giữ nguyên cho mốc 4: thay nội dung bên trong bằng TFLite thật, màn hình gọi classify(uri) không đổi. */
export function classify(uri: string): Promise<ClassifyResult> {
  const result = CLASSIFY_RESULTS[uri] ?? CLASSIFY_RESULTS['mock://xoai-chin-toi'];
  return new Promise((resolve) => {
    setTimeout(() => resolve(result), CLASSIFY_DELAY_MS);
  });
}

export function pickMockPhoto(scenario: MockScenario | 'random'): MockPhoto {
  const pool = scenario === 'random' ? mockPhotos : mockPhotos.filter((photo) => photo.scenario === scenario);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Map nhãn model (chuỗi, không dùng index) sang loại quả + độ chín hiển thị. */
export function parseLabel(label: string): { fruitType: FruitTypeCode; ripeness: string } {
  if (label.includes('_')) {
    const fruitType = label.split('_')[0] as FruitTypeCode;
    return { fruitType, ripeness: label };
  }
  return { fruitType: label as FruitTypeCode, ripeness: 'Chin_toi' };
}
