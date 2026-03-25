/**
 * ARN AI - Full-Stack SaaS Frontend
 * Stack: React + Tailwind (inline styles for portability)
 * Views: Login, Register, Dashboard, Admin
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000";
const COLORS = {
  bg: "#050505",
  surface: "#0d0d0d",
  border: "#1a1a1a",
  red: "#ff0033",
  redDim: "#cc0028",
  redGlow: "rgba(255,0,51,0.15)",
  redGlow2: "rgba(255,0,51,0.05)",
  text: "#e8e8e8",
  textDim: "#666",
  green: "#00ff41",
  yellow: "#ffcc00",
};

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────
const MOCK_THREATS = [
  { id: 1, level: "KRİTİK", msg: "CVE-2025-0432 · Apache HTTP Server RCE", time: "00:12", country: "CN" },
  { id: 2, level: "YÜKSƏK", msg: "CVE-2025-1187 · OpenSSL Buffer Overflow", time: "00:34", country: "RU" },
  { id: 3, level: "ORTA",   msg: "CVE-2025-2291 · WordPress SQLi Plugin", time: "01:02", country: "BR" },
  { id: 4, level: "KRİTİK", msg: "CVE-2025-3314 · Linux Kernel Priv-Esc", time: "01:45", country: "IR" },
  { id: 5, level: "YÜKSƏK", msg: "CVE-2025-4007 · Fortinet Auth Bypass",  time: "02:11", country: "KP" },
  { id: 6, level: "ORTA",   msg: "CVE-2025-4489 · Node.js Prototype Pollution", time: "02:33", country: "US" },
];

const MOCK_USERS = [
  { id: 1, username: "m_safarov",   email: "m@aztu.edu.az", plan: "PRO",  status: "aktiv",   reqs: 142 },
  { id: 2, username: "r_bekiyev",   email: "r@mail.az",     plan: "MAX",  status: "aktiv",   reqs: 399 },
  { id: 3, username: "test_user_1", email: "t1@mail.az",    plan: "FREE", status: "aktiv",   reqs: 3   },
  { id: 4, username: "hacker_x",    email: "hx@dark.az",    plan: "FREE", status: "banlı",   reqs: 0   },
  { id: 5, username: "aytac_h",     email: "a@aztu.edu.az", plan: "PRO",  status: "aktiv",   reqs: 87  },
];

const INITIAL_HISTORY = [
  {
    id: "h1",
    title: "Nmap Skan Analizi",
    tool: "Port Skaner",
    date: "Bugün",
    msgs: [
      { role: "user", content: "192.168.1.0/24 şəbəkəsini skan et və nəticəni analiz et." },
      {
        role: "assistant",
        content: `## Nmap Skan Nəticəsi

**Hədəf:** \`192.168.1.0/24\`
**Metod:** SYN Stealth (-sS)

\`\`\`
Host: 192.168.1.1   Ports: 22/open/tcp, 80/open/tcp, 443/open/tcp
Host: 192.168.1.10  Ports: 3306/open/tcp, 8080/open/tcp
Host: 192.168.1.15  Ports: 21/open/tcp, 23/open/tcp
\`\`\`

| Host | Port | Servis | Risk |
|------|------|--------|------|
| .1   | 22   | SSH    | Orta |
| .10  | 3306 | MySQL  | Yüksək |
| .15  | 23   | Telnet | **KRİTİK** |

> ⚠️ **XƏBƏRDARLIQ:** Telnet (port 23) şifrəsiz protokoldur. Dərhal bağlanmalıdır.`,
      },
    ],
  },
];

const TOOLS = [
  { id: "chat",    label: "AI Pentest Köməkçisi", icon: "◈" },
  { id: "payload", label: "Payload Generator",    icon: "⬡" },
  { id: "portscan",label: "Port Skaner Analizi",  icon: "◎" },
  { id: "webex",   label: "Web Exploit Helper",   icon: "⬢" },
];

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  // Layout
  app:     { background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "'Share Tech Mono', monospace", position: "relative", overflow: "hidden" },
  scanline: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9999, background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)" },
  // Buttons
  btnRed:  { background: COLORS.red, color: "#fff", border: "none", padding: "10px 24px", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", transition: "all 0.2s", boxShadow: `0 0 20px ${COLORS.redGlow}` },
  btnGhost:{ background: "transparent", color: COLORS.red, border: `1px solid ${COLORS.red}`, padding: "8px 18px", cursor: "pointer", fontFamily: "inherit", fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase", transition: "all 0.2s" },
  btnDark: { background: "#111", color: COLORS.text, border: `1px solid ${COLORS.border}`, padding: "8px 16px", cursor: "pointer", fontFamily: "inherit", fontSize: "12px", letterSpacing: "1px", transition: "all 0.2s" },
  // Inputs
  input:   { background: "#0a0a0a", border: `1px solid #222`, borderBottom: `1px solid ${COLORS.red}`, color: COLORS.text, padding: "12px 16px", fontFamily: "inherit", fontSize: "13px", outline: "none", width: "100%", transition: "border-color 0.2s", boxSizing: "border-box" },
  // Cards
  card:    { background: COLORS.surface, border: `1px solid ${COLORS.border}`, padding: "20px" },
  cardRed: { background: COLORS.surface, border: `1px solid ${COLORS.red}`, padding: "20px", boxShadow: `0 0 30px ${COLORS.redGlow2}` },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function glowText(text) {
  return <span style={{ color: COLORS.red, textShadow: `0 0 10px ${COLORS.red}` }}>{text}</span>;
}

function levelColor(level) {
  if (level === "KRİTİK") return COLORS.red;
  if (level === "YÜKSƏK") return COLORS.yellow;
  return "#888";
}

function planColor(plan) {
  if (plan === "MAX") return COLORS.red;
  if (plan === "PRO") return COLORS.yellow;
  return COLORS.textDim;
}

// ─── LOGO COMPONENT ───────────────────────────────────────────────────────────
function ArnLogo({ size = 32, showTag = true }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        className="arn-glitch"
        style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: size,
          fontWeight: 900,
          color: COLORS.red,
          textShadow: `0 0 20px ${COLORS.red}, 0 0 40px ${COLORS.redGlow}`,
          letterSpacing: 4,
          userSelect: "none",
        }}
        data-text="ARN"
      >
        ARN
      </span>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: size * 0.45, color: COLORS.text, letterSpacing: 3, fontWeight: 700 }}>AI</span>
        {showTag && <span style={{ fontSize: 9, color: COLORS.redDim, letterSpacing: 2, marginTop: 2 }}>PENTEST ENGINE</span>}
      </div>
    </div>
  );
}

// ─── MARKDOWN RENDERER ────────────────────────────────────────────────────────
function MdBlock({ content, onRunSim }) {
  const lines = content.split("\n");
  const elements = [];
  let inCode = false, codeLines = [], codeLang = "";
  let inTable = false, tableRows = [];

  const flushTable = (key) => {
    if (tableRows.length < 2) return;
    const headers = tableRows[0].split("|").map(h => h.trim()).filter(Boolean);
    const body = tableRows.slice(2);
    elements.push(
      <div key={key} style={{ overflowX: "auto", margin: "12px 0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>{headers.map((h, i) => <th key={i} style={{ border: `1px solid #222`, padding: "8px 12px", color: COLORS.red, textAlign: "left", background: "#0d0d0d" }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {body.map((row, ri) => {
              const cells = row.split("|").map(c => c.trim()).filter(Boolean);
              return <tr key={ri}>{cells.map((c, ci) => <td key={ci} style={{ border: `1px solid #1a1a1a`, padding: "6px 12px", color: COLORS.text, background: ri % 2 === 0 ? "#080808" : "#0b0b0b" }}>{c.includes("**") ? <strong style={{ color: COLORS.red }}>{c.replace(/\*\*/g, "") }</strong> : c}</td>)}</tr>;
            })}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (!inCode) {
        inCode = true; codeLang = line.slice(3); codeLines = [];
      } else {
        const codeStr = codeLines.join("\n");
        elements.push(<CodeBlock key={i} code={codeStr} lang={codeLang} onRunSim={onRunSim} />);
        inCode = false; codeLines = []; codeLang = "";
      }
      return;
    }
    if (inCode) { codeLines.push(line); return; }

    if (line.startsWith("|")) {
      if (!inTable) inTable = true;
      tableRows.push(line);
      if (i === lines.length - 1 || !lines[i + 1]?.startsWith("|")) flushTable(`tbl-${i}`);
      return;
    } else if (inTable) flushTable(`tbl-${i}`);

    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} style={{ color: COLORS.red, fontSize: 14, fontWeight: 700, margin: "16px 0 8px", letterSpacing: 2, borderBottom: `1px solid #1a1a1a`, paddingBottom: 6 }}>{line.slice(3)}</h2>);
    } else if (line.startsWith("> ")) {
      elements.push(<div key={i} style={{ borderLeft: `3px solid ${COLORS.red}`, paddingLeft: 12, margin: "8px 0", color: COLORS.yellow, fontSize: 12 }}>{line.slice(2)}</div>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(<div key={i} style={{ color: COLORS.red, fontWeight: 700, margin: "4px 0", fontSize: 13 }}>{line.replace(/\*\*/g, "")}</div>);
    } else if (line.trim() === "") {
      elements.push(<br key={i} />);
    } else {
      const rendered = line.replace(/`([^`]+)`/g, (_, c) => `<code style="background:#111;color:#ff0033;padding:2px 6px;font-family:inherit;font-size:11px;">${c}</code>`).replace(/\*\*([^*]+)\*\*/g, (_, t) => `<strong style="color:#ff0033">${t}</strong>`);
      elements.push(<p key={i} style={{ margin: "4px 0", fontSize: 13, lineHeight: 1.8, color: COLORS.text }} dangerouslySetInnerHTML={{ __html: rendered }} />);
    }
  });

  return <div>{elements}</div>;
}

function CodeBlock({ code, lang, onRunSim }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div style={{ margin: "12px 0", border: `1px solid #1e1e1e`, background: "#080808" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", borderBottom: "1px solid #1a1a1a", background: "#0c0c0c" }}>
        <span style={{ fontSize: 10, color: COLORS.redDim, letterSpacing: 2 }}>{lang || "CODE"}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onRunSim(code)} style={{ ...S.btnGhost, padding: "3px 10px", fontSize: 10 }}>▶ SİMULYASİYA</button>
          <button onClick={copy} style={{ ...S.btnDark, padding: "3px 10px", fontSize: 10 }}>{copied ? "✓ KOPYALANDl" : "⎘ KOPYALA"}</button>
        </div>
      </div>
      <pre style={{ margin: 0, padding: "14px 16px", fontSize: 12, lineHeight: 1.6, overflowX: "auto", color: "#ccc", whiteSpace: "pre-wrap" }}><code>{code}</code></pre>
    </div>
  );
}

