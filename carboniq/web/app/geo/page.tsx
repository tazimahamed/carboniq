"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { useRecords } from "@/lib/useRecords";
import { MAX_ROOF_M2, parsePower, polygonAreaM2, pvEstimate, SOLAR_SRC, SOLAR_USER_DEFAULT, type SolarUser } from "@/lib/solar";
import { FACTORS } from "@/lib/factors";

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

const FACTORY = { lat: 24.0005, lng: 90.4205 };
type LL = { lat: number; lng: number };
type Mode = "pan" | "rect" | "poly";

export default function GeoPage() {
  const [tab, setTab] = useState<"solar" | "grid">("solar");
  return (
    <Shell eyebrow="Geo Intelligence · satellite" title="Geo: ছাদের Solar আর Grid" sub="Satellite ছবিতে mouse দিয়ে ছাদ এঁকে সেই অবস্থানের আসল সূর্যালোক (NASA POWER) দিয়ে solar হিসাব" wide>
      <div className="mb-4 inline-flex rounded-full border border-[var(--line)] bg-white p-1">
        {([["solar", "☀ Rooftop Solar Scanner"], ["grid", "⚡ Grid কেন নোংরা"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === k ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>{l}</button>
        ))}
      </div>
      {tab === "solar" ? <SolarScanner /> : <GridFacts />}
    </Shell>
  );
}

function SolarScanner() {
  const { rows } = useRecords();
  const el = useRef<HTMLDivElement>(null), map = useRef<any>(null), layer = useRef<any>(null), ghost = useRef<any>(null);
  const [pts, rawSetPts] = useState<LL[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  // Undo/redo: প্রতিটা বদলের আগের অবস্থা রাখা (Ctrl+Z / Ctrl+Y)
  const hist = useRef<{ past: { pts: LL[]; closed: boolean }[]; future: { pts: LL[]; closed: boolean }[] }>({ past: [], future: [] });
  const setPts = useRef((v: LL[] | ((p: LL[]) => LL[])) => {
    rawSetPts((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      if (JSON.stringify(next) !== JSON.stringify(prev)) { hist.current.past.push({ pts: prev, closed: closedRef.current }); if (hist.current.past.length > 100) hist.current.past.shift(); hist.current.future = []; }
      return next;
    });
  }).current;
  const [mode, setMode] = useState<Mode>("rect");
  const [closed, setClosed] = useState(false);
  const modeRef = useRef<Mode>("rect"); modeRef.current = mode;
  const closedRef = useRef(false); closedRef.current = closed;
  const [ghi, setGhi] = useState<{ ann: number; monthly: number[] } | null>(null);
  const [ghiErr, setGhiErr] = useState(false);
  const [isRoof, setIsRoof] = useState(false);
  const [user, setUser] = useState<SolarUser>(SOLAR_USER_DEFAULT);
  const [mapErr, setMapErr] = useState(false);
  const [saved, setSaved] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const center = pts.length ? { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length } : FACTORY;

  // মানচিত্র তৈরি + আঁকার mouse ঘটনা
  useEffect(() => {
    let alive = true;
    loadLeaflet().then((L) => {
      if (!alive || !el.current || map.current) return;
      const m = L.map(el.current, { zoomControl: false, doubleClickZoom: false }).setView([FACTORY.lat, FACTORY.lng], 18);
      L.control.zoom({ position: "topright" }).addTo(m);
      L.control.scale({ imperial: false, position: "bottomright" }).addTo(m);
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      // আয়তক্ষেত্র: চেপে ধরে টানুন
      let start: any = null;
      m.on("mousedown", (e: any) => { if (modeRef.current !== "rect") return; m.dragging.disable(); start = e.latlng; setClosed(false); setPts([]); });
      m.on("mousemove", (e: any) => {
        if (modeRef.current === "rect" && start) {
          if (ghost.current) ghost.current.remove();
          ghost.current = L.rectangle([start, e.latlng], { color: "#c6f36b", weight: 2, dashArray: "6 6", fillOpacity: 0.15 }).addTo(m);
        }
      });
      m.on("mouseup", (e: any) => {
        if (modeRef.current !== "rect" || !start) return;
        m.dragging.enable(); if (ghost.current) { ghost.current.remove(); ghost.current = null; }
        const a = start, b = e.latlng; start = null;
        if (Math.abs(a.lat - b.lat) < 1e-6 || Math.abs(a.lng - b.lng) < 1e-6) return;
        setPts([{ lat: a.lat, lng: a.lng }, { lat: a.lat, lng: b.lng }, { lat: b.lat, lng: b.lng }, { lat: b.lat, lng: a.lng }]); setClosed(true); setMode("pan");
      });
      // বহুভুজ: click করে কোণ, প্রথম বিন্দুতে বা double-click-এ শেষ
      m.on("click", (e: any) => { if (modeRef.current === "poly" && !closedRef.current) setPts((p) => [...p, { lat: e.latlng.lat, lng: e.latlng.lng }]); });
      // double-click-এর দুটো click একই জায়গায় বিন্দু যোগ করে — শেষ করার সময় পাশাপাশি একই বিন্দু বাদ
      m.on("dblclick", () => { if (modeRef.current === "poly") { setPts((p) => p.filter((x, i) => i === 0 || Math.abs(x.lat - p[i - 1].lat) + Math.abs(x.lng - p[i - 1].lng) > 1e-7)); setClosed(true); setMode("pan"); } });
      map.current = m;
    }).catch(() => setMapErr(true));
    return () => { alive = false; };
  }, []);

  useEffect(() => { // cursor
    const c = el.current; if (!c) return;
    c.style.cursor = mode === "pan" ? "" : "crosshair";
    if (map.current) mode === "rect" ? map.current.dragging.disable() : map.current.dragging.enable();
  }, [mode]);

  useEffect(() => { // আঁকা ছাদ + টেনে বদলানো যায় এমন কোণ
    const L = (window as any).L; if (!L || !layer.current) return;
    layer.current.clearLayers();
    if (pts.length >= 2) (closed || pts.length >= 3 ? L.polygon : L.polyline)(pts, { color: "#c6f36b", weight: 2.5, fillColor: "#c6f36b", fillOpacity: 0.3 }).addTo(layer.current);
    pts.forEach((p, i) => {
      const icon = L.divIcon({ className: "", html: `<div style="width:14px;height:14px;border-radius:50%;background:${sel === i ? "#f87171" : i === 0 && !closed ? "#fff" : "#c6f36b"};border:2px solid #0b1f17;box-shadow:0 0 0 2px #c6f36b;cursor:move"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] });
      const mk = L.marker(p, { icon, draggable: true, autoPan: true }).addTo(layer.current);
      mk.on("dragend", (e: any) => { const ll = e.target.getLatLng(); setPts((q) => q.map((x, j) => (j === i ? { lat: ll.lat, lng: ll.lng } : x))); });
      mk.on("click", () => { if (i === 0 && modeRef.current === "poly" && !closedRef.current && pts.length >= 3) { setClosed(true); setMode("pan"); } else setSel(i); });
    });
  }, [pts, closed, sel]);

  useEffect(() => { // NASA POWER: সেই অবস্থানের দীর্ঘমেয়াদি গড় সূর্যালোক
    const ctl = new AbortController();
    const u = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${center.lng.toFixed(2)}&latitude=${center.lat.toFixed(2)}&format=JSON`;
    setGhiErr(false);
    // বানানো গড় নয়: NASA না পেলে হিসাব দেখানো হয় না
    fetch(u, { signal: ctl.signal }).then((r) => r.json()).then((j) => { const p = parsePower(j); if (p) setGhi(p); else { setGhi(null); setGhiErr(true); } })
      .catch((e) => { if (e?.name !== "AbortError") { setGhi(null); setGhiErr(true); } });
    return () => ctl.abort();
  }, [center.lat.toFixed(2), center.lng.toFixed(2)]); // eslint-disable-line react-hooks/exhaustive-deps

  const annualKwh = useMemo(() => {
    const months = Array.from(new Set(rows.map((r) => r.period_month.slice(0, 7)))).sort().slice(-12);
    return rows.filter((r) => r.activity === "electricity" && months.includes(r.period_month.slice(0, 7))).reduce((s, r) => s + r.quantity, 0);
  }, [rows]);
  const area = pts.length >= 3 ? polygonAreaM2(pts) : 0;
  const tooBig = area > MAX_ROOF_M2;
  const est = ghi && area > 0 && !tooBig && isRoof ? pvEstimate(area, ghi.ann, annualKwh, user) : null;

  function undo() { const h = hist.current, snap = h.past.pop(); if (!snap) return; h.future.push({ pts, closed }); rawSetPts(snap.pts); setClosed(snap.closed); setSel(null); }
  function redo() { const h = hist.current, snap = h.future.pop(); if (!snap) return; h.past.push({ pts, closed }); rawSetPts(snap.pts); setClosed(snap.closed); setSel(null); }
  function removePoint() {
    if (sel !== null && pts.length > (closed ? 3 : 0)) { setPts(pts.filter((_, i) => i !== sel)); setSel(null); }
    else if (mode === "poly" && !closed) setPts(pts.slice(0, -1));
  }
  // কীবোর্ড: Delete/Backspace বিন্দু মোছা, Ctrl+Z/Ctrl+Y, Enter শেষ, Esc বাতিল, R/P/H ধরন
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
      if (mod && k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (mod && (k === "y" || (k === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      else if (k === "delete" || k === "backspace") { if (pts.length) { e.preventDefault(); removePoint(); } }
      else if (k === "enter") { if (mode === "poly" && !closed && pts.length >= 3) { setClosed(true); setMode("pan"); } }
      else if (k === "escape") { setSel(null); if (mode !== "pan") { if (!closed) setPts([]); setMode("pan"); } }
      else if (!mod && k === "r") start("rect");
      else if (!mod && k === "p") start("poly");
      else if (!mod && k === "h") setMode("pan");
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  });

  function start(m: Mode) { setPts([]); setClosed(false); setSaved(false); setIsRoof(false); setSel(null); setMode(m); }
  function demoRoof() {
    const dLat = 60 / 110_574, dLng = 100 / (111_320 * Math.cos((FACTORY.lat * Math.PI) / 180));
    setPts([{ lat: FACTORY.lat - dLat / 2, lng: FACTORY.lng - dLng / 2 }, { lat: FACTORY.lat - dLat / 2, lng: FACTORY.lng + dLng / 2 }, { lat: FACTORY.lat + dLat / 2, lng: FACTORY.lng + dLng / 2 }, { lat: FACTORY.lat + dLat / 2, lng: FACTORY.lng - dLng / 2 }]);
    setClosed(true); setMode("pan"); setSaved(false);
    map.current?.setView([FACTORY.lat, FACTORY.lng], 18);
  }
  function locate() {
    setGeoErr("");
    navigator.geolocation?.getCurrentPosition((p) => map.current?.setView([p.coords.latitude, p.coords.longitude], 18), () => setGeoErr("অবস্থান পাওয়া যায়নি — browser-এ অনুমতি দিন"));
  }
  function sendToPlanner() {
    if (!est) return;
    try { localStorage.setItem("carboniq_solar", JSON.stringify({ kwp: Math.round(est.kwp), kwhYr: Math.round(est.kwhYr), capex: est.capex ? Math.round(est.capex) : null, src: "nasa", at: new Date().toISOString() })); setSaved(true); } catch { /* storage বন্ধ */ }
  }

  const hint = mode === "rect" ? "ছাদের এক কোণে mouse চেপে ধরে উল্টো কোণে টেনে ছাড়ুন" : mode === "poly" ? (closed ? "" : pts.length < 3 ? `কোণগুলোতে click করুন (${pts.length}টা)` : "আরো কোণ দিন, বা প্রথম বিন্দুতে / double-click করে শেষ করুন") : pts.length ? "কোণগুলো টেনে ঠিক করুন · মানচিত্র টেনে সরান" : "নিচ থেকে আঁকার ধরন বাছুন";

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="relative self-start overflow-hidden rounded-[22px] border border-[var(--line)] bg-[#0b1f17] lg:sticky lg:top-20">
        <div ref={el} className="h-[560px] w-full" tabIndex={0} aria-label="Satellite মানচিত্র — তীর চিহ্ন দিয়ে সরান, +/− দিয়ে zoom" />
        {mapErr && <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white/70">মানচিত্র লোড হয়নি (internet দরকার) — নিচের Demo ছাদ দিয়ে হিসাব দেখুন</p>}
        <div className="pointer-events-none absolute left-3 top-3 max-w-[70%] rounded-xl bg-[rgba(7,19,14,.88)] px-3 py-2 text-xs text-white backdrop-blur">
          <p className="font-bold">{mode === "rect" ? "▭ আয়তক্ষেত্র আঁকা" : mode === "poly" ? "⬠ বহুভুজ আঁকা" : "✋ সরানো / ঠিক করা"}</p>
          {hint && <p className="text-white/70">{hint}</p>}
          <p className="mt-1 text-[10px] text-white/45">কীবোর্ড: R আয়তক্ষেত্র · P বহুভুজ · H সরান · Enter শেষ · Del মোছা · Ctrl+Z/Y · Esc · তীর/+− মানচিত্র</p>
        </div>
        <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-2">
          {([["rect", "▭ আয়তক্ষেত্র"], ["poly", "⬠ বহুভুজ"], ["pan", "✋ সরান"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => (k === "pan" ? setMode("pan") : start(k))} className={`rounded-full px-3.5 py-1.5 text-xs font-bold shadow transition ${mode === k ? "bg-[var(--lime)] text-[var(--ink)]" : "bg-white/90 text-[var(--ink)] hover:bg-white"}`}>{l}</button>
          ))}
          <span className="mx-1 w-px bg-white/30" />
          <button onClick={undo} title="Ctrl+Z" className="rounded-full bg-white/90 px-3 py-1.5 text-xs shadow">↶ Undo</button>
          <button onClick={redo} title="Ctrl+Y" className="rounded-full bg-white/90 px-3 py-1.5 text-xs shadow">↷ Redo</button>
          {(sel !== null || (mode === "poly" && !closed && pts.length > 0)) && <button onClick={removePoint} title="Delete" className="rounded-full bg-white/90 px-3 py-1.5 text-xs shadow">⌫ {sel !== null ? "বাছাই বিন্দু" : "শেষ বিন্দু"}</button>}
          {mode === "poly" && !closed && pts.length >= 3 && <button onClick={() => { setClosed(true); setMode("pan"); }} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow">✓ শেষ করুন</button>}
          <button onClick={() => start(mode === "pan" ? "rect" : mode)} className="rounded-full bg-white/90 px-3 py-1.5 text-xs shadow">মুছুন</button>
          <button onClick={demoRoof} className="rounded-full bg-white/90 px-3 py-1.5 text-xs shadow">Demo ছাদ</button>
          <button onClick={locate} className="rounded-full bg-white/90 px-3 py-1.5 text-xs shadow">📍 আমার অবস্থান</button>
        </div>
        {geoErr && <p className="absolute right-3 top-14 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">{geoErr}</p>}
      </div>

      <div className="space-y-4">
        <div className="grain relative overflow-hidden rounded-[18px] bg-[var(--ink)] p-6 text-white">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-yellow-300/20 blur-3xl" />
          <p className="relative text-sm text-white/60">আঁকা ছাদ</p>
          <p className="relative text-3xl font-extrabold tabular-nums">{area ? Math.round(area).toLocaleString() : "—"} <span className="text-base font-semibold text-white/60">m²</span></p>
          {tooBig && <p className="relative mt-3 rounded-lg bg-amber-300/15 px-3 py-2 text-xs text-amber-200">এটা {MAX_ROOF_M2.toLocaleString()} m²-এর বেশি — একটা কারখানার ছাদের জন্য অস্বাভাবিক বড়। Zoom করে শুধু ছাদটা আঁকুন।</p>}
          {area > 0 && !tooBig && (
            <label className="relative mt-4 flex cursor-pointer items-start gap-2 rounded-lg bg-white/10 p-3 text-xs">
              <input type="checkbox" checked={isRoof} onChange={(e) => setIsRoof(e.target.checked)} className="mt-0.5 accent-[var(--lime)]" />
              <span>আমি নিশ্চিত করছি যে আঁকা এলাকাটা <b>আমার কারখানার ছাদ</b>। <span className="text-white/60">(System ছবি দেখে ছাদ, মাঠ না পানি তা চিনতে পারে না — আপনি যা আঁকবেন তার জ্যামিতি থেকে হিসাব হয়)</span></span>
            </label>
          )}
          {est ? (
            <>
              <div className="relative mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div><p className="text-2xl font-extrabold text-[var(--lime)]">{Math.round(est.kwp).toLocaleString()} kWp</p><p className="text-xs text-white/55">প্রস্তাবিত আকার{est.limitedByLoad ? ` (ছাদে ধরে ${Math.round(est.fitKwp).toLocaleString()})` : ""}</p></div>
                <div><p className="text-2xl font-extrabold">{Math.round(est.kwhYr / 1000).toLocaleString()} MWh</p><p className="text-xs text-white/55">বছরে উৎপাদন</p></div>
                <div><p className="text-2xl font-extrabold">{est.tYr.toFixed(0)} t</p><p className="text-xs text-white/55">বছরে CO₂e কম</p></div>
                <div><p className="text-2xl font-extrabold">${Math.round(est.savingUsd).toLocaleString()}</p><p className="text-xs text-white/55">বছরে নিট সাশ্রয় (IEEFA হারে)</p></div>
              </div>
              <div className="relative mt-4 space-y-3 rounded-xl bg-white/[0.06] p-3 text-xs">
                <p className="font-semibold text-white/80">আপনার কারখানার মান (বদলান)</p>
                <label className="block"><span className="flex justify-between text-white/70"><span>ছাদের কত অংশে প্যানেল বসবে</span><b className="text-white">{user.usablePct}%</b></span><input type="range" min={30} max={90} step={5} value={user.usablePct} onChange={(e) => setUser({ ...user, usablePct: Number(e.target.value) })} className="w-full accent-[var(--lime)]" /></label>
                <label className="block"><span className="flex justify-between text-white/70"><span>বিদ্যুতের কত অংশ দিনের বেলা লাগে</span><b className="text-white">{user.daytimePct}%</b></span><input type="range" min={30} max={90} step={5} value={user.daytimePct} onChange={(e) => setUser({ ...user, daytimePct: Number(e.target.value) })} className="w-full accent-[var(--lime)]" /></label>
                <label className="block text-white/70">Supplier-এর quotation (৳ প্রতি kWp, ঐচ্ছিক)
                  <input inputMode="numeric" value={user.capexTkPerKwp ?? ""} onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ""); setUser({ ...user, capexTkPerKwp: v ? Number(v) : null }); }} placeholder="quotation দিলে payback দেখাবে" className="mt-1 w-full rounded-lg bg-white/10 px-2.5 py-1.5 text-white placeholder:text-white/40" /></label>
                {est.payback !== null && <p className="text-white/80">বিনিয়োগ ৳{((est.capex ?? 0) / 1e7).toFixed(2)} কোটি → সরল payback <b>{est.payback.toFixed(1)} বছর</b> (grid মূল্য ৳{SOLAR_SRC.tariffTk.v}/kWh ধরে)</p>}
              </div>
              <button onClick={sendToPlanner} className="btn-lime relative mt-4 w-full rounded-full py-2.5 text-sm font-bold">{saved ? "✓ Planner-এ পাঠানো হয়েছে" : "এই ছাদ Planner-এ ব্যবহার করুন →"}</button>
            </>
          ) : !tooBig && <p className="relative mt-3 text-sm text-white/60">{!area ? "মানচিত্রে ছাদ আঁকুন বা \"Demo ছাদ\" চাপুন" : ghiErr ? "এই অবস্থানের সূর্যালোক (NASA POWER) পাওয়া যায়নি — বানানো মান দিয়ে হিসাব দেখানো হচ্ছে না। পরে আবার চেষ্টা করুন।" : !isRoof ? "ওপরে নিশ্চিত করলে হিসাব দেখাবে" : "সূর্যালোক লোড হচ্ছে…"}</p>}
        </div>

        <div className="card p-5 text-sm">
          <p className="font-bold">সূর্যালোক এই অবস্থানে</p>
          {ghi ? (
            <>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">{ghi.ann.toFixed(2)} <span className="text-sm font-semibold text-[var(--muted)]">kWh/m²/দিন</span></p>
              <p className="text-xs text-[var(--leaf)]">উৎস: NASA POWER climatology (all-sky) · {center.lat.toFixed(2)}°N, {center.lng.toFixed(2)}°E</p>
              {ghi.monthly.length === 12 && (
                <div className="mt-3 flex h-16 items-end gap-1">
                  {ghi.monthly.map((v, i) => <div key={i} className="flex-1 rounded-t bg-yellow-400/80" style={{ height: `${(v / Math.max(...ghi.monthly)) * 100}%` }} title={`${["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলা", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"][i]}: ${v} kWh/m²/দিন`} />)}
                </div>
              )}
            </>
          ) : <p className="mt-2 text-xs text-[var(--muted)]">{ghiErr ? "NASA POWER থেকে পাওয়া যায়নি" : "লোড হচ্ছে…"}</p>}
        </div>

        {est && ghi && (
          <div className="card p-5 text-xs">
            <p className="text-sm font-bold">হিসাব ধাপে ধাপে</p>
            <table className="mt-3 w-full">
              <tbody className="align-top">
                {[
                  ["আঁকা এলাকা", `${Math.round(area).toLocaleString()} m²`, "আপনার আঁকা কোণগুলোর জ্যামিতি (shoelace সূত্র)"],
                  ["প্যানেলের এলাকা", `× ${user.usablePct}% = ${Math.round(est.panelM2).toLocaleString()} m²`, "আপনার দেওয়া মান"],
                  ["ছাদে ধরে", `× ${Math.round(SOLAR_SRC.moduleWpPerM2.v)} W/m² = ${Math.round(est.fitKwp).toLocaleString()} kWp`, SOLAR_SRC.moduleWpPerM2.src],
                  ["প্রতি kWp-এ বছরে", `${ghi.ann.toFixed(2)} × ৩৬৫ × ${est.perf.toFixed(3)} = ${Math.round(est.yieldKwhPerKwp).toLocaleString()} kWh`, `${SOLAR_SRC.ghiSrc}; ${SOLAR_SRC.pvwattsLoss.src}; ${SOLAR_SRC.inverterEff.src}`],
                  ["দিনের চাহিদার সীমা", `${annualKwh.toLocaleString()} kWh × ${user.daytimePct}% ÷ ফলন = ${Math.round((annualKwh * user.daytimePct) / 100 / est.yieldKwhPerKwp).toLocaleString()} kWp`, "কারখানার শেষ ১২ মাসের grid বিদ্যুৎ (ledger) × আপনার দেওয়া দিনের অংশ"],
                  ["প্রস্তাবিত আকার", `${Math.round(est.kwp).toLocaleString()} kWp → ${Math.round(est.kwhYr).toLocaleString()} kWh/বছর`, "দুটোর ছোটটা — বাড়তি প্যানেল কাজে লাগে না"],
                  ["CO₂e কম", `× ${FACTORS[0].kgPerUnit} kg/kWh = ${est.tYr.toFixed(1)} t`, "Ember ২০২৪ বাংলাদেশ grid গুণক"],
                  ["নিট সাশ্রয়", `× $${SOLAR_SRC.savingUsd.v} = $${Math.round(est.savingUsd).toLocaleString()}`, SOLAR_SRC.savingUsd.src],
                ].map(([a, b, c]) => <tr key={a} className="border-t border-[var(--line)]"><td className="py-1.5 pr-2 font-semibold">{a}</td><td className="py-1.5 pr-2 tabular-nums">{b}<p className="text-[10px] text-[var(--muted)]">{c}</p></td></tr>)}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-amber-800">মডেল করা হয়নি: {SOLAR_SRC.notModeled}। চূড়ান্ত সিদ্ধান্তের আগে site survey আর supplier-এর quotation দরকার।</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Grid কেন নোংরা — শুধু যাচাই করা উৎসের সংখ্যা */
function GridFacts() {
  const g = FACTORS.find((f) => f.activity === "electricity")!;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="grain relative overflow-hidden rounded-[22px] bg-[#07130e] p-8 text-white">
        <div className="grid-bg absolute inset-0 opacity-40" />
        <div className="relative">
          <p className="text-sm text-white/60">বাংলাদেশের বিদ্যুৎ, ২০২৫ (Ember)</p>
          <p className="mt-2 text-[56px] font-extrabold leading-none text-orange-300">৯৮%</p>
          <p className="mt-1 text-lg">জীবাশ্ম জ্বালানি থেকে (গ্যাস, কয়লা, তেল)</p>
          <div className="mt-6 flex h-6 overflow-hidden rounded-full ring-1 ring-white/10">
            <i className="bg-gradient-to-r from-orange-400 via-red-400 to-stone-400" style={{ width: "98%" }} title="জীবাশ্ম ৯৮%" />
            <i className="bg-[var(--lime)]" style={{ width: "2%" }} title="কম-কার্বন ২%" />
          </div>
          <div className="mt-2 flex justify-between text-xs text-white/60"><span>জীবাশ্ম ৯৮%</span><span>কম-কার্বন ২% (তার মধ্যে সৌর ও বায়ু ১.৫%)</span></div>
          <p className="mt-2 text-xs text-white/50">বিশ্বে কম-কার্বন উৎসের গড় ভাগ ৪৩%</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs text-white/60">CarbonIQ-এর grid গুণক</p><p className="mt-1 text-3xl font-extrabold">{g.kgPerUnit} <span className="text-base font-semibold text-white/60">kg CO₂e/kWh</span></p><p className="text-xs text-white/50">Ember ২০২৪, lifecycle intensity</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs text-white/60">মানে আপনার কারখানায়</p><p className="mt-1 text-3xl font-extrabold">১,০০০ kWh</p><p className="text-xs text-white/50">≈ {Math.round(1000 * g.kgPerUnit)} kg CO₂e — নিজের ছাদের solar এই অংশটাই কমায়</p></div>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="card p-6 text-sm">
          <h2 className="font-bold">কেন এটা গুরুত্বপূর্ণ</h2>
          <p className="mt-2 text-[var(--muted)]">Grid প্রায় পুরোটা জীবাশ্ম জ্বালানিনির্ভর বলে প্রতি kWh-এ নির্গমন বেশি। তাই কারখানার Scope 2 (কেনা বিদ্যুৎ) বড়, আর ছাদের solar বা দক্ষতা-প্রকল্পে প্রতি kWh সাশ্রয়ে বেশি CO₂ কমে।</p>
          <p className="mt-2 text-[var(--muted)]">বাংলাদেশে একটাই জাতীয় grid, তাই অঞ্চলভেদে আলাদা প্রকাশিত গুণক নেই — CarbonIQ জাতীয় গুণক ব্যবহার করে।</p>
        </div>
        <div className="card p-5 text-[11px] leading-relaxed text-[var(--muted)]">
          <p><b className="text-[var(--ink)]">উৎস:</b> Ember, Bangladesh country profile (২০২৫-এর তথ্য: ৯৮% জীবাশ্ম, ২% কম-কার্বন, ১.৫% সৌর ও বায়ু; বিশ্বের কম-কার্বন গড় ৪৩%) আর Ember Yearly Electricity Data (২০২৪, ৬৯৬ g CO₂e/kWh, CC-BY-4.0)।</p>
          <p className="mt-2">আগে এখানে প্রতিটা বিদ্যুৎকেন্দ্রের মানচিত্র ছিল (WRI Global Power Plant Database ২০২১)। যাচাই করতে গিয়ে কয়েকটা কেন্দ্রের অবস্থান আর ক্ষমতায় স্পষ্ট ভুল পাওয়া গেছে, তাই সেটা সরিয়ে শুধু যাচাইযোগ্য জাতীয় সংখ্যা রাখা হয়েছে।</p>
          <a href="https://ember-energy.org/countries-and-regions/bangladesh/" target="_blank" rel="noreferrer" className="mt-3 inline-block font-semibold text-[var(--leaf)] hover:underline">Ember-এ দেখুন ↗</a>
        </div>
      </div>
    </div>
  );
}
