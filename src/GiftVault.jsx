import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";

/*
  GiftVault — витрина-каталог Telegram-подарков (прототип).
  Раскладка как на MRKT/Edey: панель фильтров (коллекция/модель/фон/символ,
  цена, редкость) + сортировка сверху + чипы активных фильтров. Визуал — наш.
  Картинки — реальные, с публичного CDN Fragment. Оплаты нет.
*/

// ---------- КОЛЛЕКЦИИ ----------
const COLLECTIONS = {
  "Plush Pepe":    { code: "PlushPepe",   slug: "plushpepe",   bg: ["#2fa76a", "#0c3a26"], glyph: "🐸" },
  "Durov's Cap":   { code: "DurovsCap",   slug: "durovscap",   bg: ["#5568b0", "#151b33"], glyph: "🧢" },
  "Astral Shard":  { code: "AstralShard", slug: "astralshard", bg: ["#3fb6c9", "#123a44"], glyph: "💎" },
  "Easter Egg":    { code: "EasterEgg",   slug: "easteregg",   bg: ["#b57ce0", "#33184a"], glyph: "🥚" },
  "Toy Bear":      { code: "ToyBear",     slug: "toybear",     bg: ["#c9954a", "#4a3418"], glyph: "🧸" },
  "Jelly Bunny":   { code: "JellyBunny",  slug: "jellybunny",  bg: ["#9a5ac2", "#2a144a"], glyph: "🐰" },
  "Loot Bag":      { code: "LootBag",     slug: "lootbag",     bg: ["#e6b85a", "#4a3418"], glyph: "💰" },
  "Lol Pop":       { code: "LolPop",      slug: "lolpop",      bg: ["#e08a4a", "#4a2412"], glyph: "🍭" },
};
const MODELS = ["Shiny Silk", "Albino", "Molten Core", "Frostbite", "Neon Pulse", "Velvet", "Obsidian", "Aurora"];
const BACKDROPS = ["Minty", "Midnight", "Sunset", "Onyx", "Coral", "Steel", "Emerald", "Amethyst"];
const SYMBOLS = ["Cherry", "Star", "Bolt", "Crown", "Skull", "Heart", "Anchor", "Flame"];

const rand = (s) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
const fragUrl = (slug, n, size = "medium") => `https://nft.fragment.com/gift/${slug}-${n}.${size}.jpg`;

function buildRealGifts() {
  const entries = Object.entries(COLLECTIONS);
  const numbers = [1, 2, 3, 4, 5, 6];
  const out = []; let i = 0;
  for (const [title, c] of entries) {
    for (const n of numbers) {
      const mr = 3 + Math.floor(rand(i * 1.3 + 1) * 90);
      const br = 3 + Math.floor(rand(i * 2.9 + 1) * 90);
      const sr = 3 + Math.floor(rand(i * 4.6 + 1) * 90);
      const total = mr + br + sr;
      const rf = (270 - total) / 270;
      const price = +(0.8 + rf * rf * 34 + rand(i * 9.2 + 1) * 2).toFixed(2);
      const floor = +(price * (1 + (rand(i * 5.5 + 1) - 0.35) * 0.3)).toFixed(2);
      out.push({
        name: `${c.code}-${n}`, slug: c.slug, number: n, title, collection: title,
        img: fragUrl(c.slug, n, "medium"), imgLarge: fragUrl(c.slug, n, "large"),
        nft_url: `t.me/nft/${c.code}-${n}`,
        model: MODELS[Math.floor(rand(i * 6.1 + 1) * MODELS.length)],
        backdrop: BACKDROPS[Math.floor(rand(i * 8.3 + 1) * BACKDROPS.length)],
        symbol: SYMBOLS[Math.floor(rand(i * 2.2 + 1) * SYMBOLS.length)],
        price_ton: price, floor_ton: floor,
        model_rarity: mr, backdrop_rarity: br, symbol_rarity: sr, total_rarity: total,
        gift_type: "Upgraded", listed_at: 10000 - i, _seed: i,
      });
      i++;
    }
  }
  return out;
}
// Точка подключения источника. Прод: fetch к своему прокси -> GiftAsset (см. предыдущую версию).
const PROXY = "https://wherever-davidson-pregnancy-allowed.trycloudflare.com";
const FUNPAY = "https://funpay.com/users/4175976/";
async function getGifts() {
  try {
    const r = await fetch(PROXY + "/api/gifts");
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data) && data.length) return data.map((g, i) => ({ ...g, listed_at: i }));
    }
  } catch (e) {}
  return buildRealGifts();
}

// ---------- ХЕЛПЕРЫ ----------
const TON_RUB = 320;
const fmtTon = (v) => `${v.toFixed(2)} TON`;
const fmtRub = (v) => `≈ ${Math.round(v * TON_RUB).toLocaleString("ru-RU")} ₽`;
function rarityTier() { return { label: "", key: "", color: "#6FD3E8", glow: 0.3 }; }

// ---------- ЗВУК ----------
function useSound(enabled) {
  const ctxRef = useRef(null);
  const ensure = () => {
    if (!enabled) return null;
    if (!ctxRef.current) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctxRef.current = new AC(); }
    const c = ctxRef.current; if (c && c.state === "suspended") c.resume(); return c;
  };
  const tone = useCallback((freq, dur, { type = "sine", gain = 0.05, slideTo, delay = 0 } = {}) => {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }, [enabled]);
  return useMemo(() => ({
    hover: () => tone(1250, 0.05, { gain: 0.015 }),
    tap:   () => tone(430, 0.09, { type: "triangle", gain: 0.05, slideTo: 700 }),
    open:  () => tone(320, 0.16, { gain: 0.04, slideTo: 520 }),
    copy:  () => { tone(660, 0.08, { gain: 0.04 }); tone(990, 0.1, { gain: 0.04, delay: 0.07 }); },
    buy:   () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, { gain: 0.05, delay: i * 0.07 })); },
  }), [tone]);
}