// ─── SIMULATION MODAL ─────────────────────────────────────────────────────────
function SimModal({ code, onClose }) {
  const [output, setOutput] = useState([]);
  const [running, setRunning] = useState(true);
  useEffect(() => {
    const lines = [
      "[ARN-SIM] Sandbox mühiti başladılır...",
      "[ARN-SIM] İzolasiya konteyner aktiv...",
      "[ARN-SIM] Kod sətirləri ayrışdırılır...",
      ...code.split("\n").slice(0, 4).map((l, i) => `[EXEC ${i + 1}] ${l}`),
      "[ARN-SIM] Proses tamamlandı.",
      "[ARN-SIM] Nəticə: Simulyasiya uğurla başa çatdı. Real icra edilmədi.",
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i < lines.length) { setOutput(p => [...p, lines[i]]); i++; }
      else { setRunning(false); clearInterval(iv); }
    }, 180);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ ...S.cardRed, width: 600, maxWidth: "95vw" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ color: COLORS.red, letterSpacing: 2, fontSize: 13 }}>◈ SANDBOX SİMULYASİYASI</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ background: "#030303", border: "1px solid #111", padding: 16, minHeight: 200, fontFamily: "monospace", fontSize: 12, lineHeight: 1.8 }}>
          {output.map((l, i) => <div key={i} style={{ color: l.includes("uğurla") ? COLORS.green : l.includes("KRİTİK") ? COLORS.red : "#aaa" }}>{l}</div>)}
          {running && <span style={{ color: COLORS.red, animation: "blink 1s infinite" }}>█</span>}
        </div>
      </div>
    </div>
  );
}

