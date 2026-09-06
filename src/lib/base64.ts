const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const BASE64_LOOKUP = (() => {
  const table = new Uint8Array(256);
  for (let i = 0; i < BASE64_ALPHABET.length; i += 1) {
    table[BASE64_ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

/**
 * Giải mã base64 thuần JS — KHÔNG dùng `Buffer`/`atob` của Node, vì Hermes (máy ảo JS
 * của React Native) không đảm bảo có sẵn cả hai. Dùng cho ảnh JPEG nhỏ (224x224, sau
 * khi resize) lấy từ `expo-image-manipulator`, không phải để giải mã dữ liệu lớn.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const byteLength = Math.floor((clean.length * 3) / 4);
  const output = new Uint8Array(byteLength);
  let outIndex = 0;

  for (let i = 0; i < clean.length; i += 4) {
    const c0 = BASE64_LOOKUP[clean.charCodeAt(i)];
    const c1 = BASE64_LOOKUP[clean.charCodeAt(i + 1)];
    const hasC2 = i + 2 < clean.length;
    const hasC3 = i + 3 < clean.length;
    const c2 = hasC2 ? BASE64_LOOKUP[clean.charCodeAt(i + 2)] : 0;
    const c3 = hasC3 ? BASE64_LOOKUP[clean.charCodeAt(i + 3)] : 0;

    output[outIndex] = (c0 << 2) | (c1 >> 4);
    outIndex += 1;
    if (hasC2) {
      output[outIndex] = ((c1 & 0x0f) << 4) | (c2 >> 2);
      outIndex += 1;
    }
    if (hasC3) {
      output[outIndex] = ((c2 & 0x03) << 6) | c3;
      outIndex += 1;
    }
  }

  return output;
}
