"use client";
// যেকোনো বিলের ফাইল → একটা পরিষ্কার JPG ছবি (OCR আর প্রমাণ রাখার জন্য)
// সমর্থিত: JPG, PNG, WebP, GIF, BMP, HEIC/HEIF (iPhone), PDF (প্রথম পাতা)

export const ACCEPT = "image/*,.heic,.heif,application/pdf,.pdf";

const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isHeic = (f: File) => /image\/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);

async function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("ছবি রূপান্তর ব্যর্থ"))), "image/jpeg", quality));
}

async function pdfFirstPage(file: File): Promise<HTMLCanvasElement> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: Math.min(3, 1800 / Math.max(base.width, base.height)) }); // OCR-এর জন্য যথেষ্ট বড়
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

async function heicToBlob(file: File): Promise<Blob> {
  const heic2any = (await import("heic2any")).default;
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  return Array.isArray(out) ? out[0] : out;
}

async function imageToCanvas(blob: Blob, maxSide: number): Promise<HTMLCanvasElement> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(blob);
  } catch {
    throw new Error("এই ফাইলটা ছবি হিসেবে খোলা যায়নি — JPG, PNG, HEIC বা PDF দিন");
  }
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "white"; ctx.fillRect(0, 0, canvas.width, canvas.height); // স্বচ্ছ PNG-এর পেছনে সাদা
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** ফাইলের ধরন যা-ই হোক, ফেরত দেয় ছোট করা JPG আর মূল ধরনের নাম */
export async function toBillImage(file: File, maxSide = 1800): Promise<{ blob: Blob; kind: string }> {
  if (file.size > 25 * 1024 * 1024) throw new Error("ফাইল ২৫ MB-এর বেশি");
  if (isPdf(file)) return { blob: await canvasToJpeg(await pdfFirstPage(file)), kind: "PDF" };
  if (isHeic(file)) {
    const jpg = await heicToBlob(file);
    return { blob: await canvasToJpeg(await imageToCanvas(jpg, maxSide)), kind: "HEIC" };
  }
  if (!file.type.startsWith("image/") && file.type !== "") throw new Error("সমর্থিত নয়: JPG, PNG, WebP, HEIC বা PDF দিন");
  const kind = (file.type.split("/")[1] || file.name.split(".").pop() || "ছবি").toUpperCase();
  return { blob: await canvasToJpeg(await imageToCanvas(file, maxSide)), kind };
}

export async function sha256Hex(blob: Blob) {
  const buf = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
