/**
 * ARN AI — Full-Stack SaaS Frontend  (Birləşdirilmiş v2)
 * Stack : React + Inline Styles
 * Views : Login · Register · ForgotPassword · VerifyEmail · Dashboard · Admin
 * Fonts : Orbitron (brand) · Barlow Condensed (display) · JetBrains Mono (terminal) · Barlow (UI)
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = "https://ill-madelyn-arnai-ce79d1d6.koyeb.app";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg:       "#050505",
  surface:  "#0d0d0d",
  surface2: "#111111",
  border:   "#1a1a1a",
  border2:  "#242424",
  red:      "#ff0033",
  redDim:   "#cc0028",
  redGlow:  "rgba(255,0,51,0.15)",
  redGlow2: "rgba(255,0,51,0.05)",
  text:     "#e8e8e8",
  textMid:  "#999",
  textDim:  "#555",
  green:    "#00ff41",
  yellow:   "#ffcc00",
};

const F = {
  ui:      "'Barlow', sans-serif",
  display: "'Barlow Condensed', sans-serif",
  mono:    "'JetBrains Mono', monospace",
  brand:   "'Orbitron', monospace",
};

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const S = {
  // Input field
  input: {
    background: "#0a0a0a",
    border: "1px solid #1e1e1e",
    borderBottom: `1px solid ${C.red}`,
    color: C.text,
    padding: "11px 14px",
    fontFamily: F.ui,
    fontSize: "14px",
    fontWeight: 400,
    outline: "none",
    width: "100%",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
    letterSpacing: "0.01em",
  },
  // Primary red button
  btnRed: {
    background: C.red,
    color: "#fff",
    border: "none",
    padding: "11px 24px",
    cursor: "pointer",
    fontFamily: F.display,
    fontWeight: 700,
    fontSize: "15px",
    letterSpacing: "2px",
    textTransform: "uppercase",
    transition: "all 0.18s",
  },
  // Ghost button
  btnGhost: {
    background: "transparent",
    color: C.red,
    border: `1px solid ${C.red}`,
    padding: "8px 16px",
    cursor: "pointer",
    fontFamily: F.display,
    fontWeight: 600,
    fontSize: "13px",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    transition: "all 0.18s",
  },
  // Dark neutral button
  btnDark: {
    background: "#111",
    color: C.textMid,
    border: `1px solid ${C.border2}`,
    padding: "8px 14px",
    cursor: "pointer",
    fontFamily: F.display,
    fontWeight: 600,
    fontSize: "12px",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    transition: "all 0.18s",
  },
  card:    { background: C.surface, border: `1px solid ${C.border}`, padding: "20px" },
  cardRed: { background: C.surface, border: `1px solid ${C.red}`, padding: "20px", boxShadow: `0 0 40px ${C.redGlow2}` },
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_THREATS = [
  { id: 1, level: "KRİTİK", msg: "CVE-2025-0432 · Apache HTTP Server RCE",      time: "00:12", country: "CN" },
  { id: 2, level: "YÜKSƏK", msg: "CVE-2025-1187 · OpenSSL Buffer Overflow",      time: "00:34", country: "RU" },
  { id: 3, level: "ORTA",   msg: "CVE-2025-2291 · WordPress SQLi Plugin",        time: "01:02", country: "BR" },
  { id: 4, level: "KRİTİK", msg: "CVE-2025-3314 · Linux Kernel Priv-Esc",       time: "01:45", country: "IR" },
  { id: 5, level: "YÜKSƏK", msg: "CVE-2025-4007 · Fortinet Auth Bypass",        time: "02:11", country: "KP" },
  { id: 6, level: "ORTA",   msg: "CVE-2025-4489 · Node.js Prototype Pollution",  time: "02:33", country: "US" },
];

const MOCK_USERS = [
  { id: 1, username: "m_safarov",   email: "m@aztu.edu.az", plan: "PRO",  status: "aktiv", reqs: 142 },
  { id: 2, username: "r_bekiyev",   email: "r@mail.az",     plan: "MAX",  status: "aktiv", reqs: 399 },
  { id: 3, username: "test_user_1", email: "t1@mail.az",    plan: "FREE", status: "aktiv", reqs: 3   },
  { id: 4, username: "hacker_x",    email: "hx@dark.az",    plan: "FREE", status: "banlı", reqs: 0   },
  { id: 5, username: "aytac_h",     email: "a@aztu.edu.az", plan: "PRO",  status: "aktiv", reqs: 87  },
];

const INITIAL_HISTORY = [
  {
    id: "h1",
    title: "Nmap Skan Analizi",
    tool: "Port Skaner",
    date: "Bugün",
    msgs: [
      { role: "user", content: "192.168.1.0/24 şəbəkəsini skan et." },
      {
        role: "assistant",
        content: `## Nmap Skan Nəticəsi

**Hədəf:** \`192.168.1.0/24\`  **Metod:** SYN Stealth (-sS)

\`\`\`bash
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
  { id: "chat",     label: "AI Pentest Köməkçisi", icon: "◈" },
  { id: "payload",  label: "Payload Generator",    icon: "⬡" },
  { id: "portscan", label: "Port Skaner Analizi",  icon: "◎" },
  { id: "webex",    label: "Web Exploit Helper",   icon: "⬢" },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function planColor(plan) {
  if (plan === "MAX") return C.red;
  if (plan === "PRO") return C.yellow;
  return C.textDim;
}

function levelColor(level) {
  if (level === "KRİTİK") return C.red;
  if (level === "YÜKSƏK") return C.yellow;
  return "#777";
}

function label(text, style = {}) {
  return (
    <span style={{
      fontFamily: F.display,
      fontSize: "10px",
      fontWeight: 700,
      letterSpacing: "2.5px",
      textTransform: "uppercase",
      color: C.textDim,
      ...style,
    }}>{text}</span>
  );
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function ArnLogo({ size = 28, showTag = true }) {
  // Sidebar / header mode: horizontal compact layout
  if (size <= 24) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          className="arn-glitch"
          data-text="ARN"
          style={{
            fontFamily: F.brand,
            fontSize: size,
            fontWeight: 900,
            color: C.red,
            textShadow: `0 0 20px ${C.red}`,
            letterSpacing: 3,
            userSelect: "none",
          }}
        >ARN</span>
        <span style={{
          fontFamily: F.display,
          fontSize: size * 0.58,
          color: C.text,
          letterSpacing: 3,
          fontWeight: 700,
        }}>AI</span>
      </div>
    );
  }

  // Large / centered mode: stacked layout — ARN on top, AI PENTEST ENGINE below
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, userSelect: "none" }}>
      <span
        className="arn-glitch"
        data-text="ARN"
        style={{
          fontFamily: F.brand,
          fontSize: size,
          fontWeight: 900,
          color: C.red,
          textShadow: `0 0 30px ${C.red}, 0 0 60px ${C.redGlow}`,
          letterSpacing: size * 0.18,
          lineHeight: 1,
        }}
      >ARN</span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: size * 0.08 }}>
        <span style={{
          fontFamily: F.display,
          fontSize: size * 0.52,
          color: C.text,
          letterSpacing: size * 0.22,
          fontWeight: 900,
          lineHeight: 1,
        }}>AI</span>
        {showTag && (
          <span style={{
            fontFamily: F.display,
            fontSize: Math.max(8, size * 0.22),
            color: C.redDim,
            letterSpacing: Math.max(2, size * 0.1),
            fontWeight: 700,
            marginTop: size * 0.1,
            textTransform: "uppercase",
          }}>PENTEST ENGINE</span>
        )}
      </div>
    </div>
  );
}

// ─── SECTION LABEL ────────────────────────────────────────────────────────────
function SectionLabel({ children, style = {} }) {
  return (
    <div style={{
      fontFamily: F.display,
      fontSize: "9px",
      fontWeight: 700,
      letterSpacing: "3px",
      textTransform: "uppercase",
      color: C.redDim,
      ...style,
    }}>◈ {children}</div>
  );
}

// ─── MARKDOWN RENDERER ────────────────────────────────────────────────────────
function CodeBlock({ code, lang, onRunSim }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={{ margin: "12px 0", border: `1px solid ${C.border2}`, background: "#060606" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "6px 12px", borderBottom: `1px solid ${C.border}`, background: "#0c0c0c",
      }}>
        <span style={{ fontFamily: F.mono, fontSize: "10px", color: C.redDim, letterSpacing: 1 }}>
          {lang || "CODE"}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {onRunSim && (
            <button onClick={() => onRunSim(code)} style={{ ...S.btnGhost, padding: "3px 10px", fontSize: "10px" }}>
              ▶ SİMULYASİYA
            </button>
          )}
          <button onClick={copy} style={{ ...S.btnDark, padding: "3px 10px", fontSize: "10px" }}>
            {copied ? "✓ KOPYALANDl" : "⎘ KOPYALA"}
          </button>
        </div>
      </div>
      <pre style={{
        margin: 0, padding: "14px 16px",
        fontFamily: F.mono, fontSize: "12px", lineHeight: 1.7,
        overflowX: "auto", color: "#ccc", whiteSpace: "pre-wrap",
      }}><code>{code}</code></pre>
    </div>
  );
}

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
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F.mono, fontSize: "12px" }}>
          <thead>
            <tr>{headers.map((h, i) => (
              <th key={i} style={{
                border: `1px solid ${C.border2}`, padding: "8px 12px",
                color: C.red, textAlign: "left", background: "#0d0d0d",
                fontFamily: F.display, fontSize: "11px", letterSpacing: "1px", fontWeight: 700,
              }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {body.map((row, ri) => {
              const cells = row.split("|").map(c => c.trim()).filter(Boolean);
              return (
                <tr key={ri}>
                  {cells.map((c, ci) => (
                    <td key={ci} style={{
                      border: `1px solid ${C.border}`, padding: "7px 12px",
                      color: C.text, background: ri % 2 === 0 ? "#080808" : "#0b0b0b",
                    }}>
                      {c.includes("**")
                        ? <strong style={{ color: C.red }}>{c.replace(/\*\*/g, "")}</strong>
                        : c}
                    </td>
                  ))}
                </tr>
              );
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
      if (!inCode) { inCode = true; codeLang = line.slice(3); codeLines = []; }
      else {
        elements.push(<CodeBlock key={i} code={codeLines.join("\n")} lang={codeLang} onRunSim={onRunSim} />);
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
      elements.push(<h2 key={i} style={{
        fontFamily: F.display, fontWeight: 700, fontSize: "16px",
        color: C.red, margin: "18px 0 8px", letterSpacing: "1.5px",
        borderBottom: `1px solid ${C.border}`, paddingBottom: 6,
      }}>{line.slice(3)}</h2>);
    } else if (line.startsWith("> ")) {
      elements.push(<div key={i} style={{
        borderLeft: `3px solid ${C.red}`, paddingLeft: 12, margin: "8px 0",
        color: C.yellow, fontFamily: F.ui, fontSize: "13px",
      }}>{line.slice(2)}</div>);
    } else if (line.trim() === "") {
      elements.push(<br key={i} />);
    } else {
      const rendered = line
        .replace(/`([^`]+)`/g, (_, c) =>
          `<code style="background:#111;color:#ff0033;padding:2px 6px;font-family:'JetBrains Mono',monospace;font-size:11px;">${c}</code>`)
        .replace(/\*\*([^*]+)\*\*/g, (_, t) =>
          `<strong style="color:#ff0033;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.5px">${t}</strong>`);
      elements.push(<p key={i} style={{
        margin: "4px 0", fontSize: "13px", lineHeight: 1.8,
        color: C.text, fontFamily: F.ui,
      }} dangerouslySetInnerHTML={{ __html: rendered }} />);
    }
  });

  return <div>{elements}</div>;
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
      ...code.split("\n").slice(0, 5).map((l, i) => `[EXEC ${i + 1}] ${l}`),
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
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{ ...S.cardRed, width: 620, maxWidth: "95vw" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <SectionLabel>Sandbox Simulyasiyası</SectionLabel>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 18,
          }}>✕</button>
        </div>
        <div style={{
          background: "#030303", border: `1px solid ${C.border}`, padding: 16,
          minHeight: 220, fontFamily: F.mono, fontSize: "12px", lineHeight: 1.8,
        }}>
          {output.map((l, i) => (
            <div key={i} style={{
              color: l.includes("uğurla") ? C.green : l.includes("KRİTİK") ? C.red : "#888",
            }}>{l}</div>
          ))}
          {running && <span style={{ color: C.red }}>█</span>}
        </div>
      </div>
    </div>
  );
}

// ─── UPGRADE MODAL ────────────────────────────────────────────────────────────
function UpgradeModal({ onClose }) {
  const plans = [
    { p: "PRO", price: "₼19/ay", feats: ["Limitsiz sorğu", "Prioritet cavab", "Bütün alətlər"] },
    { p: "MAX", price: "₼49/ay", feats: ["PRO + hamısı", "API girişi", "Şəxsi agent"] },
  ];
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{ ...S.cardRed, width: 500, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8, color: C.red }}>⬡</div>
        <h2 style={{ fontFamily: F.display, color: C.red, letterSpacing: 3, marginBottom: 8, fontSize: 22 }}>
          LİMİT AŞILDI
        </h2>
        <p style={{ color: C.textMid, fontSize: 14, marginBottom: 24, fontFamily: F.ui }}>
          Pulsuz planda gündə 3 sorğu limitinə çatdınız.
        </p>
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {plans.map(pl => (
            <div key={pl.p} style={{
              flex: 1, border: `1px solid ${pl.p === "MAX" ? C.red : C.border2}`,
              padding: 20, background: "#0a0a0a",
            }}>
              <div style={{ fontFamily: F.display, color: planColor(pl.p), fontWeight: 900, fontSize: 22, letterSpacing: 3 }}>
                {pl.p}
              </div>
              <div style={{ fontFamily: F.ui, color: C.text, fontSize: 22, margin: "10px 0", fontWeight: 600 }}>
                {pl.price}
              </div>
              {pl.feats.map(f => (
                <div key={f} style={{ fontFamily: F.ui, color: C.textMid, fontSize: 12, margin: "4px 0" }}>
                  ✓ {f}
                </div>
              ))}
              <button style={{ ...S.btnRed, width: "100%", marginTop: 14, fontSize: 13 }}>SEÇ</button>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{
          color: C.textDim, background: "none", border: "none", cursor: "pointer",
          fontFamily: F.display, fontSize: 13, letterSpacing: 1,
        }}>Pulsuz davam et →</button>
      </div>
    </div>
  );
}

// ─── RIGHT PANEL ──────────────────────────────────────────────────────────────
function RightPanel({ user }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(iv);
  }, []);
  const latency = 42 + Math.floor(Math.sin(tick) * 8);

  return (
    <div style={{
      width: 270, minWidth: 270, borderLeft: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", background: C.surface, overflow: "hidden",
    }}>
      {/* User Stats */}
      <div style={{ padding: "16px", borderBottom: `1px solid ${C.border}` }}>
        <SectionLabel style={{ marginBottom: 14 }}>İstifadəçi Paneli</SectionLabel>

        {[
          ["Plan", <span style={{ color: planColor(user.plan), fontFamily: F.display, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>{user.plan}</span>],
          ["Sorğular", <span style={{ fontFamily: F.mono, fontSize: 12, color: C.text }}>{user.plan === "FREE" ? `${user.reqsToday}/3` : "∞"}</span>],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: F.ui, fontSize: 12, color: C.textDim }}>{k}</span>
            {v}
          </div>
        ))}

        {user.plan === "FREE" && (
          <div style={{ height: 2, background: C.border, marginBottom: 8 }}>
            <div style={{ height: "100%", width: `${(user.reqsToday / 3) * 100}%`, background: C.red, transition: "width 0.4s" }} />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <span style={{ fontFamily: F.ui, fontSize: 12, color: C.textDim }}>API Gecikmə</span>
          <span style={{ fontFamily: F.mono, fontSize: 12, color: latency > 50 ? C.yellow : C.green }}>{latency}ms</span>
        </div>
      </div>

      {/* Live Threats */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 16px 8px", borderBottom: `1px solid ${C.border}` }}>
          <SectionLabel>Canlı Təhdidlər</SectionLabel>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {MOCK_THREATS.map(t => (
            <div key={t.id} style={{ padding: "9px 16px", borderBottom: `1px solid #0e0e0e` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontFamily: F.display, fontSize: "9px", color: levelColor(t.level), letterSpacing: 1.5, fontWeight: 700 }}>
                  {t.level}
                </span>
                <span style={{ fontFamily: F.mono, fontSize: "9px", color: C.textDim }}>
                  {t.country} · {t.time}
                </span>
              </div>
              <div style={{ fontFamily: F.ui, fontSize: "11px", color: "#bbb", lineHeight: 1.4 }}>{t.msg}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CVE Ticker */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, background: "#080808", overflow: "hidden" }}>
        <div style={{ fontFamily: F.display, fontSize: "8px", color: C.textDim, letterSpacing: 2, marginBottom: 5 }}>NVD CVE AXINI</div>
        <div style={{ overflow: "hidden" }}>
          <div className="cve-scroll" style={{ fontFamily: F.mono, fontSize: "10px", color: C.redDim }}>
            CVE-2025-0432 · CVE-2025-1187 · CVE-2025-2291 · CVE-2025-3314 · CVE-2025-4007 · CVE-2025-4489 ·&nbsp;
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

  const suggestions = ["SQL injection test et", "XSS payload yaz", "Nmap skan izah et", "CVE-2025-0432 analiz et"];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {simCode && <SimModal code={simCode} onClose={() => setSimCode(null)} />}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "12vh" }}>
            <ArnLogo size={64} />
            <p style={{ fontFamily: F.ui, color: C.textDim, fontSize: 14, marginTop: 20 }}>
              Sorğunuzu yazın. Red Team kömək etməyə hazırdır.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
              {suggestions.map(q => (
                <button key={q} onClick={() => onSend(q)} style={{ ...S.btnGhost, fontSize: "11px", padding: "7px 14px" }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="fade-in" style={{
            marginBottom: 20, display: "flex",
            flexDirection: "column",
            alignItems: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              fontFamily: F.display, fontSize: "9px", color: C.textDim,
              marginBottom: 5, letterSpacing: "2px", fontWeight: 700,
            }}>
              {msg.role === "user" ? "SİZ" : "◈ ARN AI"}
            </div>
            <div style={{
              maxWidth: "88%",
              background: msg.role === "user" ? "#0f0f0f" : C.surface,
              border: `1px solid ${msg.role === "user" ? C.border2 : C.border}`,
              padding: "14px 18px",
              borderLeft: msg.role === "assistant" ? `3px solid ${C.red}` : undefined,
            }}>
              {msg.role === "assistant"
                ? <MdBlock content={msg.content} onRunSim={setSimCode} />
                : <p style={{ margin: 0, fontFamily: F.ui, fontSize: "14px", lineHeight: 1.7 }}>{msg.content}</p>
              }
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.textDim, fontFamily: F.ui, fontSize: "13px" }}>
            <span style={{ color: C.red, fontFamily: F.display, letterSpacing: 1 }}>◈ ARN AI</span>
            <span className="typing-dots">analizə başlanır</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.border}`, background: "#080808" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Sorğunuzu daxil edin... (Shift+Enter = yeni sətir)"
            rows={2}
            style={{
              ...S.input, resize: "none", flex: 1,
              borderBottom: `1px solid ${input ? C.red : "#2a2a2a"}`,
            }}
          />
          <button onClick={handleSend} style={{ ...S.btnRed, padding: "16px 22px", whiteSpace: "nowrap", fontSize: "14px" }}>
            ▶ GÖNDƏR
          </button>
        </div>
        <div style={{ marginTop: 7, display: "flex", gap: 16 }}>
          <span style={{ fontFamily: F.ui, fontSize: "11px", color: C.textDim }}>↵ Enter = Göndər  ·  Shift+↵ = Yeni sətir</span>
          {plan === "FREE" && (
            <span style={{ fontFamily: F.mono, fontSize: "11px", color: reqsToday >= 2 ? C.red : C.textDim }}>
              Gündəlik: {reqsToday}/3 sorğu
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ history, activeTool, setActiveTool, activeHistory, setActiveHistory, onNewChat, user, onLogout, isAdmin, setView }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{
      width: collapsed ? 52 : 236, minWidth: collapsed ? 52 : 236,
      borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      background: C.surface, transition: "width 0.2s", overflow: "hidden",
    }}>
      {/* Logo row */}
      <div style={{
        padding: "16px 14px", borderBottom: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        {!collapsed && <ArnLogo size={20} />}
        <button onClick={() => setCollapsed(c => !c)} style={{
          background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 14, marginLeft: "auto",
        }}>{collapsed ? "▶" : "◀"}</button>
      </div>

      {/* Tools */}
      {!collapsed && (
        <div style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ padding: "4px 14px 8px" }}>
            <SectionLabel>Alətlər</SectionLabel>
          </div>
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setActiveTool(t.id)} style={{
              display: "flex", gap: 10, alignItems: "center", width: "100%",
              padding: "9px 14px",
              background: activeTool === t.id ? `rgba(255,0,51,0.07)` : "none",
              border: "none",
              borderLeft: activeTool === t.id ? `2px solid ${C.red}` : "2px solid transparent",
              color: activeTool === t.id ? C.red : C.textDim,
              cursor: "pointer", fontFamily: F.ui, fontSize: "13px", textAlign: "left",
              transition: "all 0.15s",
            }}>
              <span style={{ fontFamily: F.mono, fontSize: "13px" }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* New Chat */}
      {!collapsed && (
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
          <button onClick={onNewChat} style={{ ...S.btnGhost, width: "100%", fontSize: "11px" }}>
            + YENİ SÖHBƏT
          </button>
        </div>
      )}

      {/* History */}
      {!collapsed && (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          <div style={{ padding: "4px 14px 8px" }}>
            <SectionLabel>Tarixçə</SectionLabel>
          </div>
          {history.map(h => (
            <button key={h.id} onClick={() => setActiveHistory(h.id)} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "9px 14px",
              background: activeHistory === h.id ? "#111" : "none",
              border: "none",
              borderLeft: activeHistory === h.id ? `2px solid ${C.red}` : "2px solid transparent",
              color: activeHistory === h.id ? C.text : C.textDim,
              cursor: "pointer", fontFamily: F.ui, fontSize: "12px",
            }}>
              <div style={{ marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {h.title}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: "9px", color: C.textDim }}>
                {h.date} · {h.tool}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Bottom */}
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${C.border}` }}>
        {!collapsed && (
          <>
            <div style={{ fontFamily: F.ui, fontSize: "13px", color: C.text, marginBottom: 2 }}>{user.username}</div>
            <div style={{ fontFamily: F.display, fontSize: "10px", color: planColor(user.plan), letterSpacing: 1.5, marginBottom: 10 }}>
              {user.plan} PLAN
            </div>
          </>
        )}
        <div style={{ display: "flex", gap: 6 }}>
          {!collapsed && isAdmin && (
            <button onClick={() => setView("admin")} style={{ ...S.btnGhost, fontSize: "10px", padding: "5px 10px", flex: 1 }}>
              ADMIN
            </button>
          )}
          <button onClick={onLogout} style={{ ...S.btnDark, fontSize: "10px", padding: "5px 10px", flex: 1 }}>
            ÇIXIŞ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MOCK AI RESPONSE ─────────────────────────────────────────────────────────
