"use client";
// Upload-এর আগে ছবি ছোট করা (জায়গা বাঁচায়, Vercel-এর ৪.৫ MB সীমার ভেতরে রাখে) আর SHA-256 hash বের করা

export async function compressImage(file: File, maxSide = 1800, quality = 0.85): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("ছবি রূপান্তর ব্যর্থ"))), "image/jpeg", quality));
}

export async function sha256Hex(blob: Blob) {
  const buf = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