// ─── UPGRADE MODAL ────────────────────────────────────────────────────────────
function UpgradeModal({ onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ ...S.cardRed, width: 480, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⬡</div>
        <h2 style={{ color: COLORS.red, letterSpacing: 3, marginBottom: 8 }}>LİMİT AŞILDI</h2>
        <p style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 24 }}>Pulsuz planda gündə 3 sorğu limitinə çatdınız.</p>
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {[{ p: "PRO", price: "₼19/ay", feats: ["Limitsiz sorğu", "Prioritet cavab", "Bütün alətlər"] }, { p: "MAX", price: "₼49/ay", feats: ["PRO + hamısı", "API girişi", "Şəxsi agent"] }].map(pl => (
            <div key={pl.p} style={{ flex: 1, border: `1px solid ${pl.p === "MAX" ? COLORS.red : "#333"}`, padding: 16, background: "#0a0a0a" }}>
              <div style={{ color: planColor(pl.p), fontWeight: 700, fontSize: 18, letterSpacing: 2 }}>{pl.p}</div>
              <div style={{ color: COLORS.text, fontSize: 20, margin: "8px 0" }}>{pl.price}</div>
              {pl.feats.map(f => <div key={f} style={{ color: "#888", fontSize: 11, margin: "4px 0" }}>✓ {f}</div>)}
              <button style={{ ...S.btnRed, width: "100%", marginTop: 12, fontSize: 11 }}>SEÇ</button>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ color: COLORS.textDim, background: "none", border: "none", cursor: "pointer", fontSize: 12, letterSpacing: 1 }}>Pulsuz davam et →</button>
      </div>
    </div>
  );
}

