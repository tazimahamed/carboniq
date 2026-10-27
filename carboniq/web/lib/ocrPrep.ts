// OCR-এর আগে বিলের ছবি পরিষ্কার করা। বাংলাদেশি বিলের dot-matrix ছাপা, watermark আর বাঁকা ছবির জন্য
// দুই রকম ছবি বানাই — একটায় যা ভুল পড়ে, অন্যটায় প্রায়ই ঠিক আসে; parser দুটো মিলিয়ে নেয়।
// pure function (canvas ছাড়া) — Node-এ পরীক্ষা করা যায়।

/** RGBA → gray, সাথে autocontrast (উপরে-নিচে ২% কেটে প্রসারিত) */
export function toGray(rgba: Uint8ClampedArray, n: number): Uint8ClampedArray {
  const g = new Uint8ClampedArray(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const v = (rgba[i * 4] * 299 + rgba[i * 4 + 1] * 587 + rgba[i * 4 + 2] * 114) / 1000;
    g[i] = v; hist[g[i]]++;
  }
  const cut = n * 0.02; let lo = 0, hi = 255, acc = 0;
  while (lo < 255 && (acc += hist[lo]) < cut) lo++;
  acc = 0; while (hi > 0 && (acc += hist[hi]) < cut) hi--;
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < n; i++) g[i] = ((g[i] - lo) * 255) / span;
  return g;
}

/** Adaptive threshold (স্থানীয় গড় − C): ছায়া আর watermark থাকলেও লেখা আলাদা হয় */
export function adaptiveBinarize(g: Uint8ClampedArray, w: number, h: number, block = 41, C = 15): Uint8ClampedArray {
  const W = w + 1;
  const sum = new Float64Array(W * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) { row += g[y * w + x]; sum[(y + 1) * W + x + 1] = sum[y * W + x + 1] + row; }
  }
  const r = block >> 1, out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const area = (x1 - x0) * (y1 - y0);
      const mean = (sum[y1 * W + x1] - sum[y0 * W + x1] - sum[y1 * W + x0] + sum[y0 * W + x0]) / area;
      out[y * w + x] = g[y * w + x] > mean - C ? 255 : 0;
    }
  }
  return out;
}

/** 2×2 erode: কালো অক্ষর একটু মোটা — dot-matrix-এর বিন্দুগুলো জোড়া লাগে */
export function erode2(b: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    out[i] = Math.min(b[i], x + 1 < w ? b[i + 1] : 255, y + 1 < h ? b[i + w] : 255, x + 1 < w && y + 1 < h ? b[i + w + 1] : 255);
  }
  return out;
}