function generateMockResponse(input) {
  const l = input.toLowerCase();
  if (l.includes("sql") || l.includes("injection")) return `## SQL Injection Analizi

**Hədəf parametr:** \`id\`, \`user\`, \`search\`

\`\`\`sql
-- Əsas test yükləri
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

> ⚠️ **XƏBƏRDARLIQ:** Bu testlər yalnız icazəli sistemlərdə aparılmalıdır.

**Müdafiə:** Prepared statements, input validation, WAF istifadə edin.`;

  if (l.includes("xss")) return `## XSS Payload Analizi

**Növlər:** Reflected, Stored, DOM-based

\`\`\`javascript
// Əsas sınaq yükləri
<script>alert(document.cookie)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(document.domain)>
\`\`\`

> ⚠️ **KRİTİK:** Stored XSS bütün istifadəçiləri təsir edir.

**Müdafiə:** Content-Security-Policy, htmlspecialchars(), DOMPurify.`;

  if (l.includes("nmap") || l.includes("port") || l.includes("skan")) return `## Port Skan Nəticəsi

\`\`\`bash
nmap -sV -sC -oN scan.txt 10.0.0.1

PORT    STATE SERVICE  VERSION
22/tcp  open  ssh      OpenSSH 8.9
80/tcp  open  http     nginx 1.22.1
3306/tcp open mysql   MySQL 8.0.32
\`\`\`

| Port | Servis | Risk |
|------|--------|------|
| 22 | SSH | Orta |
| 80 | HTTP | Aşağı |
| 3306 | MySQL | **Yüksək** |

> ⚠️ **MySQL (3306) xarici şəbəkəyə açıqdır! Firewall qaydası əlavə edin.**`;

  return `## ARN AI Analizi

Sorğunuz qəbul edildi: **"${input}"**

\`\`\`bash
# Kəşfiyyat mərhələsi
whois target.com
nslookup target.com
subfinder -d target.com

# Port skan
nmap -sV -p- target.com
\`\`\`

| Mərhələ | Alət | Məqsəd |
|---------|------|--------|
| Recon | Subfinder, WHOIS | Topologiya |
| Skan | Nmap, Masscan | Portlar |
| Exploit | Metasploit, Burp | Zəifliklər |

> ⚠️ Yalnız authorized testlərdə istifadə edin.

Daha ətraflı analiz üçün konkret hədəf qeyd edin.`;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ user, setUser, setView }) {
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [activeHistory, setActiveHistory] = useState(null);
  const [activeTool, setActiveTool] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reqsToday, setReqsToday] = useState(user.reqsToday || 0);
  const [sessionId, setSessionId] = useState(null);
  const token = localStorage.getItem("arn_token");

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

    let aiResponse;
    // ── Real API call ──
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/chat/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ session_id: sessionId, message: text, tool: activeTool }),
        });
        const data = await res.json();
        if (res.ok) {
          aiResponse = data.response;
          setSessionId(data.session_id);
        } else {
          aiResponse = `**Xəta:** ${data.detail || "Bilinməyən xəta"}`;
        }
      } catch {
        // Fallback to mock
        await new Promise(r => setTimeout(r, 1200 + Math.random() * 600));
        aiResponse = generateMockResponse(text);
      }
    } else {
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 600));
      aiResponse = generateMockResponse(text);
    }

    const aiMsg = { role: "assistant", content: aiResponse };
    if (activeHistory) {
      setHistory(prev => prev.map(h => h.id === activeHistory ? { ...h, msgs: [...h.msgs, aiMsg] } : h));
    } else {
      const newH = {
        id: `h${Date.now()}`,
        title: text.slice(0, 30) + (text.length > 30 ? "..." : ""),
        tool: TOOLS.find(t => t.id === activeTool)?.label || "Chat",
        date: "İndi",
        msgs: [newMsg, aiMsg],
      };
      setHistory(prev => [newH, ...prev]);
      setMessages([]);
      setActiveHistory(newH.id);
    }
    setLoading(false);
  }, [activeHistory, activeTool, messages, sessionId, token]);

  const newChat = () => { setActiveHistory(null); setMessages([]); setSessionId(null); };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <Sidebar
        history={history} activeTool={activeTool}
        setActiveTool={t => { setActiveTool(t); newChat(); }}
        activeHistory={activeHistory} setActiveHistory={setActiveHistory}
        onNewChat={newChat} user={{ ...user, reqsToday }}
        onLogout={() => { localStorage.removeItem("arn_token"); setView("login"); }}
        isAdmin={user.isAdmin} setView={setView}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Tool Header */}
        <div style={{
          padding: "10px 24px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 12, background: "#080808",
        }}>
          <span style={{ color: C.red, fontFamily: F.mono }}>◈</span>
          <span style={{ fontFamily: F.display, fontSize: "15px", color: C.text, letterSpacing: 1, fontWeight: 600 }}>
            {TOOLS.find(t => t.id === activeTool)?.label}
          </span>
          <span style={{ fontFamily: F.ui, fontSize: "11px", color: C.textDim, marginLeft: "auto" }}>
            AZTU SEC-LAB · AES-256 ŞİFRƏLİ
          </span>
        </div>
        <ChatWindow
          messages={currentMsgs} onSend={handleSend}
          loading={loading} plan={user.plan} reqsToday={reqsToday}
        />
      </div>
      <RightPanel user={{ ...user, reqsToday }} />
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
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
  const sendNotif = () => {
    if (!notif.trim()) return;
    setNotifSent(true);
    setTimeout(() => { setNotifSent(false); setNotif(""); }, 2000);
  };
  const toggleBan = (id) => setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "aktiv" ? "banlı" : "aktiv" } : u));
  const upgradePlan = (id, plan) => setUsers(prev => prev.map(u => u.id === id ? { ...u, plan } : u));

  const TABS = [{ id: "users", l: "İstifadəçilər" }, { id: "notif", l: "Bildiriş" }, { id: "system", l: "Sistem" }];
  const statsRow = [
    { l: "Ümumi", v: users.length },
    { l: "Aktiv", v: users.filter(u => u.status === "aktiv").length },
    { l: "PRO/MAX", v: users.filter(u => u.plan !== "FREE").length },
    { l: "Banlı", v: users.filter(u => u.status === "banlı").length },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: C.bg, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "14px 28px", borderBottom: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ArnLogo size={20} showTag={false} />
          <span style={{ fontFamily: F.display, color: C.red, fontSize: "11px", letterSpacing: 3, borderLeft: `1px solid #2a2a2a`, paddingLeft: 16, fontWeight: 700 }}>
            ADMIN PANELİ
          </span>
        </div>
        <button onClick={() => setView("dashboard")} style={{ ...S.btnGhost, fontSize: "10px" }}>← Dashboarda Qayıt</button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}` }}>
        {statsRow.map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: "14px 24px", borderRight: `1px solid ${C.border}`, background: "#080808",
          }}>
            <div style={{ fontFamily: F.display, fontSize: "26px", fontWeight: 900, color: i === 3 ? C.red : C.text }}>{s.v}</div>
            <div style={{ fontFamily: F.ui, fontSize: "11px", color: C.textDim, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: "#080808" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "11px 22px", background: "none", border: "none",
            borderBottom: tab === t.id ? `2px solid ${C.red}` : "2px solid transparent",
            color: tab === t.id ? C.red : C.textDim,
            cursor: "pointer", fontFamily: F.display, fontWeight: 700, fontSize: "12px", letterSpacing: 1.5,
          }}>{t.l}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {/* Users Tab */}
        {tab === "users" && (
          <>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="İstifadəçi axtar..."
              style={{ ...S.input, maxWidth: 300, marginBottom: 20 }}
            />
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["İD", "İstifadəçi", "E-poçt", "Plan", "Status", "Sorğular", "Əməliyyat"].map(h => (
                    <th key={h} style={{
                      padding: "10px 14px", textAlign: "left",
                      fontFamily: F.display, fontSize: "10px", color: C.redDim,
                      letterSpacing: 2, borderBottom: `1px solid ${C.border}`, fontWeight: 700,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid #0e0e0e` }}>
                    <td style={{ padding: "10px 14px", fontFamily: F.mono, fontSize: "12px", color: C.textDim }}>{u.id}</td>
                    <td style={{ padding: "10px 14px", fontFamily: F.ui, fontSize: "13px", color: C.text, fontWeight: 500 }}>{u.username}</td>
                    <td style={{ padding: "10px 14px", fontFamily: F.ui, fontSize: "12px", color: C.textDim }}>{u.email}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <select
                        value={u.plan} onChange={e => upgradePlan(u.id, e.target.value)}
                        style={{
                          background: "#111", border: `1px solid ${C.border2}`, color: planColor(u.plan),
                          padding: "3px 8px", fontFamily: F.display, fontWeight: 700,
                          fontSize: "11px", cursor: "pointer", letterSpacing: 1,
                        }}
                      >
                        {["FREE", "PRO", "MAX"].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        fontFamily: F.display, fontSize: "10px", fontWeight: 700, letterSpacing: 1.5,
                        color: u.status === "aktiv" ? C.green : C.red,
                      }}>{u.status.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: F.mono, fontSize: "12px", color: C.textDim }}>{u.reqs}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => toggleBan(u.id)} style={{
                        ...S.btnGhost, fontSize: "10px", padding: "3px 10px",
                        color: u.status === "aktiv" ? C.red : C.green,
                        borderColor: u.status === "aktiv" ? C.red : C.green,
                      }}>
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
            <h3 style={{ fontFamily: F.display, color: C.red, fontSize: "14px", letterSpacing: 2, marginBottom: 20, fontWeight: 700 }}>
              QLOBAL BİLDİRİŞ GÖNDƏR
            </h3>
            <div style={{ ...S.card, marginBottom: 16 }}>
              <p style={{ fontFamily: F.ui, fontSize: "13px", color: C.textDim, marginBottom: 12 }}>
                Bu bildiriş bütün aktiv istifadəçilərə göndəriləcək.
              </p>
              <textarea
                value={notif} onChange={e => setNotif(e.target.value)}
                placeholder="Bildiriş mətni..."
                rows={4}
                style={{ ...S.input, marginBottom: 12 }}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <select style={{ ...S.input, width: "auto", flex: 1, fontFamily: F.ui }}>
                  <option>Adi Bildiriş</option>
                  <option>Xəbərdarlıq</option>
                  <option>KRİTİK XƏBƏR</option>
                </select>
                <button onClick={sendNotif} style={S.btnRed}>
                  {notifSent ? "✓ GÖNDƏRİLDİ" : "GÖNDƏR"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* System Tab */}
        {tab === "system" && (
          <div style={{ maxWidth: 640 }}>
            <h3 style={{ fontFamily: F.display, color: C.red, fontSize: "14px", letterSpacing: 2, marginBottom: 20, fontWeight: 700 }}>
              SİSTEM MONİTORİNQİ
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { l: "API Gecikmə", v: "42ms", ok: true },
                { l: "DB Yük", v: `${apiLoad.toFixed(0)}%`, ok: apiLoad < 80 },
                { l: "Aktiv Sessiya", v: "3", ok: true },
                { l: "Günlük Sorğu", v: "631", ok: true },
                { l: "Uptime", v: "99.7%", ok: true },
                { l: "Cache Hit", v: "87%", ok: true },
              ].map(m => (
                <div key={m.l} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: F.ui, fontSize: "12px", color: C.textDim }}>{m.l}</span>
                  <span style={{ fontFamily: F.mono, fontSize: "20px", fontWeight: 700, color: m.ok ? C.green : C.red }}>{m.v}</span>
                </div>
              ))}
            </div>
            <div style={{ ...S.card, marginTop: 16 }}>
              <div style={{ fontFamily: F.ui, fontSize: "11px", color: C.textDim, marginBottom: 10 }}>DB YÜK QRAFİKİ</div>
              <div style={{ height: 60, display: "flex", alignItems: "flex-end", gap: 3 }}>
                {Array.from({ length: 32 }, () => Math.random() * 80 + 10).map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: h > 80 ? C.red : h > 60 ? C.yellow : "#222", transition: "height 0.3s" }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AUTH COMPONENTS (Email Verify inteqrasiyası) ──────────────────────────────