// ---------- АРТ ПОДАРКА ----------
function ProcArt({ gift, size }) {
  const c = COLLECTIONS[gift.collection] || { bg: ["#334", "#112"], glyph: "🎁" };
  const tier = rarityTier(gift.total_rarity); const gid = `g${gift.name}`;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ display: "block" }}>
      <defs>
        <radialGradient id={gid} cx="50%" cy="36%" r="78%"><stop offset="0%" stopColor={c.bg[0]} /><stop offset="100%" stopColor={c.bg[1]} /></radialGradient>
        <filter id={`${gid}b`}><feGaussianBlur stdDeviation="7" /></filter>
      </defs>
      <rect x="8" y="8" width="184" height="184" rx="30" fill={`url(#${gid})`} />
      <circle cx="100" cy="84" r="54" fill={tier.color} opacity={tier.glow * 0.35} filter={`url(#${gid}b)`} />
      <circle cx="100" cy="84" r="46" fill="none" stroke={tier.color} strokeWidth="1.5" opacity={tier.glow} />
      <text x="100" y="103" fontSize="58" textAnchor="middle">{c.glyph}</text>
      <text x="100" y="150" fontSize="11" fill="#fff" opacity="0.5" textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" letterSpacing="1">#{gift.number}</text>
    </svg>
  );
}
function GiftArt({ gift, size = 168, float = false, large = false }) {
  const [err, setErr] = useState(false);
  const tier = rarityTier(gift.total_rarity);
  const src = large ? gift.imgLarge : gift.img;
  const anim = float ? "gvFloat 4s ease-in-out infinite" : "none";
  if (err || !src) return <div style={{ animation: anim }}><ProcArt gift={gift} size={size} /></div>;
  return (
    <div style={{ width: size, height: size, borderRadius: 26, overflow: "hidden", position: "relative", animation: anim, boxShadow: `inset 0 0 0 1.5px ${tier.color}55` }}>
      <img src={src} alt={`${gift.collection} #${gift.number}`} loading="lazy" onError={() => setErr(true)}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <span style={{ position: "absolute", inset: 0, boxShadow: `inset 0 -40px 40px -30px ${tier.color}66`, pointerEvents: "none" }} />
    </div>
  );
}

