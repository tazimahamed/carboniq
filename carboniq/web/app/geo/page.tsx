"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { useRecords } from "@/lib/useRecords";
import { parsePower, polygonAreaM2, pvEstimate, SOLAR_ASSUME } from "@/lib/solar";
import PLANTS from "@/lib/bd_power_plants.json";

// Leaflet CDN থেকে (হালকা, ফোনে চলে) — একবারই লোড
const LEAFLET = "https://unpkg.com/leaflet@1.9.4/dist/leaflet";
let leafletP: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject();
  if ((window as any).L) return Promise.resolve((window as any).L);
  leafletP ??= new Promise((res, rej) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = `${LEAFLET}.css`; document.head.appendChild(css);
    const s = document.createElement("script"); s.src = `${LEAFLET}.js`; s.onload = () => res((window as any).L); s.onerror = rej; document.head.appendChild(s);
  });
  return leafletP;
}

const FACTORY = { lat: 24.0005, lng: 90.4205, name: "Demo Knit Factory (গাজীপুর, demo অবস্থান)" };
const FUEL_C: Record<string, string> = { Gas: "#fb923c", Oil: "#f87171", Coal: "#a8a29e", Hydro: "#38bdf8", Solar: "#facc15" };
const FUEL_BN: Record<string, string> = { Gas: "গ্যাস", Oil: "তেল", Coal: "কয়লা", Hydro: "জলবিদ্যুৎ", Solar: "সৌর" };
type Plant = { n: string; mw: number; f: string; lat: number; lon: number; y: string };