// Centred wrapper
function CenteredPage({ children }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, minHeight: "100vh", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(255,0,51,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
      {children}
    </div>
  );
}

// Auth card wrapper
function AuthCard({ children, width = 420 }) {
  return (
    <div style={{ width, ...S.cardRed, position: "relative", zIndex: 1 }}>
      {children}
    </div>
  );
}

// Auth logo header
function AuthLogo({ subtitle }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 36 }}>
      <ArnLogo size={52} />
      {subtitle && (
        <p style={{ fontFamily: F.display, fontSize: "10px", color: C.textDim, letterSpacing: 3, marginTop: 12, fontWeight: 600 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// Error box
function ErrBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background: "rgba(255,0,51,0.08)", border: `1px solid ${C.red}`, color: C.red, padding: "10px 14px", fontFamily: F.ui, fontSize: "13px", marginBottom: 16, borderLeft: `3px solid ${C.red}` }}>
      {msg}
    </div>
  );
}

// Success box
function OkBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background: "rgba(0,255,65,0.06)", border: `1px solid ${C.green}`, color: C.green, padding: "10px 14px", fontFamily: F.ui, fontSize: "13px", marginBottom: 16 }}>
      ✓ {msg}
    </div>
  );
}

// ─── VERIFY EMAIL PENDING ─────────────────────────────────────────────────────
function VerifyEmailPending({ email, onBack }) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await fetch(`${API_BASE}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResent(true);
      setCooldown(60);
    } finally { setResending(false); }
  };

  return (
    <CenteredPage>
      <AuthCard>
        <AuthLogo subtitle="E-poçt Doğrulaması" />
        <div style={{ textAlign: "center", fontSize: 44, marginBottom: 20, color: C.red }}>✉</div>
        <h2 style={{ fontFamily: F.display, color: C.red, fontSize: "14px", letterSpacing: 3, textAlign: "center", marginBottom: 14, fontWeight: 700 }}>
          E-POÇTUNUZU YOXLAYIN
        </h2>
        <p style={{ fontFamily: F.ui, color: C.textDim, fontSize: "13px", textAlign: "center", lineHeight: 1.8, marginBottom: 24 }}>
          <span style={{ color: C.text, fontWeight: 500 }}>{email}</span> ünvanına doğrulama linki göndərildi.
          <br />Emaildəki linkə klikləyərək hesabınızı aktivləşdirin.
        </p>
        {resent && <OkBox msg="Yeni link göndərildi" />}
        <button
          onClick={resend} disabled={cooldown > 0 || resending}
          style={{ ...S.btnRed, width: "100%", marginTop: 4, opacity: (cooldown > 0 || resending) ? 0.5 : 1 }}
        >
          {resending ? "GÖNDƏRİLİR..." : cooldown > 0 ? `YENİDƏN GÖNDƏR (${cooldown}s)` : "◈ LİNKİ YENİDƏN GÖNDƏR"}
        </button>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontFamily: F.ui, fontSize: "12px", width: "100%", textAlign: "center", marginTop: 14 }}>
          ← Girişə qayıt
        </button>
        <div style={{ marginTop: 20, padding: 12, background: "#080808", border: `1px solid ${C.border}`, fontFamily: F.ui, fontSize: "11px", color: C.textDim, lineHeight: 1.7 }}>
          ⚠ Email gəlmədisə spam/junk qovluğunu yoxlayın. Link 24 saat etibarlıdır.
        </div>
      </AuthCard>
    </CenteredPage>
  );
}

// ─── VERIFY EMAIL RESULT ──────────────────────────────────────────────────────
function VerifyEmailResult({ onSuccess }) {
  const [status, setStatus] = useState("loading");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) { setStatus("error"); return; }
    fetch(`${API_BASE}/auth/verify?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.username) {
          setUsername(data.username);
          setStatus("success");
          setTimeout(() => onSuccess?.(), 2500);
        } else { setStatus("error"); }
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <CenteredPage>
      <AuthCard>
        <AuthLogo />
        {status === "loading" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: F.mono, fontSize: 32, color: C.red, marginBottom: 14 }}>◈</div>
            <p style={{ fontFamily: F.ui, color: C.textDim, fontSize: "13px" }}>Token yoxlanılır<span className="typing-dots" /></p>
          </div>
        )}
        {status === "success" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 14, color: C.green }}>✓</div>
            <h2 style={{ fontFamily: F.display, color: C.green, fontSize: "14px", letterSpacing: 3, marginBottom: 12, fontWeight: 700 }}>DOĞRULANDINIZ</h2>
            <p style={{ fontFamily: F.ui, color: C.textDim, fontSize: "13px", lineHeight: 1.8 }}>
              <span style={{ color: C.text, fontWeight: 500 }}>{username}</span>, hesabınız aktivləşdirildi.<br />Giriş səhifəsinə yönləndirilirsiniz...
            </p>
          </div>
        )}
        {status === "error" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 14, color: C.red }}>✕</div>
            <h2 style={{ fontFamily: F.display, color: C.red, fontSize: "14px", letterSpacing: 3, marginBottom: 12, fontWeight: 700 }}>TOKEN YANLIŞDIR</h2>
            <p style={{ fontFamily: F.ui, color: C.textDim, fontSize: "13px", lineHeight: 1.8, marginBottom: 20 }}>
              Bu link etibarsız, vaxtı keçmiş<br />və ya artıq istifadə edilmişdir.
            </p>
            <button onClick={() => onSuccess?.()} style={{ ...S.btnRed, width: "100%" }}>← Giriş Səhifəsi</button>
          </div>
        )}
      </AuthCard>
    </CenteredPage>
  );
}

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  };

  return (
    <CenteredPage>
      <AuthCard>
        <AuthLogo subtitle="Şifrə Sıfırlama" />
        {!sent ? (
          <>
            <p style={{ fontFamily: F.ui, color: C.textDim, fontSize: "13px", lineHeight: 1.8, marginBottom: 20 }}>
              Qeydiyyatlı e-poçt ünvanınızı daxil edin. Şifrə sıfırlama linki göndərəcəyik.
            </p>
            <label style={{ fontFamily: F.display, fontSize: "10px", color: C.textDim, letterSpacing: 2, display: "block", marginBottom: 6, fontWeight: 600 }}>E-POÇT</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="email@aztu.edu.az"
              style={S.input}
            />
            <button onClick={submit} disabled={loading} style={{ ...S.btnRed, width: "100%", marginTop: 12, opacity: loading ? 0.7 : 1 }}>
              {loading ? "GÖNDƏRİLİR..." : "◈ LINK GÖNDƏR"}
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, color: C.green, marginBottom: 12 }}>✓</div>
            <p style={{ fontFamily: F.ui, color: C.textDim, fontSize: "13px", lineHeight: 1.8 }}>
              Əgər <span style={{ color: C.text, fontWeight: 500 }}>{email}</span> qeydiyyatdadırsa,<br />sıfırlama linki göndərildi.
            </p>
          </div>
        )}
        <button onClick={onBack} style={{
          background: "none", border: "none", color: C.textDim, cursor: "pointer",
          fontFamily: F.ui, fontSize: "12px", width: "100%", textAlign: "center", marginTop: 16,
        }}>← Girişə qayıt</button>
      </AuthCard>
    </CenteredPage>
  );
}

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
function ResetPassword({ onSuccess }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const submit = async () => {
    setError("");
    if (pw.length < 6) { setError("Şifrə ən az 6 simvol olmalıdır"); return; }
    if (pw !== pw2) { setError("Şifrələr uyğun gəlmir"); return; }
    if (!token) { setError("Token tapılmadı"); return; }
    setLoading(true);
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: pw }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) { setDone(true); setTimeout(() => onSuccess?.(), 2500); }
    else { setError(data.detail || "Xəta baş verdi"); }
  };

  return (
    <CenteredPage>
      <AuthCard>
        <AuthLogo subtitle="Yeni Şifrə Təyin Et" />
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, color: C.green, marginBottom: 12 }}>✓</div>
            <p style={{ fontFamily: F.ui, color: C.textDim, fontSize: "13px" }}>
              Şifrəniz dəyişdirildi. Giriş səhifəsinə yönləndirilirsiniz...
            </p>
          </div>
        ) : (
          <>
            <ErrBox msg={error} />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[["YENİ ŞİFRƏ", pw, setPw], ["TƏKRARLAYlN", pw2, setPw2]].map(([lbl, val, setter]) => (
                <div key={lbl}>
                  <label style={{ fontFamily: F.display, fontSize: "10px", color: C.textDim, letterSpacing: 2, display: "block", marginBottom: 6, fontWeight: 600 }}>{lbl}</label>
                  <input
                    type="password" value={val}
                    onChange={e => setter(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submit()}
                    style={S.input} placeholder="••••••••"
                  />
                </div>
              ))}
              {pw && pw2 && (
                <div style={{ fontFamily: F.ui, fontSize: "12px", color: pw === pw2 ? C.green : C.red }}>
                  {pw === pw2 ? "✓ Şifrələr uyğundur" : "✕ Şifrələr uyğun gəlmir"}
                </div>
              )}
            </div>
            <button onClick={submit} disabled={loading} style={{ ...S.btnRed, width: "100%", marginTop: 16, opacity: loading ? 0.7 : 1 }}>
              {loading ? "SAXLANILIR..." : "◈ ŞİFRƏNİ YENİLƏ"}
            </button>
          </>
        )}
      </AuthCard>
    </CenteredPage>
  );
}