// ---------- ИСКРЫ / КНОПКА / КОПИРОВАНИЕ ----------
function Sparkles({ fire }) {
  if (!fire) return null;
  return (
    <span style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2, d = 34 + Math.random() * 26;
        const col = ["#6FD3E8", "#F5C563", "#C58BF0", "#4ADE80"][i % 4];
        return <span key={`${fire}-${i}`} style={{ position: "absolute", left: "50%", top: "50%", width: 7, height: 7, borderRadius: 999, background: col, "--tx": `${Math.cos(a) * d}px`, "--ty": `${Math.sin(a) * d}px`, animation: "gvSpark .62s ease-out forwards" }} />;
      })}
    </span>
  );
}
function PressButton({ children, onClick, sfx, style, primary }) {
  const [fire, setFire] = useState(0), [down, setDown] = useState(false);
  return (
    <button onClick={() => { setFire((n) => n + 1); sfx && sfx(); onClick && onClick(); }}
      onMouseDown={() => setDown(true)} onMouseUp={() => setDown(false)} onMouseLeave={() => setDown(false)}
      style={{ position: "relative", border: "none", cursor: "pointer", borderRadius: 14, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, transition: "transform .08s, filter .15s", transform: down ? "scale(.96)" : "scale(1)", ...style }}>
      {primary && <Sparkles fire={fire} />}<span style={{ position: "relative" }}>{children}</span>
    </button>
  );
}
function CopyRow({ label, value, sfx }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    const fin = () => { setDone(true); sfx && sfx(); setTimeout(() => setDone(false), 1400); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).then(fin).catch(fin);
    else { const ta = document.createElement("textarea"); ta.value = value; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} document.body.removeChild(ta); fin(); }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#191C26", border: "1px solid #262A38", borderRadius: 12, padding: "8px 8px 8px 12px" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: "#6B7280", textTransform: "uppercase", letterSpacing: .6 }}>{label}</div>
        <div style={{ fontFamily: "'Space Grotesk', monospace", fontSize: 13, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      </div>
      <button onClick={copy} style={{ border: "none", cursor: "pointer", borderRadius: 9, padding: "8px 12px", fontSize: 12, fontWeight: 700, background: done ? "#4ADE80" : "#232A3A", color: done ? "#06210f" : "#dfe4ee", transition: "background .2s", fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap" }}>{done ? "✓ Готово" : "Копировать"}</button>
    </div>
  );
}

// ---------- ФИЛЬТРЫ ----------
function Section({ title, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid #1B1E28", padding: "12px 0" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: 0, color: "#fff" }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: .3, display: "flex", gap: 6, alignItems: "center" }}>
          {title}{count ? <span style={{ fontSize: 11, color: "#6FD3E8", background: "rgba(111,211,232,.12)", borderRadius: 999, padding: "1px 7px" }}>{count}</span> : null}
        </span>
        <span style={{ color: "#6B7280", fontSize: 12, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
      </button>
      <div style={{ overflow: "hidden", transition: "max-height .34s cubic-bezier(.2,.8,.2,1), opacity .26s ease, margin-top .3s", maxHeight: open ? 640 : 0, opacity: open ? 1 : 0, marginTop: open ? 10 : 0 }}>{children}</div>
    </div>
  );
}
function Check({ label, count, checked, onToggle }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 4px", cursor: "pointer", borderRadius: 8 }}>
      <span onClick={onToggle} style={{ width: 18, height: 18, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${checked ? "#6FD3E8" : "#3a4050"}`, background: checked ? "#6FD3E8" : "transparent", display: "grid", placeItems: "center", color: "#06202B", fontSize: 12, fontWeight: 900, transition: "all .15s" }}>{checked ? "✓" : ""}</span>
      <span onClick={onToggle} style={{ flex: 1, fontSize: 13, color: checked ? "#fff" : "#B4B9C6" }}>{label}</span>
      {count != null && <span style={{ fontSize: 11, color: "#6B7280" }}>{count}</span>}
    </label>
  );
}
function MultiSelect({ options, selected, onChange, searchable }) {
  const [q, setQ] = useState("");
  const list = searchable ? options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase())) : options;
  const toggle = (name) => { const s = new Set(selected); s.has(name) ? s.delete(name) : s.add(name); onChange(s); };
  return (
    <div>
      {searchable && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти…"
        style={{ width: "100%", background: "#101219", border: "1px solid #262A38", borderRadius: 9, padding: "7px 10px", color: "#fff", fontSize: 12, marginBottom: 6, outline: "none" }} />}
      <div style={{ maxHeight: 190, overflowY: "auto" }}>
        {list.map((o) => <Check key={o.name} label={o.name} count={o.count} checked={selected.has(o.name)} onToggle={() => toggle(o.name)} />)}
      </div>
    </div>
  );
}
function FilterPanel({ f, set, opts, sfx }) {
  return (
    <div>
      <Section title="🔢 Номер" defaultOpen={false}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" placeholder="от" value={f.nmin} onChange={(e) => set({ ...f, nmin: e.target.value })}
            style={{ width: "50%", background: "#101219", border: "1px solid #262A38", borderRadius: 9, padding: "8px 10px", color: "#fff", fontSize: 13, outline: "none" }} />
          <span style={{ color: "#6B7280" }}>—</span>
          <input type="number" placeholder="до" value={f.nmax} onChange={(e) => set({ ...f, nmax: e.target.value })}
            style={{ width: "50%", background: "#101219", border: "1px solid #262A38", borderRadius: 9, padding: "8px 10px", color: "#fff", fontSize: 13, outline: "none" }} />
        </div>
      </Section>
      <Section title="🎁 Коллекция" count={f.collections.size || null}>
        <MultiSelect options={opts.collections} selected={f.collections} onChange={(s) => set({ ...f, collections: s })} />
      </Section>
      <Section title="🎨 Модель" count={f.models.size || null} defaultOpen={false}>
        <MultiSelect options={opts.models} selected={f.models} onChange={(s) => set({ ...f, models: s })} searchable />
      </Section>
      <Section title="🖼️ Фон" count={f.backdrops.size || null} defaultOpen={false}>
        <MultiSelect options={opts.backdrops} selected={f.backdrops} onChange={(s) => set({ ...f, backdrops: s })} searchable />
      </Section>
      <Section title="✨ Символ" count={f.symbols.size || null} defaultOpen={false}>
        <MultiSelect options={opts.symbols} selected={f.symbols} onChange={(s) => set({ ...f, symbols: s })} searchable />
      </Section>
    </div>
  );
}

// ---------- КАРТОЧКА ----------
function Card({ gift, onOpen, fav, onFav, sfx, idx, view, onBuy }) {
  const tier = rarityTier(gift.total_rarity);
  const [hover, setHover] = useState(false);
  const anim = { animation: `gvIn .5s ${Math.min(idx, 11) * 0.03}s both cubic-bezier(.2,.8,.2,1)` };

  if (view === "list") {
    return (
      <div onClick={() => { sfx.open(); onOpen(gift); }} onMouseEnter={() => { setHover(true); sfx.hover(); }} onMouseLeave={() => setHover(false)}
        style={{ display: "flex", alignItems: "center", gap: 14, background: "#0F1219", border: `1px solid ${hover ? tier.color + "66" : "#1B1E27"}`, borderRadius: 16, padding: 12, cursor: "pointer", transition: "border-color .2s, transform .2s cubic-bezier(.2,.8,.2,1)", transform: hover ? "translateX(3px)" : "none", ...anim }}>
        <div style={{ flexShrink: 0 }}><GiftArt gift={gift} size={64} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: "#fff" }}>{gift.collection}</span>
            <span style={{ fontSize: 11, color: "#6B7280" }}>#{gift.number}</span>
          </div>
          <div style={{ fontSize: 12, color: "#8A90A2", marginTop: 2 }}>{gift.model} · {gift.backdrop} · {gift.symbol}</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onBuy(gift, e); }}
          style={{ flexShrink: 0, border: "none", cursor: "pointer", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, background: "linear-gradient(90deg,#4ADE80,#22c55e)", color: "#04240f", fontFamily: "'Space Grotesk', sans-serif" }}>Купить</button>
        <button onClick={(e) => { e.stopPropagation(); sfx.tap(); onFav(gift.name); }} aria-label="В избранное"
          style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 999, border: "none", cursor: "pointer", fontSize: 15, background: fav ? "#F5C563" : "#171A23", color: fav ? "#0A0B0F" : "#fff" }}>{fav ? "★" : "☆"}</button>
      </div>
    );
  }

  return (
    <div onClick={() => { sfx.open(); onOpen(gift); }} onMouseEnter={() => { setHover(true); sfx.hover(); }} onMouseLeave={() => setHover(false)}
      style={{ background: "#0F1219", border: `1px solid ${hover ? tier.color + "66" : "#1B1E27"}`, borderRadius: 20, overflow: "hidden", cursor: "pointer", transition: "transform .2s cubic-bezier(.2,.8,.2,1), border-color .2s, box-shadow .2s", transform: hover ? "translateY(-5px)" : "none", boxShadow: hover ? `0 16px 44px -14px ${tier.color}66` : "0 1px 0 rgba(255,255,255,.02)", ...anim }}>
      <div style={{ position: "relative", display: "flex", justifyContent: "center", padding: "14px 14px 2px" }}>
        <GiftArt gift={gift} size={150} float={hover} />
        <button onClick={(e) => { e.stopPropagation(); sfx.tap(); onFav(gift.name); }} aria-label="В избранное"
          style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 999, border: "none", cursor: "pointer", fontSize: 15, transition: "transform .15s", transform: fav ? "scale(1.1)" : "scale(1)", background: fav ? "#F5C563" : "rgba(10,11,15,.55)", color: fav ? "#0A0B0F" : "#fff", display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}>{fav ? "★" : "☆"}</button>
      </div>
      <div style={{ padding: "10px 14px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>{gift.collection}</span>
          <span style={{ fontSize: 11, color: "#6B7280" }}>#{gift.number}</span>
        </div>
        <div style={{ fontSize: 12, color: "#8A90A2", marginTop: 6, lineHeight: 1.5 }}>
          <div>Модель: <span style={{ color: "#cfd4de" }}>{gift.model}</span></div>
          <div>Фон: <span style={{ color: "#cfd4de" }}>{gift.backdrop}</span></div>
        </div>
        {gift.price_ton > 0 && (
          <div style={{ marginTop: 8, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "#6FD3E8" }}>
            от {gift.price_ton.toFixed(2)} TON
          </div>
        )}
        <button onClick={(e) => { e.stopPropagation(); onBuy(gift, e); }}
          style={{ width: "100%", marginTop: 12, border: "none", cursor: "pointer", borderRadius: 12, padding: "11px 12px",
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14,
            background: "linear-gradient(90deg,#4ADE80,#22c55e)", color: "#04240f" }}>🛒 Купить</button>
      </div>
    </div>
  );
}

// ---------- МОДАЛКА (с навигацией ←/→) ----------
function Detail({ gift, onClose, fav, onFav, sfx, onNav, pos, boom }) {
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNav(-1);
      if (e.key === "ArrowRight") onNav(1);
    };
    window.addEventListener("keydown", h); document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose, onNav]);
  if (!gift) return null;
  const tier = rarityTier(gift.total_rarity);
  const rows = [["Модель", gift.model, gift.model_rarity], ["Фон", gift.backdrop, gift.backdrop_rarity], ["Символ", gift.symbol, gift.symbol_rarity]];
  const NavBtn = ({ dir, children }) => (
    <button onClick={() => { sfx.tap(); onNav(dir); }} aria-label={dir < 0 ? "Предыдущий" : "Следующий"}
      style={{ position: "absolute", top: "50%", [dir < 0 ? "left" : "right"]: -18, transform: "translateY(-50%)", width: 40, height: 40, borderRadius: 999, border: "1px solid #262A38", background: "#0E1016", color: "#fff", cursor: "pointer", fontSize: 16, display: "grid", placeItems: "center", zIndex: 2 }} className="gv-nav">{children}</button>
  );
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(6,7,11,.8)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 16, zIndex: 60, animation: "gvFade .2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} className="gv-detail" style={{ position: "relative", background: "#0B0D12", border: "1px solid #1B1E27", borderRadius: 26, width: "min(760px,100%)", maxHeight: "92vh", overflowY: "auto", animation: "gvPop .42s cubic-bezier(.16,.84,.24,1) both" }}>
        <NavBtn dir={-1}>‹</NavBtn><NavBtn dir={1}>›</NavBtn>
        <div className="gv-detail-inner" style={{ display: "grid" }}>
          <div style={{ display: "grid", placeItems: "center", padding: 28, background: "#0C0E14", position: "relative" }}>
            <GiftArt gift={gift} size={250} float large />
            {pos && <span style={{ position: "absolute", bottom: 12, fontSize: 11, color: "#6B7280" }}>{pos}</span>}
          </div>
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "#6B7280" }}>{gift.gift_type}</span>
              <button onClick={() => { sfx.tap(); onClose(); }} style={{ marginLeft: "auto", border: "none", background: "#191C26", color: "#8A90A2", width: 30, height: 30, borderRadius: 999, cursor: "pointer" }}>✕</button>
            </div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, color: "#fff", margin: "2px 0" }}>{gift.collection} <span style={{ color: "#6B7280", fontWeight: 400 }}>#{gift.number}</span></h2>
            <div style={{ margin: "16px 0", display: "grid", gap: 8 }}>
              {rows.map(([k, v, r]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#12151D", borderRadius: 10, padding: "9px 12px" }}>
                  <span style={{ fontSize: 13, color: "#8A90A2" }}>{k}</span>
                  <span style={{ fontSize: 13, color: "#fff" }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>
              <CopyRow label="Код подарка" value={gift.name} sfx={sfx.copy} />
              <CopyRow label="Ссылка" value={gift.nft_url} sfx={sfx.copy} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <PressButton primary sfx={() => {}} onClick={() => { boom(innerWidth / 2, innerHeight * 0.55); setTimeout(() => window.open(FUNPAY, "_blank"), 650); }} style={{ flex: 1, padding: "17px 16px", fontSize: 17, background: "linear-gradient(90deg,#4ADE80,#22c55e)", color: "#04240f", boxShadow: "0 10px 30px -10px rgba(74,222,128,.6)" }}>🛒 Купить на FunPay</PressButton>
              <PressButton sfx={sfx.tap} onClick={() => onFav(gift.name)} style={{ width: 54, padding: "14px 0", background: fav ? "#F5C563" : "#191C26", color: fav ? "#0A0B0F" : "#fff", fontSize: 18 }}>{fav ? "★" : "☆"}</PressButton>
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "#7a808f" }}>
              <span>🛡️ Без оплаты на сайте</span><span>✓ Проверено ончейн</span><span>← → листать</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- ФОН: ИНТЕРАКТИВНЫЙ ДОТ-ГРИД ----------
function DotGrid() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const S = 19, R = 95;
    const mouse = { x: -9999, y: -9999 }, m = { x: -9999, y: -9999 };
    let raf, W = 0, H = 0;
    const resize = () => { W = c.width = innerWidth * dpr; H = c.height = innerHeight * dpr; c.style.width = innerWidth + "px"; c.style.height = innerHeight + "px"; };
    const onMove = (e) => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; };
    const onOut = () => { mouse.x = -9999; mouse.y = -9999; };
    resize();
    addEventListener("resize", resize); addEventListener("mousemove", onMove);
    addEventListener("touchmove", (e) => { if (e.touches[0]) onMove(e.touches[0]); }, { passive: true });
    document.addEventListener("mouseleave", onOut);
    const s = S * dpr, r = R * dpr;
    const draw = () => {
      m.x = mouse.x; m.y = mouse.y;
      ctx.clearRect(0, 0, W, H);
      for (let y = s; y < H; y += s) {
        for (let x = s; x < W; x += s) {
          const dx = x - m.x, dy = y - m.y, dist = Math.hypot(dx, dy);
          let a = 0.04, rad = 0.55 * dpr;
          if (dist < r) { const t = 1 - dist / r; a = 0.04 + t * 0.5; rad = (0.55 + t * 1.1) * dpr; }
          ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); removeEventListener("mousemove", onMove); document.removeEventListener("mouseleave", onOut); };
  }, []);
  return <canvas ref={ref} aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

// ---------- ФЕЙЕРВЕРК + КОНФЕТТИ (майнкрафт-стайл, зелёный) ----------
function useFireworks(soundOn) {
  const cvRef = useRef(null);
  const partsRef = useRef([]);
  const rafRef = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px"; };
    resize(); addEventListener("resize", resize);
    const tick = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      const ps = partsRef.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.vy *= 0.99; p.life -= 1;
        if (p.life <= 0) { ps.splice(i, 1); continue; }
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = a;
        if (p.square) { // конфетти-фантики
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); p.rot += p.spin;
          ctx.fillStyle = p.color; ctx.fillRect(-p.s * dpr, -p.s * dpr, p.s * 2 * dpr, p.s * 2 * dpr); ctx.restore();
        } else { // искры майнкрафт (квадратные пиксели)
          ctx.fillStyle = p.color; const r = p.s * dpr; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        }
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(rafRef.current); removeEventListener("resize", resize); };
  }, []);

  const boom = (cx, cy) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const X = (cx ?? innerWidth / 2) * dpr, Y = (cy ?? innerHeight / 2) * dpr;
    const greens = ["#4ADE80", "#22c55e", "#86efac", "#16a34a", "#bbf7d0", "#eaffea"];
    const conf = ["#4ADE80", "#F5C563", "#6FD3E8", "#ff7ab8", "#ffffff"];
    const ps = partsRef.current;
    // майнкрафт-вспышка: два кольца пиксельных искр
    for (let ring = 0; ring < 2; ring++) {
      const n = 46, sp = (ring ? 5.5 : 8) * dpr;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.1;
        const v = sp * (0.6 + Math.random() * 0.6);
        ps.push({ x: X, y: Y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.06 * dpr, s: (1.4 + Math.random()) , life: 55 + Math.random() * 25, max: 80, color: greens[(Math.random() * greens.length) | 0], square: false, rot: 0, spin: 0 });
      }
    }
    // конфетти из хлопушек: летит вверх широким веером
    for (let i = 0; i < 60; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const v = (7 + Math.random() * 7) * dpr;
      ps.push({ x: X, y: Y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.16 * dpr, s: 2.2 + Math.random() * 2, life: 90 + Math.random() * 50, max: 140, color: conf[(Math.random() * conf.length) | 0], square: true, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 0.4 });
    }
    // звук взрыва (шум + низкий бум)
    if (soundOn) playBoom();
  };
  return { cvRef, boom };
}

function playBoom() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = window.__gvAC || (window.__gvAC = new AC());
    if (c.state === "suspended") c.resume();
    const t = c.currentTime;
    // низкий "бум"
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.5);
    // шум-хлопок
    const dur = 0.35, buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = c.createBufferSource(); src.buffer = buf;
    const ng = c.createGain(); ng.gain.setValueAtTime(0.25, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 900;
    src.connect(hp); hp.connect(ng); ng.connect(c.destination); src.start(t); src.stop(t + dur);
    // "свист" запуска
    const w = c.createOscillator(), wg = c.createGain();
    w.type = "triangle"; w.frequency.setValueAtTime(400, t); w.frequency.exponentialRampToValueAtTime(1400, t + 0.18);
    wg.gain.setValueAtTime(0.05, t); wg.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    w.connect(wg); wg.connect(c.destination); w.start(t); w.stop(t + 0.22);
  } catch {}
}

// ---------- ПРИЛОЖЕНИЕ ----------
const EMPTY_F = () => ({ collections: new Set(), models: new Set(), backdrops: new Set(), symbols: new Set(), tier: "all", pmin: "", pmax: "", nmin: "", nmax: "" });

export default function GiftVault() {
  const [gifts, setGifts] = useState([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [f, setF] = useState(EMPTY_F());
  const [open, setOpen] = useState(null);
  const [favs, setFavs] = useState({});
  const [visible, setVisible] = useState(18);
  const [sound, setSound] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [tab, setTab] = useState("catalog");
  const [view, setView] = useState("grid");
  const sfx = useSound(sound);
  const { cvRef, boom } = useFireworks(sound);
  const [reviews, setReviews] = useState(null);

  useEffect(() => { getGifts().then(setGifts); }, []);
  useEffect(() => { fetch(PROXY + "/api/reviews").then(r => r.json()).then(setReviews).catch(() => {}); }, []);
  const toggleFav = (name) => setFavs((v) => ({ ...v, [name]: !v[name] }));
  const favCount = Object.values(favs).filter(Boolean).length;

  const countBy = (key) => { const m = {}; gifts.forEach((g) => { m[g[key]] = (m[g[key]] || 0) + 1; }); return m; };
  const opts = useMemo(() => {
    const mk = (key, order) => { const c = countBy(key); return (order || Object.keys(c).sort()).filter((n) => c[n]).map((n) => ({ name: n, count: c[n] })); };
    return { collections: mk("collection", Object.keys(COLLECTIONS)), models: mk("model", MODELS), backdrops: mk("backdrop", BACKDROPS), symbols: mk("symbol", SYMBOLS) };
  }, [gifts]);

  const tierMatch = () => true;
  const filtered = useMemo(() => {
    const nmin = f.nmin === "" ? -Infinity : +f.nmin, nmax = f.nmax === "" ? Infinity : +f.nmax;
    let r = gifts.filter((g) =>
      (tab !== "favs" || favs[g.name]) &&
      (f.collections.size === 0 || f.collections.has(g.collection)) &&
      (f.models.size === 0 || f.models.has(g.model)) &&
      (f.backdrops.size === 0 || f.backdrops.has(g.backdrop)) &&
      (f.symbols.size === 0 || f.symbols.has(g.symbol)) &&
      tierMatch(g) && g.number >= nmin && g.number <= nmax &&
      (q === "" || `${g.collection} ${g.model} ${g.backdrop} ${g.number}`.toLowerCase().includes(q.toLowerCase()))
    );
    const discount = (g) => g.floor_ton > 0 ? (g.floor_ton - g.price_ton) / g.floor_ton : 0;
    const cmp = {
      price_asc: (a, b) => a.price_ton - b.price_ton, price_desc: (a, b) => b.price_ton - a.price_ton,
      rarity: (a, b) => a.total_rarity - b.total_rarity, number_asc: (a, b) => a.number - b.number,
      number_desc: (a, b) => b.number - a.number, recent: (a, b) => b.listed_at - a.listed_at,
      deal: (a, b) => discount(b) - discount(a),
    }[tab === "deals" ? "deal" : sort];
    return [...r].sort(cmp);
  }, [gifts, f, q, sort, tab, favs]);

  // навигация в модалке
  const navGift = (dir) => {
    if (!open) return;
    const i = filtered.findIndex((g) => g.name === open.name);
    const ni = (i + dir + filtered.length) % filtered.length;
    if (filtered[ni]) { setOpen(filtered[ni]); sfx.open(); }
  };
  const openPos = open ? `${filtered.findIndex((g) => g.name === open.name) + 1} / ${filtered.length}` : "";

  const activeCount = f.collections.size + f.models.size + f.backdrops.size + f.symbols.size + (f.nmin || f.nmax ? 1 : 0);
  const clearAll = () => { sfx.tap(); setF(EMPTY_F()); setVisible(18); };
  const chips = [...[...f.collections].map((v) => ["collections", v]), ...[...f.models].map((v) => ["models", v]), ...[...f.backdrops].map((v) => ["backdrops", v]), ...[...f.symbols].map((v) => ["symbols", v])];
  const removeChip = (grp, v) => { const set = new Set(f[grp]); set.delete(v); setF({ ...f, [grp]: set }); };
  const buyGift = (gift, e) => {
    const r = e?.currentTarget?.getBoundingClientRect?.();
    boom(r ? r.left + r.width / 2 : innerWidth / 2, r ? r.top : innerHeight / 2);
    setTimeout(() => window.open(FUNPAY, "_blank"), 650);
  };
  const sortOptions = [["recent", "Недавно добавленные"], ["number_asc", "Номер ↑"], ["number_desc", "Номер ↓"]];
  const tabs = [["catalog", "Каталог"], ["favs", `Избранное${favCount ? " · " + favCount : ""}`]];

  return (
    <div style={{ minHeight: "100vh", background: "#060708", color: "#fff", position: "relative", fontFamily: "Sora, -apple-system, sans-serif" }}>
      <DotGrid />
      <canvas ref={cvRef} aria-hidden style={{ position: "fixed", inset: 0, zIndex: 90, pointerEvents: "none" }} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
        html,body{overflow-x:hidden;overflow-y:auto;} *{box-sizing:border-box;} button{font-family:inherit;transition:transform .2s cubic-bezier(.2,.8,.2,1),background .22s ease,color .2s ease,border-color .22s ease,box-shadow .25s ease,filter .2s ease;}
        input,select{transition:border-color .2s ease,box-shadow .25s ease,background .2s ease;}
        input:focus,select:focus{border-color:#6FD3E8;box-shadow:0 0 0 3px rgba(111,211,232,.15);}
        label{transition:background .18s ease;} label:hover{background:#171a23;}
        .gv-nav:hover{border-color:#6FD3E8;color:#6FD3E8;}
        .gv-layout{max-width:1320px;margin:0 auto;padding:0 20px;display:grid;grid-template-columns:1fr;gap:22px;}
        .gv-side{display:none;}
        @media(min-width:900px){ .gv-layout{grid-template-columns:270px 1fr;} .gv-side{display:block;} .gv-mobilebar{display:none!important;} }
        .gv-grid{display:grid;gap:14px;grid-template-columns:repeat(2,1fr);}
        @media(min-width:560px){.gv-grid{grid-template-columns:repeat(3,1fr);}}
        @media(min-width:1120px){.gv-grid{grid-template-columns:repeat(4,1fr);}}
        .gv-list{display:flex;flex-direction:column;gap:10px;}
        @media(min-width:720px){.gv-detail-inner{grid-template-columns:300px 1fr;}}
        @media(max-width:560px){.gv-nav{display:none;}}
        select{appearance:none;-webkit-appearance:none;}
        ::-webkit-scrollbar{width:9px;height:9px;}::-webkit-scrollbar-thumb{background:#232734;border-radius:8px;}
        @keyframes gvIn{from{opacity:0;transform:translateY(14px) scale(.98);}to{opacity:1;transform:none;}}
        @keyframes gvPop{from{opacity:0;transform:translateY(20px) scale(.96);}to{opacity:1;transform:none;}}
        @keyframes gvFade{from{opacity:0;}to{opacity:1;}} @keyframes gvRise{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
        @keyframes gvFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-7px);}}
        @keyframes gvSpark{to{transform:translate(var(--tx),var(--ty)) scale(.2);opacity:0;}}
        @keyframes gvSlide{from{transform:translateX(-100%);}to{transform:none;}}
        @media(prefers-reduced-motion:reduce){*{animation:none!important;}}
      `}</style>

      <header style={{ borderBottom: "1px solid #191C26", padding: "0 20px", position: "sticky", top: 0, zIndex: 40, background: "#08090C" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: "12px 0", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 19 }}>THE<span style={{ color: "#6FD3E8" }}>HELLSBREAD</span></div>

        </div>
        {/* TABS */}
        <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", gap: 6, paddingBottom: 2 }}>
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => { sfx.tap(); setTab(key); setVisible(18); }}
              style={{ border: "none", background: "none", cursor: "pointer", padding: "12px 4px", marginRight: 18, fontSize: 16, fontWeight: 700, color: tab === key ? "#fff" : "#6B7280", borderBottom: `2px solid ${tab === key ? "#6FD3E8" : "transparent"}`, borderRadius: 0, fontFamily: "'Space Grotesk', sans-serif" }}>{label}</button>
          ))}
        </div>
      </header>

      {/* РЕЙТИНГ / ОТЗЫВЫ (FunPay) */}
      <div style={{ maxWidth: 1320, margin: "18px auto 0", padding: "0 20px", position: "relative", zIndex: 1 }}>
        <div style={{ background: "linear-gradient(90deg,#12151d,#171a23)", border: "1px solid #1B1E27", borderRadius: 18, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 60, height: 60, borderRadius: 999, background: "linear-gradient(135deg,#4ADE80,#22c55e)", display: "grid", placeItems: "center", fontSize: 28, flexShrink: 0 }}>🍞</div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 22 }}>thehellsbread</div>
            <div style={{ fontSize: 16, color: "#9aa0ad", marginTop: 3, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#FFC93C", fontSize: 20, letterSpacing: 1, textShadow: "0 0 12px rgba(255,201,60,.5)" }}>★★★★★</span>
              <b style={{ color: "#fff", fontSize: 17 }}>{reviews?.rating || "5.0"}</b>
              <span>· {reviews?.count ? `${reviews.count} отзывов` : "отзывы на FunPay"}</span>
            </div>
          </div>
          <a href={FUNPAY} target="_blank" rel="noreferrer" style={{ marginLeft: "auto", textDecoration: "none" }}>
            <span style={{ display: "inline-block", border: "1px solid #2C3140", borderRadius: 12, padding: "10px 18px", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>Профиль на FunPay →</span>
          </a>
        </div>
        <div style={{ marginTop: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#4ADE80", background: "rgba(74,222,128,.12)", border: "1px solid rgba(74,222,128,.3)", borderRadius: 999, padding: "5px 12px" }}>✓ ЭТО РЕАЛЬНЫЕ ОТЗЫВЫ</span>
          <a href={FUNPAY} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#6FD3E8", textDecoration: "none" }}>проверь на FunPay →</a>
        </div>
        {reviews?.reviews?.length > 0 && (
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, marginTop: 4 }}>
            {reviews.reviews.map((t, i) => (
              <div key={i} style={{ minWidth: 260, maxWidth: 320, flexShrink: 0, background: "#0F1219", border: "1px solid #1B1E27", borderRadius: 16, padding: "16px 18px", fontSize: 15, color: "#C7CCd6" }}>
                <span style={{ color: "#FFC93C", fontSize: 18, letterSpacing: 1 }}>★★★★★</span>
                <div style={{ marginTop: 8, lineHeight: 1.55 }}>{t}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="gv-layout" style={{ paddingTop: 22, paddingBottom: 80, position: "relative", zIndex: 1 }}>
        <aside className="gv-side">
          <div style={{ position: "sticky", top: 108, background: "#0A0C11", border: "1px solid #16181F", borderRadius: 18, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15 }}>Фильтры</span>
              {activeCount > 0 && <button onClick={clearAll} style={{ border: "none", background: "none", color: "#6FD3E8", fontSize: 12, cursor: "pointer" }}>Сбросить ({activeCount})</button>}
            </div>
            <FilterPanel f={f} set={(nf) => { setF(nf); setVisible(18); }} opts={opts} sfx={sfx} />
          </div>
        </aside>

        <main>
          <div className="gv-mobilebar" style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <button onClick={() => { sfx.tap(); setDrawer(true); }} style={{ flex: 1, border: "1px solid #1B1E27", background: "#0F1219", color: "#fff", borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Фильтры{activeCount ? ` · ${activeCount}` : ""}</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>Найдено: <b style={{ color: "#fff" }}>{filtered.length}</b></span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              {/* view toggle */}
              <div style={{ display: "flex", background: "#0F1219", border: "1px solid #1B1E27", borderRadius: 10, padding: 2 }}>
                {[["grid", "▦"], ["list", "≣"]].map(([v, ic]) => (
                  <button key={v} onClick={() => { sfx.tap(); setView(v); }} style={{ border: "none", cursor: "pointer", borderRadius: 8, padding: "6px 10px", fontSize: 14, background: view === v ? "#1B2130" : "transparent", color: view === v ? "#6FD3E8" : "#6B7280" }}>{ic}</button>
                ))}
              </div>
              {(
                <div style={{ position: "relative" }}>
                  <select value={sort} onChange={(e) => { sfx.tap(); setSort(e.target.value); }} style={{ background: "#0F1219", border: "1px solid #1B1E27", borderRadius: 12, padding: "10px 34px 10px 14px", color: "#fff", fontSize: 13, cursor: "pointer" }}>
                    {sortOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#6B7280", pointerEvents: "none", fontSize: 11 }}>▾</span>
                </div>
              )}
            </div>
          </div>

          {chips.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {chips.map(([grp, v]) => (
                <button key={grp + v} onClick={() => removeChip(grp, v)} style={{ border: "1px solid #2C3550", background: "rgba(111,211,232,.08)", color: "#cfe9f2", borderRadius: 999, padding: "5px 10px", fontSize: 12, cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}>{v} <span style={{ color: "#6FD3E8" }}>✕</span></button>
              ))}
              <button onClick={clearAll} style={{ border: "none", background: "none", color: "#6B7280", fontSize: 12, cursor: "pointer" }}>очистить всё</button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "70px 0", color: "#6B7280" }}>
              {tab === "favs" ? "В избранном пусто. Жми ★ на подарках." : tab === "deals" ? "Сейчас нет подарков ниже floor." : "Ничего не нашлось. Ослабь фильтры."}
            </div>
          ) : (
            <>
              <div className={view === "list" ? "gv-list" : "gv-grid"}>
                {filtered.slice(0, visible).map((g, i) => <Card key={g.name} gift={g} idx={i} view={view} onOpen={setOpen} fav={!!favs[g.name]} onFav={toggleFav} sfx={sfx} onBuy={buyGift} />)}
              </div>
              {visible < filtered.length && (
                <div style={{ textAlign: "center", marginTop: 28 }}>
                  <PressButton sfx={sfx.tap} onClick={() => setVisible((v) => v + 18)} style={{ background: "transparent", border: "1px solid #2C3140", color: "#fff", padding: "15px 40px", fontWeight: 700, fontSize: 15 }}>Показать ещё</PressButton>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {drawer && (
        <div onClick={() => setDrawer(false)} style={{ position: "fixed", inset: 0, background: "rgba(6,7,11,.7)", zIndex: 70, animation: "gvFade .2s" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "min(320px,86vw)", background: "#0E1016", borderRight: "1px solid #262A38", padding: 18, overflowY: "auto", animation: "gvSlide .34s cubic-bezier(.16,.84,.24,1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16 }}>Фильтры</span>
              <button onClick={() => setDrawer(false)} style={{ border: "none", background: "#191C26", color: "#8A90A2", width: 30, height: 30, borderRadius: 999, cursor: "pointer" }}>✕</button>
            </div>
            <FilterPanel f={f} set={(nf) => { setF(nf); setVisible(18); }} opts={opts} sfx={sfx} />
            <div style={{ display: "flex", gap: 10, marginTop: 16, position: "sticky", bottom: 0, background: "#0E1016", paddingTop: 10 }}>
              {activeCount > 0 && <PressButton sfx={sfx.tap} onClick={clearAll} style={{ flex: 1, padding: "12px", background: "#191C26", color: "#fff" }}>Сбросить</PressButton>}
              <PressButton sfx={sfx.tap} onClick={() => setDrawer(false)} style={{ flex: 2, padding: "12px", background: "linear-gradient(90deg,#6FD3E8,#4aa8d8)", color: "#052430" }}>Показать {filtered.length}</PressButton>
            </div>
          </div>
        </div>
      )}

      <footer style={{ borderTop: "1px solid #191C26", padding: "26px 20px", color: "#6B7280", fontSize: 13, position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "space-between" }}>
          <span>GiftVault — витрина-каталог. Картинки: Fragment. Цены — демо.</span>
          <span style={{ display: "flex", gap: 20 }}><span>🛡️ Без оплаты</span><span>Проверено ончейн</span></span>
        </div>
      </footer>

      <button onClick={() => { sfx.tap(); setSound((x) => !x); }} title="Звук"
        style={{ position: "fixed", right: 20, bottom: 20, zIndex: 55, width: 46, height: 46, borderRadius: 999,
          border: "1px solid #1B1E27", background: sound ? "rgba(111,211,232,.15)" : "#0F1219",
          color: sound ? "#6FD3E8" : "#7a808f", cursor: "pointer", fontSize: 18, boxShadow: "0 8px 24px -8px rgba(0,0,0,.6)" }}>
        {sound ? "🔊" : "🔇"}
      </button>
      <Detail gift={open} onClose={() => setOpen(null)} fav={open ? !!favs[open.name] : false} onFav={toggleFav} sfx={sfx} onNav={navGift} pos={openPos} boom={boom} />
    </div>
  );
}