// ─── RIGHT PANEL ──────────────────────────────────────────────────────────────
function RightPanel({ user }) {
  const [threats, setThreats] = useState(MOCK_THREATS);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(iv);
  }, []);
  const latency = 42 + Math.floor(Math.sin(tick) * 8);
  return (
    <div style={{ width: 280, minWidth: 280, borderLeft: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", background: COLORS.surface, overflow: "hidden" }}>
      {/* Plan Stats */}
      <div style={{ padding: 16, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ fontSize: 10, color: COLORS.redDim, letterSpacing: 3, marginBottom: 12 }}>◈ İSTİFADƏÇİ PANELİ</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: COLORS.textDim }}>Plan</span>
          <span style={{ fontSize: 12, color: planColor(user.plan), fontWeight: 700 }}>{user.plan}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: COLORS.textDim }}>Sorğular</span>
          <span style={{ fontSize: 12, color: COLORS.text }}>{user.plan === "FREE" ? `${user.reqsToday}/3` : "∞"}</span>
        </div>
        {user.plan === "FREE" && (
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 3, background: "#111", borderRadius: 0 }}>
              <div style={{ height: "100%", width: `${(user.reqsToday / 3) * 100}%`, background: COLORS.red, transition: "width 0.3s" }} />
            </div>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
          <span style={{ fontSize: 12, color: COLORS.textDim }}>API Gecikmə</span>
          <span style={{ fontSize: 12, color: latency > 50 ? COLORS.yellow : COLORS.green }}>{latency}ms</span>
        </div>
      </div>

      {/* Live Threats */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 16px 8px", borderBottom: `1px solid ${COLORS.border}` }}>
          <span style={{ fontSize: 10, color: COLORS.redDim, letterSpacing: 3 }}>◈ CƏMİ TƏHDIDLƏR (LİVE)</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {threats.map((t, i) => (
            <div key={t.id} style={{ padding: "8px 16px", borderBottom: `1px solid #0f0f0f`, cursor: "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 9, color: levelColor(t.level), letterSpacing: 1, fontWeight: 700 }}>{t.level}</span>
                <span style={{ fontSize: 9, color: COLORS.textDim }}>{t.country} · {t.time}</span>
              </div>
              <div style={{ fontSize: 11, color: "#bbb", lineHeight: 1.4 }}>{t.msg}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CVE Ticker */}
      <div style={{ padding: 12, borderTop: `1px solid ${COLORS.border}`, background: "#080808" }}>
        <div style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: 2, marginBottom: 6 }}>NVD CVE AXINI</div>
        <div style={{ overflow: "hidden" }}>
          <div className="cve-scroll" style={{ fontSize: 10, color: COLORS.redDim, whiteSpace: "nowrap" }}>
            CVE-2025-0432 · CVE-2025-1187 · CVE-2025-2291 · CVE-2025-3314 · CVE-2025-4007 · CVE-2025-4489 ·
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CHAT WINDOW ──────────────────────────────────────────────────────────────
function ChatWindow({ messages, onSend, loading, plan, reqsToday }) {
  const [input, setInput] = useState("");
  const [simCode, setSimCode] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim()) return;
    if (plan === "FREE" && reqsToday >= 3) { setShowUpgrade(true); return; }
    onSend(input.trim());
    setInput("");
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {simCode && <SimModal code={simCode} onClose={() => setSimCode(null)} />}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "15vh" }}>
            <ArnLogo size={48} />
            <p style={{ color: COLORS.textDim, fontSize: 13, marginTop: 20, letterSpacing: 1 }}>Sorğunuzu yazın. Red Team kömək etməyə hazırdır.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
              {["SQL injection test et", "XSS payload yaz", "Nmap skan izah et", "CVE-2025-0432 analiz et"].map(q => (
                <button key={q} onClick={() => { onSend(q); }} style={{ ...S.btnGhost, fontSize: 11, padding: "6px 14px" }}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 20, display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 5, letterSpacing: 1 }}>
              {msg.role === "user" ? "SİZ" : "◈ ARN AI"}
            </div>
            <div style={{
              maxWidth: "88%",
              background: msg.role === "user" ? "#0f0f0f" : COLORS.surface,
              border: `1px solid ${msg.role === "user" ? "#222" : COLORS.border}`,
              padding: "14px 18px",
              borderLeft: msg.role === "assistant" ? `3px solid ${COLORS.red}` : "none",
            }}>
              {msg.role === "assistant"
                ? <MdBlock content={msg.content} onRunSim={setSimCode} />
                : <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7 }}>{msg.content}</p>}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: COLORS.textDim, fontSize: 12 }}>
            <span style={{ color: COLORS.red }}>◈ ARN AI</span>
            <span className="typing-dots">analizə başlanır</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div style={{ padding: "16px 24px", borderTop: `1px solid ${COLORS.border}`, background: "#080808" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Sorğunuzu daxil edin... (Shift+Enter = yeni sətir)"
            rows={2}
            style={{ ...S.input, resize: "none", flex: 1, borderBottom: `1px solid ${input ? COLORS.red : "#333"}` }}
          />
          <button onClick={handleSend} style={{ ...S.btnRed, padding: "16px 24px", whiteSpace: "nowrap" }}>
            ▶ GÖNDƏR
          </button>
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 16 }}>
          <span style={{ fontSize: 10, color: COLORS.textDim }}>↵ Enter = Göndər  ·  Shift+↵ = Yeni sətir</span>
          {plan === "FREE" && <span style={{ fontSize: 10, color: reqsToday >= 2 ? COLORS.red : COLORS.textDim }}>Gündəlik: {reqsToday}/3 sorğu</span>}
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ history, activeTool, setActiveTool, activeHistory, setActiveHistory, onNewChat, user, onLogout, isAdmin, setView }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ width: collapsed ? 56 : 240, minWidth: collapsed ? 56 : 240, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", background: COLORS.surface, transition: "width 0.2s", overflow: "hidden" }}>
      {/* Logo */}
      <div style={{ padding: "18px 16px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {!collapsed && <ArnLogo size={22} />}
        <button onClick={() => setCollapsed(c => !c)} style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 16, marginLeft: "auto" }}>{collapsed ? "▶" : "◀"}</button>
      </div>

      {/* Tools */}
      {!collapsed && (
        <div style={{ padding: "12px 0", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ padding: "4px 16px 8px", fontSize: 9, color: COLORS.textDim, letterSpacing: 3 }}>ALƏTLƏR</div>
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setActiveTool(t.id)} style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", padding: "9px 16px", background: activeTool === t.id ? `${COLORS.redGlow}` : "none", border: "none", borderLeft: activeTool === t.id ? `2px solid ${COLORS.red}` : "2px solid transparent", color: activeTool === t.id ? COLORS.red : COLORS.textDim, cursor: "pointer", fontFamily: "inherit", fontSize: 12, textAlign: "left", transition: "all 0.15s" }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* New Chat */}
      {!collapsed && (
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
          <button onClick={onNewChat} style={{ ...S.btnGhost, width: "100%", fontSize: 11 }}>+ YENİ SÖHBƏT</button>
        </div>
      )}

      {/* History */}
      {!collapsed && (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          <div style={{ padding: "4px 16px 8px", fontSize: 9, color: COLORS.textDim, letterSpacing: 3 }}>TARIXÇƏ</div>
          {history.map(h => (
            <button key={h.id} onClick={() => setActiveHistory(h.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 16px", background: activeHistory === h.id ? "#111" : "none", border: "none", borderLeft: activeHistory === h.id ? `2px solid ${COLORS.red}` : "2px solid transparent", color: activeHistory === h.id ? COLORS.text : COLORS.textDim, cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
              <div style={{ fontSize: 11, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.title}</div>
              <div style={{ fontSize: 9, color: COLORS.textDim }}>{h.date} · {h.tool}</div>
            </button>
          ))}
        </div>
      )}

      {/* Bottom */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.border}` }}>
        {!collapsed && (
          <>
            <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 4 }}>{user.username}</div>
            <div style={{ fontSize: 10, color: planColor(user.plan), marginBottom: 10 }}>{user.plan} PLAN</div>
          </>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          {!collapsed && isAdmin && <button onClick={() => setView("admin")} style={{ ...S.btnGhost, fontSize: 10, padding: "5px 10px", flex: 1 }}>ADMIN</button>}
          <button onClick={onLogout} style={{ ...S.btnDark, fontSize: 10, padding: "5px 10px", flex: 1 }}>ÇIXIŞ</button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, setUser, setView }) {
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [activeHistory, setActiveHistory] = useState(null);
  const [activeTool, setActiveTool] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reqsToday, setReqsToday] = useState(user.reqsToday || 0);

  const currentMsgs = activeHistory ? (history.find(h => h.id === activeHistory)?.msgs || []) : messages;

  const handleSend = useCallback(async (text) => {
    const newMsg = { role: "user", content: text };
    if (activeHistory) {
      setHistory(prev => prev.map(h => h.id === activeHistory ? { ...h, msgs: [...h.msgs, newMsg] } : h));
    } else {
      setMessages(prev => [...prev, newMsg]);
    }
    setLoading(true);
    setReqsToday(r => r + 1);

    // Mock AI response
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 600));
    const aiResp = generateMockResponse(text, activeTool);
    const aiMsg = { role: "assistant", content: aiResp };
    if (activeHistory) {
      setHistory(prev => prev.map(h => h.id === activeHistory ? { ...h, msgs: [...h.msgs, aiMsg] } : h));
    } else {
      setMessages(prev => [...prev, aiMsg]);
      if (messages.length === 0) {
        const newH = { id: `h${Date.now()}`, title: text.slice(0, 28) + "...", tool: TOOLS.find(t => t.id === activeTool)?.label || "Chat", date: "İndi", msgs: [newMsg, aiMsg] };
        setHistory(prev => [newH, ...prev]);
        setMessages([]);
        setActiveHistory(newH.id);
      }
    }
    setLoading(false);
  }, [activeHistory, activeTool, messages]);

  const newChat = () => { setActiveHistory(null); setMessages([]); };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <Sidebar
        history={history} activeTool={activeTool} setActiveTool={t => { setActiveTool(t); newChat(); }}
        activeHistory={activeHistory} setActiveHistory={setActiveHistory}
        onNewChat={newChat} user={{ ...user, reqsToday }}
        onLogout={() => setView("login")}
        isAdmin={user.isAdmin} setView={setView}
      />
      {/* Tool header + Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 12, background: "#080808" }}>
          <span style={{ color: COLORS.red }}>◈</span>
          <span style={{ fontSize: 13, color: COLORS.text, letterSpacing: 1 }}>{TOOLS.find(t => t.id === activeTool)?.label}</span>
          <span style={{ fontSize: 10, color: COLORS.textDim, marginLeft: "auto", letterSpacing: 1 }}>AZTU SEC-LAB · AES-256 ŞİFRƏLİ</span>
        </div>
        <ChatWindow
          messages={currentMsgs} onSend={handleSend} loading={loading}
          plan={user.plan} reqsToday={reqsToday}
        />
      </div>
      <RightPanel user={{ ...user, reqsToday }} />
    </div>
  );
}

// ─── MOCK AI RESPONSE ─────────────────────────────────────────────────────────
function generateMockResponse(input, tool) {
  const lower = input.toLowerCase();
  if (lower.includes("sql") || lower.includes("injection")) {
    return `## SQL Injection Analizi

**Hədəf parametr:** \`id\`, \`user\`, \`search\`

\`\`\`sql
-- Əsas test yükü
' OR '1'='1
' OR 1=1--
' UNION SELECT null,null,null--

-- Məlumat çıxarma
' UNION SELECT username,password,3 FROM users--
\`\`\`

| Test | Nəticə | Risk |
|------|--------|------|
| Boolean-based | Cavab dəyişdi | **KRİTİK** |
| Time-based | 5s gecikmə | Yüksək |
| Error-based | MySQL xətası | Yüksək |

> ⚠️ **XƏBƏRDARLIQ:** Bu testlər yalnız icazəli sistemlərdə aparılmalıdır. Məsuliyyət istifadəçinin üzərinədir.

**Müdafiə:** Prepared statements, input validation, WAF istifadə edin.`;
  }
  if (lower.includes("xss")) {
    return `## XSS Payload Analizi

**Növlər:** Reflected, Stored, DOM-based

\`\`\`javascript
// Əsas sınaq yükləri
<script>alert(document.cookie)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(document.domain)>

// CSP bypass cəhdi
<script src="data:,alert(1)"></script>
\`\`\`

> ⚠️ **KRİTİK:** Stored XSS bütün istifadəçiləri təsir edir. Dərhal yamaq lazımdır.

**Müdafiə:** Content-Security-Policy, htmlspecialchars(), DOMPurify.`;
  }
  if (lower.includes("nmap") || lower.includes("port") || lower.includes("skan")) {
    return `## Port Skan Nəticəsi

\`\`\`bash
nmap -sV -sC -oN scan.txt 10.0.0.1

Starting Nmap 7.94 ...
PORT    STATE SERVICE  VERSION
22/tcp  open  ssh      OpenSSH 8.9
80/tcp  open  http     nginx 1.22.1
443/tcp open  https    nginx 1.22.1
3306/tcp open mysql    MySQL 8.0.32
\`\`\`

| Port | Servis | Versiya | Riski |
|------|--------|---------|-------|
| 22   | SSH    | OpenSSH 8.9 | Orta |
| 80   | HTTP   | nginx 1.22.1 | Aşağı |
| 3306 | MySQL  | 8.0.32 | **Yüksək** |

> ⚠️ **MySQL (3306) xarici şəbəkəyə açıqdır! Firewall qaydası əlavə edin.**`;
  }
  if (lower.includes("cve")) {
    return `## CVE Analizi

**Tapılan CVE-lər:**

\`\`\`
CVE-2025-0432  CVSS: 9.8  Apache HTTP Server RCE
CVE-2025-1187  CVSS: 8.1  OpenSSL Buffer Overflow  
CVE-2025-2291  CVSS: 7.2  WordPress SQLi
\`\`\`

| CVE | Xətt | CVSS | Yamaq |
|-----|------|------|-------|
| CVE-2025-0432 | Apache 2.4.x | **9.8** | 2.4.59+ |
| CVE-2025-1187 | OpenSSL 3.0 | 8.1 | 3.0.14+ |

> ⚠️ **CVSS 9.8 — Dərhal yamaq tətbiq edilməlidir!**`;
  }
  return `## ARN AI Analizi

Sorğunuz qəbul edildi: **"${input}"**

Bu mövzu ilə əlaqədar ümumi pentest yanaşması:

\`\`\`bash
# Kəşfiyyat mərhələsi
whois target.com
nslookup target.com
subfinder -d target.com

# Açıq portlar
nmap -sV -p- target.com
\`\`\`

| Mərhələ | Alət | Məqsəd |
|---------|------|--------|
| Recon | Subfinder, WHOIS | Hədəf topologiyası |
| Skan | Nmap, Masscan | Açıq portlar |
| Exploit | Metasploit, Burp | Zəiflik testləri |

> ⚠️ Yalnız authorized testlərdə istifadə edin.

Daha ətraflı analiz üçün konkret hədəf/texnologiya qeyd edin.`;
}

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────
function AdminPanel({ setView }) {
  const [users, setUsers] = useState(MOCK_USERS);
  const [search, setSearch] = useState("");
  const [notif, setNotif] = useState("");
  const [notifSent, setNotifSent] = useState(false);
  const [tab, setTab] = useState("users");
  const [apiLoad, setApiLoad] = useState(42);

  useEffect(() => {
    const iv = setInterval(() => setApiLoad(prev => Math.max(10, Math.min(95, prev + (Math.random() - 0.5) * 10))), 2000);
    return () => clearInterval(iv);
  }, []);

  const filtered = users.filter(u => u.username.includes(search) || u.email.includes(search));
  const sendNotif = () => { if (!notif.trim()) return; setNotifSent(true); setTimeout(() => { setNotifSent(false); setNotif(""); }, 2000); };
  const toggleBan = (id) => setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "aktiv" ? "banlı" : "aktiv" } : u));
  const upgradePlan = (id, plan) => setUsers(prev => prev.map(u => u.id === id ? { ...u, plan } : u));

  const tabs = [{ id: "users", l: "İstifadəçilər" }, { id: "notif", l: "Bildiriş" }, { id: "system", l: "Sistem" }];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: COLORS.bg, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 28px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: COLORS.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ArnLogo size={22} showTag={false} />
          <span style={{ color: COLORS.red, fontSize: 11, letterSpacing: 3, borderLeft: `1px solid #333`, paddingLeft: 16 }}>ADMIN PANELİ</span>
        </div>
        <button onClick={() => setView("dashboard")} style={{ ...S.btnGhost, fontSize: 10 }}>← DASHBOARDa QAYIT</button>
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${COLORS.border}` }}>
        {[{ l: "Ümumi İstifadəçi", v: users.length }, { l: "Aktiv", v: users.filter(u => u.status === "aktiv").length }, { l: "PRO/MAX", v: users.filter(u => u.plan !== "FREE").length }, { l: "Banlı", v: users.filter(u => u.status === "banlı").length }].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: "16px 24px", borderRight: `1px solid ${COLORS.border}`, background: "#080808" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: i === 3 ? COLORS.red : COLORS.text }}>{s.v}</div>
            <div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: 1, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}`, background: "#080808" }}>
        {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "12px 24px", background: "none", border: "none", borderBottom: tab === t.id ? `2px solid ${COLORS.red}` : "2px solid transparent", color: tab === t.id ? COLORS.red : COLORS.textDim, cursor: "pointer", fontFamily: "inherit", fontSize: 12, letterSpacing: 1 }}>{t.l}</button>)}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {/* Users Tab */}
        {tab === "users" && (
          <>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="İstifadəçi axtar..." style={{ ...S.input, maxWidth: 320, marginBottom: 20 }} />
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["İD", "İstifadəçi adı", "E-poçt", "Plan", "Status", "Sorğular", "Əməliyyat"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, color: COLORS.redDim, letterSpacing: 2, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid #0f0f0f` }}>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: COLORS.textDim }}>{u.id}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: COLORS.text }}>{u.username}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: COLORS.textDim }}>{u.email}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <select value={u.plan} onChange={e => upgradePlan(u.id, e.target.value)} style={{ background: "#111", border: `1px solid #333`, color: planColor(u.plan), padding: "3px 8px", fontFamily: "inherit", fontSize: 11, cursor: "pointer" }}>
                        {["FREE", "PRO", "MAX"].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, color: u.status === "aktiv" ? COLORS.green : COLORS.red }}>{u.status.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: COLORS.textDim }}>{u.reqs}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => toggleBan(u.id)} style={{ ...S.btnGhost, fontSize: 10, padding: "3px 10px", color: u.status === "aktiv" ? COLORS.red : COLORS.green, borderColor: u.status === "aktiv" ? COLORS.red : COLORS.green }}>
                        {u.status === "aktiv" ? "BANLA" : "AÇIQL"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Notification Tab */}
        {tab === "notif" && (
          <div style={{ maxWidth: 520 }}>
            <h3 style={{ color: COLORS.red, fontSize: 13, letterSpacing: 2, marginBottom: 20 }}>QLOBAL BİLDİRİŞ GÖNDƏR</h3>
            <div style={{ ...S.card, marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 12 }}>Bu bildiriş bütün aktiv istifadəçilərə göndəriləcək.</p>
              <textarea value={notif} onChange={e => setNotif(e.target.value)} placeholder="Bildiriş mətni..." rows={4} style={{ ...S.input, marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 10 }}>
                <select style={{ ...S.input, width: "auto", flex: 1 }}>
                  <option>Adi Bildiriş</option>
                  <option>Xəbərdarlıq</option>
                  <option>KRİTİK XƏBƏR</option>
                </select>
                <button onClick={sendNotif} style={{ ...S.btnRed }}>
                  {notifSent ? "✓ GÖNDƏRİLDİ" : "GÖNDƏR"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* System Tab */}
        {tab === "system" && (
          <div style={{ maxWidth: 640 }}>
            <h3 style={{ color: COLORS.red, fontSize: 13, letterSpacing: 2, marginBottom: 20 }}>SİSTEM MONITORINQI</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { l: "API Gecikmə", v: "42ms", ok: true },
                { l: "DB Yük", v: `${apiLoad.toFixed(0)}%`, ok: apiLoad < 80 },
                { l: "Aktiv Sessiya", v: "3", ok: true },
                { l: "Günlük Sorğu", v: "631", ok: true },
                { l: "Uptime", v: "99.7%", ok: true },
                { l: "Cache Hit", v: "87%", ok: true },
              ].map(m => (
                <div key={m.l} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: COLORS.textDim }}>{m.l}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: m.ok ? COLORS.green : COLORS.red }}>{m.v}</span>
                </div>
              ))}
            </div>
            <div style={{ ...S.card, marginTop: 16 }}>
              <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 10 }}>DB YÜK QRAFİKİ (Simulyasiya)</div>
              <div style={{ height: 60, display: "flex", alignItems: "flex-end", gap: 4 }}>
                {Array.from({ length: 30 }, (_, i) => Math.random() * 80 + 10).map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: h > 80 ? COLORS.red : h > 60 ? COLORS.yellow : "#333", transition: "height 0.3s" }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