// ─── AUTH PAGE (Login + Register) ─────────────────────────────────────────────
// ─── AUTH PAGE (Real Login & Register - Təmizlənmiş) ──────────────────────────
function AuthPage({ setView, setUser }) {
  const [mode, setMode] = useState("login");      // login | register
  const [subView, setSubView] = useState("main"); // main | forgot | pending
  const [pendingEmail, setPendingEmail] = useState("");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (subView === "forgot")   return <ForgotPassword onBack={() => setSubView("main")} />;
  if (subView === "pending")  return <VerifyEmailPending email={pendingEmail} onBack={() => setSubView("main")} />;

  const up = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.username || !form.password) {
      setError("İstifadəçi adı və şifrə mütləqdir.");
      return;
    }

    setError(""); 
    setLoading(true);

    const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
    
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: form.username, 
          email: mode === "register" ? form.email : undefined, 
          password: form.password 
        }),
      });
      
      const data = await res.json();

      if (res.ok) {
        if (mode === "register") {
          setPendingEmail(form.email);
          setSubView("pending");
        } else {
          // Real Giriş Uğurludur
          localStorage.setItem("arn_token", data.access_token);
          setUser({
            username: data.user.username,
            plan: data.user.plan,
            isAdmin: data.user.is_admin,
            reqsToday: 0,
          });
          setView(data.user.is_admin ? "admin" : "dashboard");
        }
      } else {
        setError(data.detail || "Giriş rədd edildi.");
      }
    } catch (err) {
      setError("Serverlə əlaqə qurula bilmədi. Koyeb API-nı yoxlayın.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenteredPage>
      <div style={{ width: 420, padding: "44px 40px", ...S.cardRed, position: "relative", zIndex: 1 }}>
        <AuthLogo subtitle={mode === "login" ? "SİSTEMƏ DAXİL OLUN" : "HESAB YARADINIZ"} />

        <ErrBox msg={error} />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Username */}
          <div>
            <label style={{ fontFamily: F.display, fontSize: "10px", color: C.textDim, letterSpacing: 2.5, display: "block", marginBottom: 6, fontWeight: 600 }}>
              İSTİFADƏÇİ ADI
            </label>
            <input value={form.username} onChange={up("username")} style={S.input} placeholder="m_seferov" />
          </div>

          {/* Email (Sadece Qeydiyyatda) */}
          {mode === "register" && (
            <div>
              <label style={{ fontFamily: F.display, fontSize: "10px", color: C.textDim, letterSpacing: 2.5, display: "block", marginBottom: 6, fontWeight: 600 }}>
                E-POÇT
              </label>
              <input type="email" value={form.email} onChange={up("email")} style={S.input} placeholder="email@aztu.edu.az" />
            </div>
          )}

          {/* Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontFamily: F.display, fontSize: "10px", color: C.textDim, letterSpacing: 2.5, fontWeight: 600 }}>
                ŞİFRƏ
              </label>
              {mode === "login" && (
                <button onClick={() => setSubView("forgot")} style={{
                  background: "none", border: "none", color: C.redDim, cursor: "pointer",
                  fontFamily: F.ui, fontSize: "11px",
                }}>Şifrəni unutdum?</button>
              )}
            </div>
            <input
              type="password" value={form.password} onChange={up("password")}
              onKeyDown={e => e.key === "Enter" && submit()}
              style={S.input} placeholder="••••••••"
            />
          </div>

          <button onClick={submit} disabled={loading} style={{ ...S.btnRed, textAlign: "center", marginTop: 6, opacity: loading ? 0.7 : 1, width: "100%" }}>
            {loading ? "GÖZLƏYİN..." : mode === "login" ? "DAXİL OL" : "QEYDIYYAT"}
          </button>
        </div>

        {/* Mode toggle */}
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{
            background: "none", border: "none", color: C.redDim, cursor: "pointer",
            fontFamily: F.ui, fontSize: "12px", letterSpacing: 0.3,
          }}>
            {mode === "login" ? "Hesabınız yoxdur? Qeydiyyat →" : "Artıq hesabınız var? Daxil olun →"}
          </button>
        </div>
      </div>
    </CenteredPage>
  );
}
// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("login"); // login | dashboard | admin | verify | reset
  const [user, setUser] = useState(null);

  // URL-based routing for email verify & password reset
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/verify")         setView("verify");
    if (path === "/reset-password") setView("reset");
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Barlow:wght@300;400;500;600;700&family=Barlow+Condensed:wght@400;600;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #ff0033; }

        @keyframes glitch {
          0%,88%,100% { clip-path: none; transform: none; }
          90% { clip-path: inset(10% 0 80% 0); transform: translateX(-3px); }
          93% { clip-path: inset(60% 0 20% 0); transform: translateX(3px); }
          96% { clip-path: inset(30% 0 50% 0); transform: translateX(-2px); }
        }
        .arn-glitch { position: relative; display: inline-block; }
        .arn-glitch::before, .arn-glitch::after {
          content: attr(data-text);
          position: absolute; top: 0; left: 0;
          font-family: inherit; font-size: inherit; font-weight: inherit;
        }
        .arn-glitch::before {
          animation: glitch 6s infinite;
          color: #00ffff; text-shadow: -2px 0 #00ffff; opacity: 0.5;
        }
        .arn-glitch::after {
          animation: glitch 6s infinite 0.15s reverse;
          color: #ff0033; text-shadow: 2px 0 #ff0033; opacity: 0.4;
        }

        @keyframes scroll-left { from { transform: translateX(100%); } to { transform: translateX(-100%); } }
        .cve-scroll { animation: scroll-left 22s linear infinite; display: inline-block; }

        @keyframes blink { 50% { opacity: 0; } }
        .typing-dots::after { content: "..."; animation: blink 1.2s infinite; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.25s ease forwards; }
      `}</style>

      <div style={{
        background: "#050505", minHeight: "100vh", color: "#e8e8e8",
        fontFamily: "'Barlow', sans-serif", position: "relative", overflow: "hidden",
      }}>
        {/* Scanline overlay */}
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          pointerEvents: "none", zIndex: 9999,
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px)",
        }} />

        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          {view === "login"     && <AuthPage setView={setView} setUser={setUser} />}
          {view === "dashboard" && user && <Dashboard user={user} setUser={setUser} setView={setView} />}
          {view === "admin"     && <AdminPanel setView={setView} />}
          {view === "verify"    && <VerifyEmailResult onSuccess={() => setView("login")} />}
          {view === "reset"     && <ResetPassword onSuccess={() => setView("login")} />}
        </div>
      </div>
    </>
  );
}
