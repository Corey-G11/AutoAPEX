// apex-web/src/App.jsx
// Standalone build — replace src/App.jsx in your Vite project with this file.
// Two things changed from the Claude-artifact version:
//   1. Persistence: window.storage → localStorage (works everywhere)
//   2. Pricing: Anthropic API (in-Claude only) → your apex-market-api backend
// Everything else — deal scoring, ranking, range bars, UI — is identical.

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, X, RotateCw, Pencil, Trash2, Info, Crown,
  AlertTriangle, Gauge, MapPin, Loader2, ArrowDown, ArrowUp, Search,
} from "lucide-react";

// ── Set VITE_MARKET_API in .env.local (or in Vercel project settings) ────────
// e.g.  VITE_MARKET_API=https://apex-market-api.onrender.com
const MARKET_API = import.meta.env.VITE_MARKET_API || "";

const STORAGE_KEY = "apex_terminal_garage_v2";
const COL = 480;

const TIERS = {
  great:  { word: "GREAT DEAL",  color: "#4dffb0" },
  below:  { word: "BELOW MKT",   color: "#34e89e" },
  market: { word: "AT MARKET",   color: "#ffc24b" },
  above:  { word: "ABOVE MKT",   color: "#ff8f6b" },
  over:   { word: "OVERPRICED",  color: "#ff6b6b" },
};

/* ---------- helpers ---------- */
const uid = () =>
  crypto?.randomUUID?.() || "id" + Date.now() + Math.random().toString(16).slice(2);
const toNum = (s) => {
  const n = parseInt(String(s ?? "").replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? null : n;
};
const usd = (n) =>
  n == null || !isFinite(n) ? "—" : "$" + Math.round(n).toLocaleString("en-US");
const symbol = (c) => {
  const mk = (c.make || "").replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "CAR";
  const md = (c.trim || c.model || "").replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase() || (c.model || "").slice(0, 3).toUpperCase();
  const yy = c.year ? String(c.year).slice(-2) : "";
  return [mk, md, yy].filter(Boolean).join("·");
};
const computeBest = (c) => {
  const arr = [];
  if (c.targetPrice != null && isFinite(c.targetPrice)) arr.push(c.targetPrice);
  if (c.market && isFinite(c.market.low)) arr.push(c.market.low);
  return arr.length ? Math.min(...arr) : null;
};
const computeValue = (c, best) => {
  if (!c.market || best == null || !isFinite(c.market.average) || c.market.average <= 0) return null;
  return (c.market.average - best) / c.market.average;
};
const dealKey = (c, best) => {
  if (!c.market || best == null) return null;
  const { low, average, high } = c.market;
  if (best <= low) return "great";
  if (best < average * 0.99) return "below";
  if (best <= average * 1.02) return "market";
  if (best <= high) return "above";
  return "over";
};

/* ---------- live data: calls your backend (/api/market) ---------- */
async function fetchMarketData(car) {
  if (!MARKET_API) throw new Error("VITE_MARKET_API is not configured");
  const params = new URLSearchParams({
    year: String(car.year || ""),
    make: car.make || "",
    model: car.model || "",
    trim: car.trim || "",
    condition: car.condition || "",
    mileage: car.mileage != null ? String(car.mileage) : "",
  });
  const res = await fetch(`${MARKET_API}/api/market?${params}`);
  if (!res.ok) throw new Error("market api " + res.status);
  const m = await res.json();
  if (![m.low, m.average, m.high].every((n) => Number.isFinite(n))) throw new Error("no data");
  return {
    low: Math.round(m.low), average: Math.round(m.average), high: Math.round(m.high),
    currency: m.currency || "USD",
    asOf: m.asOf || new Date().toISOString().slice(0, 10),
    note: m.note || "",
    sources: Array.isArray(m.sources) ? m.sources.slice(0, 4) : [],
  };
}

/* ---------- UI pieces ---------- */
function RangeBar({ market, best }) {
  const { low, average, high } = market;
  const span = Math.max(high - low, 1);
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const avgPos = clamp((average - low) / span) * 100;
  const belowRange = best != null && best < low;
  const bestPos = best == null ? avgPos : clamp((best - low) / span) * 100;
  return (
    <div style={{ marginTop: 11 }}>
      <div className="mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--faint)", marginBottom: 5, letterSpacing: "0.04em" }}>
        <span>{usd(low)}</span>
        <span style={{ color: "var(--muted)" }}>MARKET RANGE</span>
        <span>{usd(high)}</span>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 6, background: "linear-gradient(90deg, rgba(77,255,176,.45), rgba(255,194,75,.4) 55%, rgba(255,107,107,.45))" }}>
        <div style={{ position: "absolute", left: avgPos + "%", top: -3, width: 2, height: 12, background: "var(--muted)", transform: "translateX(-1px)", borderRadius: 2 }} />
        <div style={{ position: "absolute", left: bestPos + "%", top: "50%", width: 13, height: 13, borderRadius: 13, background: belowRange ? "var(--green-bright)" : "#fff", border: "2px solid var(--bg)", boxShadow: best != null ? "0 0 0 2px rgba(77,255,176,.55), 0 0 10px rgba(77,255,176,.5)" : "none", transform: "translate(-50%,-50%)" }} />
      </div>
    </div>
  );
}

