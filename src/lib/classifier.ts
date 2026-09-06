import { loadTensorflowModel, type Tensor, type TensorflowModel } from 'react-native-fast-tflite';

type TensorDataType = Tensor['dataType'];
import { Asset } from 'expo-asset';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { decode as decodeJpeg } from 'jpeg-js';
import type { ClassifyResult } from '../mocks/classifier';
import { base64ToUint8Array } from './base64';

const MODEL_INPUT_SIZE = 224;

// require() ở đây là bắt buộc — Metro cần thấy literal path lúc build để đóng gói file
// vào bundle (đã khai .tflite/.txt vào resolver.assetExts trong metro.config.js).
const MODEL_ASSET_MODULE = require('../../assets/model/fruit_int8.tflite');
const LABELS_ASSET_MODULE = require('../../assets/model/labels.txt');

interface LoadedModel {
  model: TensorflowModel;
  labels: string[];
}

let loadPromise: Promise<LoadedModel> | null = null;

/** Đọc labels.txt THẬT lúc runtime (không hardcode danh sách nhãn) — mỗi dòng một
 * nhãn, đúng thứ tự khớp với output của model. */
async function loadLabels(): Promise<string[]> {
  const asset = Asset.fromModule(LABELS_ASSET_MODULE);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const text = await (await fetch(uri)).text();
  const labels = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (labels.length === 0) {
    throw new Error('assets/model/labels.txt rỗng hoặc không đọc được.');
  }
  return labels;
}

/**
 * Nạp model + labels MỘT LẦN, giữ trong bộ nhớ cho các lần classify() sau — không nạp
 * lại mỗi lần chụp ảnh. Nếu nạp thất bại, KHÔNG cache lỗi vĩnh viễn: xoá promise để lần
 * classify() kế tiếp có cơ hội thử nạp lại (phòng trường hợp lỗi thoáng qua).
 */
function loadModelAndLabels(): Promise<LoadedModel> {
  if (!loadPromise) {
    const startedAt = Date.now();
    loadPromise = Promise.all([loadTensorflowModel(MODEL_ASSET_MODULE, []), loadLabels()])
      .then(([model, labels]) => {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log(`[classifier] Thời gian nạp model: ${Date.now() - startedAt} ms`);
        }
        return { model, labels };
      })
      .catch((err) => {
        loadPromise = null;
        throw new Error(
          `Không nạp được model nhận diện AI: ${err instanceof Error ? err.message : String(err)}`
        );
      });
  }
  return loadPromise;
}

/**
 * Quy đổi buffer output thô về xác suất [0, 1] theo dataType thật của tensor —
 * model int8-quantized thường xuất output cũng ở dạng lượng tử hoá (uint8/int8), KHÔNG
 * phải xác suất float trực tiếp. Thư viện không lộ scale/zero_point qua Tensor, nên
 * dùng đúng quy ước lượng tử hoá CHUẨN cho lớp softmax (scale = 1/255):
 * - uint8: zero_point = 0      -> value / 255
 * - int8:  zero_point = -128   -> (value + 128) / 255
 */
function dequantizeOutput(buffer: ArrayBuffer, dataType: TensorDataType): Float32Array {
  if (dataType === 'float32') return new Float32Array(buffer);
  if (dataType === 'uint8') {
    const raw = new Uint8Array(buffer);
    const out = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) out[i] = raw[i] / 255;
    return out;
  }
  if (dataType === 'int8') {
    const raw = new Int8Array(buffer);
    const out = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) out[i] = (raw[i] + 128) / 255;
    return out;
  }
  throw new Error(`Kiểu dữ liệu output không hỗ trợ: ${dataType}`);
}

/** Resize ảnh về 224x224 (expo-image-manipulator, native) rồi giải mã JPEG kết quả ra
 * pixel thô (jpeg-js, JS thuần) — expo-image-manipulator chỉ trả về file/base64 đã nén,
 * không có API đọc pixel trực tiếp. Trả về đúng thứ tự R-G-B (bỏ kênh Alpha), KHÔNG đảo
 * thành BGR. */
async function preprocessImageToRgb(uri: string): Promise<Uint8Array> {
  const context = ImageManipulator.manipulate(uri);
  const rendered = await context.resize({ width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE }).renderAsync();
  const saved = await rendered.saveAsync({ base64: true, format: SaveFormat.JPEG, compress: 1 });
  if (!saved.base64) {
    throw new Error('Không lấy được dữ liệu ảnh (base64) sau khi resize.');
  }

  const jpegBytes = base64ToUint8Array(saved.base64);
  // useTArray: true -> Uint8Array thuần, TRÁNH Buffer.alloc của Node (không có trong Hermes).
  const decoded = decodeJpeg(jpegBytes, { useTArray: true, formatAsRGBA: true });

  if (decoded.width !== MODEL_INPUT_SIZE || decoded.height !== MODEL_INPUT_SIZE) {
    throw new Error(
      `Kích thước ảnh sau resize không đúng ${MODEL_INPUT_SIZE}x${MODEL_INPUT_SIZE} (nhận được ${decoded.width}x${decoded.height}).`
    );
  }

  const rgb = new Uint8Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE * 3);
  const rgba = decoded.data;
  for (let src = 0, dst = 0; dst < rgb.length; src += 4, dst += 3) {
    rgb[dst] = rgba[src]; // R
    rgb[dst + 1] = rgba[src + 1]; // G
    rgb[dst + 2] = rgba[src + 2]; // B
    // rgba[src + 3] là kênh Alpha — bỏ, model chỉ nhận 3 kênh RGB.
  }
  return rgb;
}

/**
 * Bản THẬT của classify() — giữ NGUYÊN chữ ký của src/mocks/classifier.ts để màn hình
 * không phải sửa. Chuyển đổi theo cờ USE_MOCK ở nơi gọi (xem app/(grower)/capture.tsx),
 * không tự kiểm tra USE_MOCK trong file này.
 */
export async function classify(uri: string): Promise<ClassifyResult> {
  const { model, labels } = await loadModelAndLabels();
  const rgb = await preprocessImageToRgb(uri);

  const startedAt = Date.now();
  const outputs = await model.run([rgb.buffer as ArrayBuffer]);
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[classifier] Thời gian suy luận (1 lần): ${Date.now() - startedAt} ms`);
  }

  const scores = dequantizeOutput(outputs[0], model.outputs[0].dataType);
  if (scores.length !== labels.length) {
    throw new Error(
      `Số lớp output model (${scores.length}) không khớp số dòng trong labels.txt (${labels.length}).`
    );
  }

  // Map nhãn BẰNG CHUỖI theo đúng thứ tự dòng của labels.txt — không dùng index cứng ở
  // bất kỳ đâu khác ngoài việc tra labels[index] tại chỗ này.
  const scored = Array.from(scores).map((confidence, index) => ({
    label: labels[index],
    confidence,
  }));
  scored.sort((a, b) => b.confidence - a.confidence);
  const top3 = scored.slice(0, 3);
  const best = top3[0];

  return { label: best.label, confidence: best.confidence, top3 };
}