function AuthPage({ setView, setUser }) {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(""); setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    if (!form.username || !form.password) { setError("Bütün sahələri doldurun."); setLoading(false); return; }
    if (mode === "register" && form.password.length < 6) { setError("Şifrə ən az 6 simvol olmalıdır."); setLoading(false); return; }
    // Mock auth
    const isAdmin = form.username === "admin" || form.username === "m_safarov";
    setUser({ username: form.username, plan: isAdmin ? "MAX" : "FREE", isAdmin, reqsToday: 0 });
    setView(isAdmin && form.username === "admin" ? "admin" : "dashboard");
    setLoading(false);
  };

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.bg }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(255,0,51,0.04) 0%, transparent 70%)" }} />
      <div style={{ width: 400, padding: "48px 40px", ...S.cardRed, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <ArnLogo size={36} />
          <p style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: 3, marginTop: 12 }}>
            {mode === "login" ? "SİSTEMƏ DAXİL OLUN" : "HESAB YARADINIZ"}
          </p>
        </div>

        {error && <div style={{ background: "rgba(255,0,51,0.1)", border: `1px solid ${COLORS.red}`, color: COLORS.red, padding: "10px 14px", fontSize: 12, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: 2, display: "block", marginBottom: 6 }}>İSTİFADƏÇİ ADI</label>
            <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} style={S.input} placeholder="username" />
          </div>
          {mode === "register" && (
            <div>
              <label style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: 2, display: "block", marginBottom: 6 }}>E-POÇT</label>
              <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={S.input} placeholder="email@aztu.edu.az" />
            </div>
          )}
          <div>
            <label style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: 2, display: "block", marginBottom: 6 }}>ŞİFRƏ</label>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && submit()} style={S.input} placeholder="••••••••" />
          </div>
          <button onClick={submit} disabled={loading} style={{ ...S.btnRed, textAlign: "center", marginTop: 8, opacity: loading ? 0.7 : 1 }}>
            {loading ? "YOXLANILlR..." : mode === "login" ? "DAXİL OL" : "QEYDIYYAT"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{ background: "none", border: "none", color: COLORS.redDim, cursor: "pointer", fontSize: 11, letterSpacing: 1, fontFamily: "inherit" }}>
            {mode === "login" ? "Hesabınız yoxdur? Qeydiyyat →" : "Artıq hesabınız var? Daxil olun →"}
          </button>
        </div>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid #1a1a1a`, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {[["Demo: admin", () => setForm({ username: "admin", email: "", password: "admin123" })], ["Demo: pro", () => setForm({ username: "m_safarov", email: "", password: "pass123" })], ["Demo: free", () => setForm({ username: "user_free", email: "", password: "pass123" })]].map(([l, fn]) => (
            <button key={l} onClick={fn} style={{ ...S.btnDark, fontSize: 10, padding: "4px 10px" }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("login"); // login | dashboard | admin
  const [user, setUser] = useState(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #1e1e1e; }
        ::-webkit-scrollbar-thumb:hover { background: #ff0033; }

        @keyframes glitch {
          0%,100% { clip-path: none; transform: none; }
          20% { clip-path: inset(10% 0 80% 0); transform: translateX(-3px); }
          40% { clip-path: inset(60% 0 20% 0); transform: translateX(3px); }
          60% { clip-path: inset(30% 0 50% 0); transform: translateX(-2px); }
        }
        .arn-glitch { position: relative; display: inline-block; }
        .arn-glitch::before, .arn-glitch::after {
          content: attr(data-text);
          position: absolute; top: 0; left: 0;
          color: #ff0033;
          font-family: inherit; font-size: inherit; font-weight: inherit;
        }
        .arn-glitch::before {
          animation: glitch 4s infinite;
          color: #00ffff;
          text-shadow: -2px 0 #00ffff;
          opacity: 0.6;
        }
        .arn-glitch::after {
          animation: glitch 4s infinite 0.2s reverse;
          color: #ff0033;
          text-shadow: 2px 0 #ff0033;
          opacity: 0.5;
        }

        @keyframes scroll-left { from { transform: translateX(100%); } to { transform: translateX(-100%); } }
        .cve-scroll { animation: scroll-left 20s linear infinite; display: inline-block; }

        @keyframes blink { 50% { opacity: 0; } }
        .typing-dots::after { content: "..."; animation: blink 1.2s infinite; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={S.app}>
        <div style={S.scanline} />
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          {view === "login"     && <AuthPage setView={setView} setUser={setUser} />}
          {view === "dashboard" && user && <Dashboard user={user} setUser={setUser} setView={setView} />}
          {view === "admin"     && <AdminPanel setView={setView} />}
        </div>
      </div>
    </>
  );
}
