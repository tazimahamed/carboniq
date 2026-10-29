import { qrSvgPath } from "@/lib/qr";

export default function QR({ text, className = "h-40 w-40" }: { text: string; className?: string }) {
  const { path, size } = qrSvgPath(text);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} shapeRendering="crispEdges" role="img" aria-label={`QR: ${text}`}>
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#0b1f17" />
    </svg>
  );
}