export default function GeoPage() {
  const [tab, setTab] = useState<"solar" | "grid">("solar");
  return (
    <Shell eyebrow="Geo Intelligence · satellite ও মানচিত্র" title="Geo: ছাদের Solar আর Grid-এর উৎস" sub="Satellite মানচিত্রে ছাদ এঁকে সেই অবস্থানের আসল সূর্যালোক দিয়ে solar হিসাব; আর আপনার বিদ্যুৎ কোন কেন্দ্র থেকে আসে" wide>
      <div className="mb-4 inline-flex rounded-full border border-[var(--line)] bg-white p-1">
        {([["solar", "☀ Rooftop Solar Scanner"], ["grid", "⚡ Grid-এর উৎস"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === k ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>{l}</button>
        ))}
      </div>
      {tab === "solar" ? <SolarScanner /> : <GridMap />}
    </Shell>
  );
}

function SolarScanner() {
  const { rows } = useRecords();
  const el = useRef<HTMLDivElement>(null), map = useRef<any>(null), layer = useRef<any>(null);
  const [pts, setPts] = useState<{ lat: number; lng: number }[]>([]);
  const [ghi, setGhi] = useState<{ ann: number; monthly: number[]; src: "nasa" | "fallback" } | null>(null);
  const [mapErr, setMapErr] = useState(false);
  const [saved, setSaved] = useState(false);
  const center = pts.length ? { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length } : FACTORY;

  useEffect(() => {
    let alive = true;
    loadLeaflet().then((L) => {
      if (!alive || !el.current || map.current) return;
      const m = L.map(el.current, { zoomControl: true }).setView([FACTORY.lat, FACTORY.lng], 18);
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" }).addTo(m);
      m.on("click", (e: any) => setPts((p) => [...p, { lat: e.latlng.lat, lng: e.latlng.lng }]));
      layer.current = L.layerGroup().addTo(m); map.current = m;
    }).catch(() => setMapErr(true));
    return () => { alive = false; };
  }, []);

  useEffect(() => { // আঁকা ছাদ দেখানো
    const L = (window as any).L; if (!L || !layer.current) return;
    layer.current.clearLayers();
    if (pts.length >= 3) L.polygon(pts, { color: "#c6f36b", weight: 2, fillColor: "#c6f36b", fillOpacity: 0.35 }).addTo(layer.current);
    pts.forEach((p) => L.circleMarker(p, { radius: 4, color: "#fff", fillColor: "#c6f36b", fillOpacity: 1, weight: 2 }).addTo(layer.current));
  }, [pts]);

  useEffect(() => { // NASA POWER: সেই অবস্থানের দীর্ঘমেয়াদি গড় সূর্যালোক
    const ctl = new AbortController();
    const u = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${center.lng.toFixed(3)}&latitude=${center.lat.toFixed(3)}&format=JSON`;
    fetch(u, { signal: ctl.signal }).then((r) => r.json()).then((j) => { const p = parsePower(j); setGhi(p ? { ...p, src: "nasa" } : { ann: SOLAR_ASSUME.fallbackGhi, monthly: [], src: "fallback" }); })
      .catch((e) => { if (e?.name !== "AbortError") setGhi({ ann: SOLAR_ASSUME.fallbackGhi, monthly: [], src: "fallback" }); });
    return () => ctl.abort();
  }, [center.lat.toFixed(3), center.lng.toFixed(3)]); // eslint-disable-line react-hooks/exhaustive-deps

  const annualKwh = useMemo(() => {
    const months = Array.from(new Set(rows.map((r) => r.period_month.slice(0, 7)))).sort().slice(-12);
    return rows.filter((r) => r.activity === "electricity" && months.includes(r.period_month.slice(0, 7))).reduce((s, r) => s + r.quantity, 0);
  }, [rows]);
  const area = polygonAreaM2(pts);
  const est = ghi && area > 0 ? pvEstimate(area, ghi.ann, annualKwh) : null;

  function demoRoof() { // demo: কারখানার ছাদের মতো একটা আয়তক্ষেত্র (~৬,০০০ m²)
    const dLat = 60 / 110_574, dLng = 100 / (111_320 * Math.cos((FACTORY.lat * Math.PI) / 180));
    setPts([{ lat: FACTORY.lat - dLat / 2, lng: FACTORY.lng - dLng / 2 }, { lat: FACTORY.lat - dLat / 2, lng: FACTORY.lng + dLng / 2 }, { lat: FACTORY.lat + dLat / 2, lng: FACTORY.lng + dLng / 2 }, { lat: FACTORY.lat + dLat / 2, lng: FACTORY.lng - dLng / 2 }]);
  }
  function sendToPlanner() {
    if (!est) return;
    try { localStorage.setItem("carboniq_solar", JSON.stringify({ kwp: Math.round(est.kwp), kwhYr: Math.round(est.kwhYr), capex: Math.round(est.capex), src: ghi?.src, at: new Date().toISOString() })); setSaved(true); } catch { /* storage বন্ধ থাকলে চুপচাপ */ }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="relative overflow-hidden rounded-[22px] border border-[var(--line)] bg-[#0b1f17]">
        <div ref={el} className="h-[480px] w-full" />
        {mapErr && <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/70">মানচিত্র লোড হয়নি (internet দরকার)। নিচের "Demo ছাদ" দিয়ে হিসাব দেখতে পারেন।</p>}
        <div className="pointer-events-none absolute left-3 top-3 rounded-xl bg-[rgba(7,19,14,.85)] px-3 py-2 text-xs text-white backdrop-blur">
          <p className="font-bold">ছাদের কোণগুলোতে click করুন</p><p className="text-white/60">কমপক্ষে ৩টা বিন্দু · {pts.length}টা দেওয়া হয়েছে</p>
        </div>
        <div className="absolute bottom-3 left-3 flex gap-2">
          <button onClick={demoRoof} className="rounded-full bg-[var(--lime)] px-3.5 py-1.5 text-xs font-bold text-[var(--ink)] shadow">Demo ছাদ</button>
          <button onClick={() => setPts((p) => p.slice(0, -1))} className="rounded-full bg-white/90 px-3 py-1.5 text-xs shadow">↶ শেষ বিন্দু মুছুন</button>
          <button onClick={() => setPts([])} className="rounded-full bg-white/90 px-3 py-1.5 text-xs shadow">সব মুছুন</button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grain relative overflow-hidden rounded-[18px] bg-[var(--ink)] p-6 text-white">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-yellow-300/20 blur-3xl" />
          <p className="relative text-sm text-white/60">আঁকা ছাদ</p>
          <p className="relative text-3xl font-extrabold tabular-nums">{area ? Math.round(area).toLocaleString() : "—"} <span className="text-base font-semibold text-white/60">m²</span></p>
          {est ? (
            <div className="relative mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
              <div><p className="text-2xl font-extrabold text-[var(--lime)]">{Math.round(est.kwp).toLocaleString()} kWp</p><p className="text-xs text-white/55">বসানো যাবে</p></div>
              <div><p className="text-2xl font-extrabold">{Math.round(est.kwhYr / 1000).toLocaleString()} MWh</p><p className="text-xs text-white/55">বছরে উৎপাদন</p></div>
              <div><p className="text-2xl font-extrabold">{est.tYr.toFixed(0)} t</p><p className="text-xs text-white/55">বছরে CO₂e কম{est.capped ? " (দিনের লোডে সীমিত)" : ""}</p></div>
              <div><p className="text-2xl font-extrabold">{isFinite(est.payback) ? `${est.payback.toFixed(1)} বছর` : "—"}</p><p className="text-xs text-white/55">payback · ৳{(est.capex / 1e7).toFixed(2)} কোটি</p></div>
            </div>
          ) : <p className="relative mt-3 text-sm text-white/60">মানচিত্রে ছাদ আঁকুন বা &quot;Demo ছাদ&quot; চাপুন</p>}
          {est && <button onClick={sendToPlanner} className="btn-lime relative mt-5 w-full rounded-full py-2.5 text-sm font-bold">{saved ? "✓ Planner-এ পাঠানো হয়েছে" : "এই ছাদ Planner-এ ব্যবহার করুন →"}</button>}
        </div>

        <div className="card p-5 text-sm">
          <p className="font-bold">সূর্যালোক এই অবস্থানে</p>
          {ghi ? (
            <>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{ghi.ann.toFixed(2)} <span className="text-sm font-semibold text-[var(--muted)]">kWh/m²/দিন</span></p>
              <p className={`text-xs ${ghi.src === "nasa" ? "text-[var(--leaf)]" : "text-amber-700"}`}>{ghi.src === "nasa" ? "উৎস: NASA POWER (দীর্ঘমেয়াদি গড়, all-sky)" : "NASA POWER পাওয়া যায়নি — বাংলাদেশের মোটামুটি গড় (অফলাইন অনুমান)"}</p>
              {ghi.monthly.length === 12 && (
                <div className="mt-3 flex h-16 items-end gap-1">
                  {ghi.monthly.map((v, i) => <div key={i} className="flex-1 rounded-t bg-yellow-400/80" style={{ height: `${(v / Math.max(...ghi.monthly)) * 100}%` }} title={`${i + 1}: ${v}`} />)}
                </div>
              )}
              {est && <p className="mt-2 text-xs text-[var(--muted)]">বার্ষিক ফলন ≈ {Math.round(est.yieldKwhPerKwp).toLocaleString()} kWh/kWp · কারখানার বছরের grid বিদ্যুতের {(est.shareOfGrid * 100).toFixed(0)}%</p>}
            </>
          ) : <p className="mt-2 text-xs text-[var(--muted)]">লোড হচ্ছে…</p>}
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">অনুমান: {SOLAR_ASSUME.note}। এটা প্রাথমিক অনুমান — ছায়া, ছাদের গঠন আর ভার বহন যাচাই করতে site survey দরকার।</p>
        </div>
      </div>
    </div>
  );
}

function GridMap() {
  const el = useRef<HTMLDivElement>(null), map = useRef<any>(null);
  const [err, setErr] = useState(false);
  const plants = PLANTS as Plant[];
  const byFuel = useMemo(() => { const m: Record<string, number> = {}; for (const p of plants) m[p.f] = (m[p.f] ?? 0) + p.mw; return Object.entries(m).sort((a, b) => b[1] - a[1]); }, [plants]);
  const totalMw = byFuel.reduce((s, [, v]) => s + v, 0);

  useEffect(() => {
    let alive = true;
    loadLeaflet().then((L) => {
      if (!alive || !el.current || map.current) return;
      const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([23.7, 90.35], 7);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 12, attribution: "© OpenStreetMap, © CARTO" }).addTo(m);
      for (const p of plants) {
        const c = FUEL_C[p.f] ?? "#fff", r = 3 + Math.sqrt(p.mw) / 2.2;
        L.circleMarker([p.lat, p.lon], { radius: r * 1.8, color: c, weight: 0, fillColor: c, fillOpacity: 0.15 }).addTo(m);
        L.circleMarker([p.lat, p.lon], { radius: r, color: c, weight: 1, fillColor: c, fillOpacity: 0.75 }).bindTooltip(`<b>${p.n}</b><br>${FUEL_BN[p.f] ?? p.f} · ${p.mw} MW${p.y ? ` · ${p.y}` : ""}`).addTo(m);
        L.polyline([[p.lat, p.lon], [FACTORY.lat, FACTORY.lng]], { color: c, weight: 0.6, opacity: 0.25, dashArray: "3 6" }).addTo(m);
      }
      L.circleMarker([FACTORY.lat, FACTORY.lng], { radius: 9, color: "#c6f36b", weight: 3, fillColor: "#0b1f17", fillOpacity: 1 }).bindTooltip(FACTORY.name, { permanent: true, direction: "right" }).addTo(m);
      map.current = m;
    }).catch(() => setErr(true));
    return () => { alive = false; };
  }, [plants]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="relative overflow-hidden rounded-[22px] border border-[var(--line)] bg-[#0b0f0d]">
        <div ref={el} className="h-[520px] w-full" />
        {err && <p className="absolute inset-0 grid place-items-center text-sm text-white/70">মানচিত্র লোড হয়নি (internet দরকার)</p>}
      </div>
      <div className="space-y-4">
        <div className="card p-6">
          <h2 className="font-bold">কেন গুণক ০.৬৯৬ kg/kWh?</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">বাংলাদেশের বিদ্যুতের বেশিরভাগ আসে গ্যাস, তেল আর কয়লা পুড়িয়ে — তাই প্রতি kWh-এ নির্গমন বেশি। মানচিত্রের প্রতিটা বিন্দু একটা কেন্দ্র (আকার = ক্ষমতা)।</p>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full">{byFuel.map(([f, mw]) => <i key={f} style={{ width: `${(mw / totalMw) * 100}%`, background: FUEL_C[f] }} title={f} />)}</div>
          <ul className="mt-3 space-y-1.5 text-sm">{byFuel.map(([f, mw]) => <li key={f} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: FUEL_C[f] }} />{FUEL_BN[f] ?? f}<span className="ml-auto tabular-nums text-[var(--muted)]">{Math.round(mw).toLocaleString()} MW · {((mw / totalMw) * 100).toFixed(0)}%</span></li>)}</ul>
          <p className="mt-3 text-xs text-[var(--muted)]">{plants.length}টা কেন্দ্র · মোট {Math.round(totalMw).toLocaleString()} MW (ক্ষমতা, উৎপাদন নয়)</p>
        </div>
        <div className="card p-5 text-[11px] leading-relaxed text-[var(--muted)]">
          <p><b className="text-[var(--ink)]">উৎস:</b> WRI Global Power Plant Database v1.3.0 (CC BY 4.0) — Resource Watch-এর তথ্য। এটা ২০২১ সালের তালিকা; পরে চালু হওয়া বড় কেন্দ্র (যেমন নতুন কয়লাভিত্তিক কেন্দ্র) এতে নেই, তাই আজকের grid-এ কয়লার ভাগ এখানে দেখানোর চেয়ে বেশি।</p>
          <p className="mt-2"><b className="text-[var(--ink)]">গুণক:</b> CarbonIQ-এর হিসাবে ব্যবহৃত ০.৬৯৬ kg CO₂e/kWh আসে Ember-এর ২০২৪ সালের বাংলাদেশ উৎপাদন-তথ্য থেকে — এই মানচিত্র শুধু দৃশ্যমান ব্যাখ্যা, গুণকের উৎস নয়। বাংলাদেশে একটাই জাতীয় grid, তাই অঞ্চলভেদে আলাদা গুণক নেই।</p>
          <p className="mt-2">কারখানার অবস্থান demo; কেন্দ্র থেকে রেখাগুলো প্রতীকী, আসল সঞ্চালন লাইন নয়।</p>
        </div>
      </div>
    </div>
  );
}