function DeltaChip({ value, tier }) {
  if (value == null || !tier) return null;
  const t = TIERS[tier];
  const down = value >= 0;
  const pct = Math.abs(value * 100).toFixed(1) + "%";
  return (
    <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 7px", borderRadius: 6, fontSize: 10.5, fontWeight: 600, color: t.color, background: t.color + "1f", border: "1px solid " + t.color + "38", whiteSpace: "nowrap" }}>
      {tier === "market" ? <span style={{ fontSize: 8 }}>■</span> : down ? <ArrowDown size={11} /> : <ArrowUp size={11} />}
      {pct} · {t.word}
    </span>
  );
}

function Chip({ children, icon: Icon }) {
  return (
    <span className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 5, fontSize: 9.5, color: "var(--muted)", background: "var(--panel2)", border: "1px solid var(--border)" }}>
      {Icon && <Icon size={10} />}
      {children}
    </span>
  );
}

function IconBtn({ onClick, disabled, title, children, danger }) {
  return (
    <button className="iconbtn" onClick={onClick} disabled={disabled} title={title} style={{ color: danger ? "var(--red)" : "var(--muted)" }}>
      {children}
    </button>
  );
}

function CarRow({ car, rank, isTop, onRefresh, onEdit, onDelete, index }) {
  const best = computeBest(car);
  const value = computeValue(car, best);
  const tier = dealKey(car, best);
  const isYour = car.targetPrice != null && best === car.targetPrice;
  const loading = car.marketStatus === "loading";
  const error = car.marketStatus === "error";

  return (
    <div className="term-card term-rise" style={{ animationDelay: Math.min(index * 45, 400) + "ms", borderColor: isTop ? "rgba(77,255,176,.45)" : "var(--border)", boxShadow: isTop ? "0 0 0 1px rgba(77,255,176,.25), 0 0 28px rgba(77,255,176,.07)" : "none" }}>
      {isTop && (
        <div className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9.5, fontWeight: 700, color: "var(--bg)", background: "var(--green-bright)", padding: "3px 8px 3px 6px", borderRadius: "0 0 9px 0", position: "absolute", top: 0, left: 0, letterSpacing: "0.06em" }}>
          <Crown size={11} /> BEST VALUE
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingTop: isTop ? 8 : 0 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--faint)" }}>{String(rank).padStart(2, "0")}</span>
            <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--cyan)", letterSpacing: "0.04em" }}>{symbol(car)}</span>
          </div>
          <div className="disp" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.01em" }}>{[car.year, car.make, car.model].filter(Boolean).join(" ")}</div>
          {car.trim && <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2, letterSpacing: "0.03em" }}>{car.trim.toUpperCase()}</div>}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
            <Chip>{car.condition === "used" ? "USED" : "NEW"}</Chip>
            {car.condition === "used" && car.mileage != null && <Chip icon={Gauge}>{Number(car.mileage).toLocaleString()} mi</Chip>}
            {car.source && <Chip icon={MapPin}>{car.source}</Chip>}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {loading ? (
            <div style={{ minWidth: 96 }}>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Loader2 size={12} className="spin" /> QUERYING
              </div>
              <div className="scanbar" style={{ marginTop: 7, width: 96, marginLeft: "auto" }} />
            </div>
          ) : (
            <>
              <div className="disp" style={{ fontSize: 23, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>{usd(best)}</div>
              <div className="mono" style={{ fontSize: 9, color: "var(--faint)", marginTop: 3, letterSpacing: "0.04em" }}>{best != null ? (isYour ? "YOUR PRICE" : "BEST US PRICE") : "NO PRICE YET"}</div>
              {value != null && <div style={{ marginTop: 7 }}><DeltaChip value={value} tier={tier} /></div>}
            </>
          )}
        </div>
      </div>

      {!loading && car.market && <RangeBar market={car.market} best={best} />}

      {error && (
        <div className="mono" style={{ marginTop: 10, fontSize: 10.5, color: "var(--red)", display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={12} /> fetch failed
          <button className="linkbtn" onClick={() => onRefresh(car)} style={{ color: "var(--cyan)" }}>retry ▸</button>
        </div>
      )}
      {!loading && !car.market && !error && (
        <button className="linkbtn" onClick={() => onRefresh(car)} style={{ marginTop: 10, fontSize: 10.5, color: "var(--green)", display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Search size={11} /> FETCH LIVE US MARKET ▸
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 11, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
        <div style={{ minWidth: 0 }}>
          {car.market?.sources?.length > 0 && <div className="mono" style={{ fontSize: 9, color: "var(--faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{car.market.sources.join(" · ").toUpperCase()}</div>}
          {car.market && <div className="mono" style={{ fontSize: 9, color: "var(--faint)", marginTop: 2 }}>UPDATED {car.market.asOf}</div>}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <IconBtn onClick={() => onRefresh(car)} disabled={loading} title="Refresh"><RotateCw size={14} className={loading ? "spin" : ""} /></IconBtn>
          <IconBtn onClick={() => onEdit(car)} title="Edit"><Pencil size={14} /></IconBtn>
          <IconBtn onClick={() => onDelete(car)} title="Remove" danger><Trash2 size={14} /></IconBtn>
        </div>
      </div>
    </div>
  );
}

function Ticker({ items }) {
  if (!items.length) return null;
  const row = items.map((it, i) => (
    <span key={i} className="mono" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "0 16px", borderRight: "1px solid var(--border)", fontSize: 11 }}>
      <span style={{ color: "var(--muted)" }}>{it.sym}</span>
      <span>{usd(it.best)}</span>
      <span style={{ color: it.dir === "down" ? "var(--green)" : it.dir === "up" ? "var(--red)" : "var(--amber)" }}>
        {it.dir === "down" ? "▼" : it.dir === "up" ? "▲" : "■"} {it.pct}
      </span>
    </span>
  ));
  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        <div className="ticker-seg">{row}</div>
        <div className="ticker-seg" aria-hidden="true">{row}</div>
      </div>
    </div>
  );
}

const BLANK = { year: "", make: "", model: "", trim: "", condition: "new", mileage: "", targetPrice: "", source: "" };

function CarSheet({ open, editing, onClose, onSave }) {
  const [d, setD] = useState(BLANK);
  useEffect(() => {
    if (open) setD(editing ? { year: editing.year ? String(editing.year) : "", make: editing.make || "", model: editing.model || "", trim: editing.trim || "", condition: editing.condition || "new", mileage: editing.mileage != null ? String(editing.mileage) : "", targetPrice: editing.targetPrice != null ? String(editing.targetPrice) : "", source: editing.source || "" } : BLANK);
  }, [open, editing]);

  if (!open) return null;
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const canSave = d.make.trim() && d.model.trim() && /^\d{4}$/.test(d.year.trim());
  const save = () => {
    if (!canSave) return;
    const car = { id: editing?.id || uid(), year: parseInt(d.year, 10), make: d.make.trim(), model: d.model.trim(), trim: d.trim.trim(), condition: d.condition, mileage: d.condition === "used" ? toNum(d.mileage) : null, targetPrice: toNum(d.targetPrice), source: d.source.trim(), market: editing?.market || null, marketStatus: "idle", createdAt: editing?.createdAt || Date.now() };
    const idChanged = editing ? (editing.make !== car.make || editing.model !== car.model || editing.trim !== car.trim || editing.year !== car.year || editing.condition !== car.condition || editing.mileage !== car.mileage) : true;
    if (idChanged) car.market = null;
    onSave(car, !editing, idChanged);
  };

  return (
    <>
      <div className="overlay term-fade" onClick={onClose} />
      <div className="sheet term-sheet" style={colFixed}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}><div style={{ width: 38, height: 4, borderRadius: 4, background: "var(--border)" }} /></div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px 8px" }}>
          <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--green)", letterSpacing: "0.06em" }}>▸ {editing ? "EDIT VEHICLE" : "ADD VEHICLE"}</div>
          <button className="iconbtn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "4px 18px 24px", overflowY: "auto", maxHeight: "66vh" }}>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="YEAR" style={{ width: 92 }}><input className="term-input" inputMode="numeric" placeholder="2024" value={d.year} onChange={(e) => set("year", e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} /></Field>
            <Field label="MAKE" style={{ flex: 1 }}><input className="term-input" placeholder="Honda" value={d.make} onChange={(e) => set("make", e.target.value)} /></Field>
          </div>
          <Field label="MODEL"><input className="term-input" placeholder="Civic" value={d.model} onChange={(e) => set("model", e.target.value)} /></Field>
          <Field label="TRIM (optional)"><input className="term-input" placeholder="Type R" value={d.trim} onChange={(e) => set("trim", e.target.value)} /></Field>
          <Field label="CONDITION">
            <div style={{ display: "flex", gap: 8 }}>
              {["new", "used"].map((c) => <button key={c} className="seg" data-on={d.condition === c} onClick={() => set("condition", c)} style={{ flex: 1 }}>{c.toUpperCase()}</button>)}
            </div>
          </Field>
          {d.condition === "used" && <Field label="MILEAGE"><input className="term-input" inputMode="numeric" placeholder="32,000" value={d.mileage} onChange={(e) => set("mileage", e.target.value.replace(/[^0-9]/g, ""))} /></Field>}
          <Field label="YOUR PRICE / TARGET (optional)"><input className="term-input" inputMode="numeric" placeholder="e.g. 41500" value={d.targetPrice} onChange={(e) => set("targetPrice", e.target.value.replace(/[^0-9]/g, ""))} /></Field>
          <Field label="WHERE FOUND (optional)"><input className="term-input" placeholder="Dealer, city or site" value={d.source} onChange={(e) => set("source", e.target.value)} /></Field>
          <div className="mono" style={{ fontSize: 10, color: "var(--faint)", margin: "4px 2px 14px", lineHeight: 1.5 }}>Live market price is fetched from your backend after saving.</div>
          <button className="primary" disabled={!canSave} onClick={save}>{editing ? "SAVE CHANGES" : "ADD TO WATCHLIST"}</button>
          {!canSave && <div className="mono" style={{ fontSize: 10, color: "var(--amber)", marginTop: 8, textAlign: "center" }}>year, make & model required</div>}
        </div>
      </div>
    </>
  );
}

function Field({ label, children, style }) {
  return <div style={{ marginTop: 12, ...style }}><div className="mono" style={{ fontSize: 9.5, color: "var(--muted)", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>{children}</div>;
}

function ConfirmModal({ data, onClose }) {
  if (!data) return null;
  return (
    <>
      <div className="overlay term-fade" onClick={onClose} />
      <div className="modal term-rise" style={colCenter}>
        <div className="disp" style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{data.title}</div>
        <div className="mono" style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 18 }}>{data.body}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="seg" style={{ flex: 1 }} onClick={onClose}>CANCEL</button>
          <button className="primary danger" style={{ flex: 1 }} onClick={() => { data.onConfirm(); onClose(); }}>{data.confirmLabel}</button>
        </div>
      </div>
    </>
  );
}

function InfoModal({ open, onClose }) {
  if (!open) return null;
  return (
    <>
      <div className="overlay term-fade" onClick={onClose} />
      <div className="modal term-rise" style={colCenter}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--green)", letterSpacing: "0.06em" }}>▸ DATA SOURCE</div>
          <button className="iconbtn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="mono" style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
          <p style={{ margin: "0 0 10px" }}>Prices are pulled live from your <strong style={{ color: "var(--text)" }}>apex-market-api</strong> backend, which aggregates nationwide US dealer listings via Auto.dev or MarketCheck.</p>
          <p style={{ margin: 0 }}>Set <code style={{ color: "var(--cyan)" }}>VITE_MARKET_API</code> to your deployed backend URL to enable pricing.</p>
        </div>
      </div>
    </>
  );
}

const colFixed = { position: "fixed", left: "50%", bottom: 0, transform: "translateX(-50%)", width: "100%", maxWidth: COL, zIndex: 60 };
const colCenter = { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "100%", maxWidth: 360, zIndex: 60 };

/* ====================================================================== */
export default function App() {
  const [cars, setCars] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [sort, setSort] = useState("value");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);

  /* ── persistence: localStorage ─────────────────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setCars(arr.map((c) => ({ ...c, marketStatus: "idle" })));
      }
    } catch (e) { /* no saved data */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cars)); } catch (e) {}
  }, [cars, loaded]);

  const refreshCar = useCallback(async (car) => {
    setCars((cs) => cs.map((c) => (c.id === car.id ? { ...c, marketStatus: "loading" } : c)));
    try {
      const market = await fetchMarketData(car);
      setCars((cs) => cs.map((c) => (c.id === car.id ? { ...c, market, marketStatus: "idle" } : c)));
    } catch (e) {
      setCars((cs) => cs.map((c) => (c.id === car.id ? { ...c, marketStatus: "error" } : c)));
    }
  }, []);

  const handleSave = useCallback((car, isNew, idChanged) => {
    setCars((cs) => (isNew ? [car, ...cs] : cs.map((c) => (c.id === car.id ? car : c))));
    setSheetOpen(false); setEditing(null);
    if (isNew || idChanged) refreshCar(car);
  }, [refreshCar]);

  const askDelete = (car) => setConfirm({ title: "Remove vehicle?", body: `${[car.year, car.make, car.model].filter(Boolean).join(" ")} will be removed.`, confirmLabel: "REMOVE", onConfirm: () => setCars((cs) => cs.filter((c) => c.id !== car.id)) });
  const askClear = () => setConfirm({ title: "Clear watchlist?", body: "Removes every vehicle you're tracking.", confirmLabel: "CLEAR ALL", onConfirm: () => setCars([]) });

  const addSample = () => {
    const car = { id: uid(), year: 2024, make: "Honda", model: "Civic", trim: "Type R", condition: "new", mileage: null, targetPrice: null, source: "", market: null, marketStatus: "idle", createdAt: Date.now() };
    setCars((cs) => [car, ...cs]);
    refreshCar(car);
  };

  const decorated = useMemo(() => cars.map((c) => { const best = computeBest(c); return { ...c, _best: best, _value: computeValue(c, best), _tier: dealKey(c, best) }; }), [cars]);
  const sorted = useMemo(() => {
    const a = [...decorated];
    if (sort === "recent") a.sort((x, y) => y.createdAt - x.createdAt);
    else if (sort === "price") a.sort((x, y) => ((x._best ?? Infinity) - (y._best ?? Infinity)) || (y.createdAt - x.createdAt));
    else a.sort((x, y) => ((y._value ?? -Infinity) - (x._value ?? -Infinity)) || (y.createdAt - x.createdAt));
    return a;
  }, [decorated, sort]);
  const topPickId = useMemo(() => { const r = decorated.filter((c) => c._value != null).sort((a, b) => b._value - a._value); return r[0] && ["great", "below", "market"].includes(r[0]._tier) ? r[0].id : null; }, [decorated]);
  const priced = decorated.filter((c) => c.market).length;
  const topVal = useMemo(() => { const r = decorated.filter((c) => c._value != null).sort((a, b) => b._value - a._value)[0]; return r ? r._value : null; }, [decorated]);
  const tickerItems = useMemo(() => sorted.filter((c) => c._best != null).map((c) => ({ sym: symbol(c), best: c._best, dir: c._value == null ? "flat" : c._value > 0.005 ? "down" : c._value < -0.005 ? "up" : "flat", pct: c._value == null ? "—" : Math.abs(c._value * 100).toFixed(1) + "%" })), [sorted]);

  return (
    <div className="apex-root" style={ROOT_VARS}>
      <style>{CSS}</style>
      <div style={{ maxWidth: COL, margin: "0 auto", position: "relative", paddingBottom: 110 }}>
        <header style={{ padding: "18px 18px 12px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span className="disp" style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.04em" }}>APEX</span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>//MKT</span>
                <span className="caret" />
              </div>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, letterSpacing: "0.05em" }}>▸ us national market feed · cars ranked by value</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button className="iconbtn" title="Data source" onClick={() => setInfoOpen(true)}><Info size={16} /></button>
              {cars.length > 0 && <button className="iconbtn" onClick={askClear} style={{ color: "var(--faint)" }}><Trash2 size={16} /></button>}
            </div>
          </div>

          {!MARKET_API && (
            <div className="mono" style={{ marginTop: 12, padding: "9px 12px", background: "rgba(255,194,75,.08)", border: "1px solid rgba(255,194,75,.35)", borderRadius: 9, fontSize: 10.5, color: "var(--amber)", lineHeight: 1.5 }}>
              ⚠ Set <code>VITE_MARKET_API</code> in your <code>.env.local</code> (or in Vercel project settings) to connect to your backend and enable live pricing.
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <StatCell label="TRACKED" value={String(cars.length)} />
            <StatCell label="PRICED" value={`${priced}/${cars.length}`} />
            <StatCell label="TOP DEAL" value={topVal == null ? "—" : (topVal >= 0 ? "−" : "+") + Math.abs(topVal * 100).toFixed(1) + "%"} color={topVal == null ? "var(--muted)" : topVal >= 0 ? "var(--green-bright)" : "var(--red)"} />
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span className="livedot" /><span className="mono" style={{ fontSize: 9, color: "var(--green)", letterSpacing: "0.08em" }}>LIVE</span>
            </div>
          </div>
        </header>

        {tickerItems.length > 0 && <Ticker items={tickerItems} />}
        {cars.length > 0 && (
          <div style={{ display: "flex", gap: 7, padding: "14px 18px 4px" }}>
            {[["value", "BEST VALUE"], ["price", "LOW PRICE"], ["recent", "RECENT"]].map(([k, l]) => (
              <button key={k} className="seg" data-on={sort === k} onClick={() => setSort(k)} style={{ flex: 1, fontSize: 10.5 }}>{l}</button>
            ))}
          </div>
        )}

        <div style={{ padding: "10px 18px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          {!loaded ? (
            <div className="mono" style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0", fontSize: 12 }}>
              <Loader2 size={18} className="spin" style={{ display: "inline" }} /><br />loading garage…
            </div>
          ) : cars.length === 0 ? (
            <EmptyState onAdd={() => { setEditing(null); setSheetOpen(true); }} onSample={addSample} />
          ) : (
            sorted.map((car, i) => (
              <CarRow key={car.id} car={car} rank={i + 1} index={i} isTop={car.id === topPickId} onRefresh={refreshCar} onEdit={(c) => { setEditing(c); setSheetOpen(true); }} onDelete={askDelete} />
            ))
          )}
        </div>
      </div>

      {loaded && cars.length > 0 && (
        <div style={{ position: "fixed", left: "50%", bottom: 22, transform: "translateX(-50%)", width: "100%", maxWidth: COL, zIndex: 50, pointerEvents: "none" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: 18 }}>
            <button className="fab" onClick={() => { setEditing(null); setSheetOpen(true); }} style={{ pointerEvents: "auto" }}>
              <Plus size={18} /> ADD
            </button>
          </div>
        </div>
      )}

      <CarSheet open={sheetOpen} editing={editing} onClose={() => { setSheetOpen(false); setEditing(null); }} onSave={handleSave} />
      <ConfirmModal data={confirm} onClose={() => setConfirm(null)} />
      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}

function StatCell({ label, value, color }) {
  return (
    <div style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 10px" }}>
      <div className="mono" style={{ fontSize: 8.5, color: "var(--faint)", letterSpacing: "0.07em" }}>{label}</div>
      <div className="disp" style={{ fontSize: 18, fontWeight: 800, marginTop: 2, letterSpacing: "-0.02em", color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}

function EmptyState({ onAdd, onSample }) {
  return (
    <div className="term-rise" style={{ textAlign: "center", padding: "44px 16px 30px" }}>
      <div className="mono" style={{ fontSize: 11, color: "var(--green)", letterSpacing: "0.1em" }}>[ NO VEHICLES IN WATCHLIST ]</div>
      <div className="disp" style={{ fontSize: 22, fontWeight: 700, marginTop: 14, letterSpacing: "-0.02em" }}>Track the cars you want.</div>
      <div className="mono" style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.6, maxWidth: 300, marginInline: "auto" }}>Add a vehicle and APEX pulls its current US market price, then ranks your list best → worst by value.</div>
      <button className="primary" style={{ marginTop: 22, maxWidth: 240, marginInline: "auto" }} onClick={onAdd}>+ ADD VEHICLE</button>
      <div style={{ marginTop: 14 }}>
        <button className="linkbtn" onClick={onSample} style={{ color: "var(--cyan)", fontSize: 11 }}>load sample ▸ 2024 Honda Civic Type R</button>
      </div>
    </div>
  );
}

const ROOT_VARS = {
  "--bg": "#08090b", "--panel": "#0f1216", "--panel2": "#14181d", "--border": "#222831",
  "--text": "#e9edf2", "--muted": "#878f99", "--faint": "#565d67",
  "--green": "#34e89e", "--green-bright": "#4dffb0", "--amber": "#ffc24b",
  "--red": "#ff6b6b", "--cyan": "#5cd6ff",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
.apex-root{min-height:100vh;background-color:var(--bg);background-image:radial-gradient(120% 65% at 50% -12%, rgba(77,255,176,.07), transparent 58%),linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px);background-size:100% 100%, 30px 30px, 30px 30px;color:var(--text);font-family:'IBM Plex Mono', ui-monospace, monospace;-webkit-font-smoothing:antialiased;}
.apex-root *{box-sizing:border-box;}
.apex-root ::selection{background:rgba(77,255,176,.25);}
.mono{font-family:'IBM Plex Mono', ui-monospace, monospace;}
.disp{font-family:'Bricolage Grotesque', system-ui, sans-serif;}
.term-card{position:relative;background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:14px;overflow:hidden;}
.iconbtn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;background:transparent;border:1px solid transparent;cursor:pointer;transition:.15s;}
.iconbtn:hover{background:var(--panel2);border-color:var(--border);color:var(--text);}
.iconbtn:disabled{opacity:.4;cursor:default;}
.linkbtn{background:none;border:none;padding:0;cursor:pointer;font-family:'IBM Plex Mono',monospace;font-weight:600;letter-spacing:.04em;}
.seg{background:var(--panel);color:var(--muted);border:1px solid var(--border);border-radius:9px;padding:9px 10px;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:.05em;cursor:pointer;transition:.15s;}
.seg:hover{color:var(--text);}
.seg[data-on="true"]{background:rgba(77,255,176,.1);border-color:rgba(77,255,176,.5);color:var(--green-bright);}
.term-input{width:100%;background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:9px;padding:11px 12px;font-family:'IBM Plex Mono',monospace;font-size:16px;outline:none;transition:.15s;}
.term-input::placeholder{color:var(--faint);}
.term-input:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(92,214,255,.16);}
.primary{width:100%;display:flex;align-items:center;justify-content:center;gap:6px;background:var(--green-bright);color:#04120c;border:none;border-radius:11px;padding:13px;font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:700;letter-spacing:.06em;cursor:pointer;transition:.15s;}
.primary:hover{filter:brightness(1.06);}
.primary:disabled{opacity:.4;cursor:default;}
.primary.danger{background:var(--red);color:#1a0606;}
.fab{display:inline-flex;align-items:center;gap:7px;background:var(--green-bright);color:#04120c;border:none;border-radius:14px;padding:13px 18px;font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:700;letter-spacing:.06em;cursor:pointer;box-shadow:0 8px 26px rgba(77,255,176,.32);transition:.15s;}
.fab:hover{filter:brightness(1.06);}
.overlay{position:fixed;inset:0;background:rgba(4,5,7,.72);backdrop-filter:blur(3px);z-index:55;}
.sheet{background:var(--panel);border:1px solid var(--border);border-bottom:none;border-radius:20px 20px 0 0;box-shadow:0 -16px 50px rgba(0,0,0,.5);}
.modal{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:18px;box-shadow:0 16px 50px rgba(0,0,0,.55);}
.scanbar{height:4px;border-radius:4px;background:linear-gradient(90deg,var(--border) 0%,var(--green-bright) 50%,var(--border) 100%);background-size:200% 100%;animation:term-scan 1.1s linear infinite;}
.livedot{width:7px;height:7px;border-radius:7px;background:var(--green-bright);box-shadow:0 0 8px var(--green-bright);animation:term-pulse 1.4s ease-in-out infinite;}
.caret{display:inline-block;width:9px;height:18px;background:var(--green-bright);margin-left:1px;animation:term-blink 1.1s steps(1) infinite;vertical-align:-2px;}
.ticker-wrap{overflow:hidden;border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:rgba(15,18,22,.7);padding:9px 0;}
.ticker-track{display:flex;width:max-content;animation:term-marquee 34s linear infinite;}
.ticker-wrap:hover .ticker-track{animation-play-state:paused;}
.ticker-seg{display:flex;}
.spin{animation:term-spin .9s linear infinite;}
@keyframes term-spin{to{transform:rotate(360deg);}}
@keyframes term-scan{from{background-position:200% 0;}to{background-position:-200% 0;}}
@keyframes term-pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
@keyframes term-blink{0%,49%{opacity:1;}50%,100%{opacity:0;}}
@keyframes term-marquee{from{transform:translateX(0);}to{transform:translateX(-50%);}}
@keyframes term-rise{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
@keyframes term-fade{from{opacity:0;}to{opacity:1;}}
@keyframes term-sheet{from{transform:translate(-50%,100%);}to{transform:translate(-50%,0);}}
.term-rise{animation:term-rise .42s cubic-bezier(.2,.7,.2,1) both;}
.term-fade{animation:term-fade .2s ease both;}
.term-sheet{animation:term-sheet .34s cubic-bezier(.2,.8,.2,1) both;}
.apex-root ::-webkit-scrollbar{width:8px;}
.apex-root ::-webkit-scrollbar-thumb{background:var(--border);border-radius:8px;}
`;
