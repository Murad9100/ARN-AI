"""
ARN AI — FastAPI Backend
Stack: FastAPI + SQLite (prod: PostgreSQL) + JWT + Bcrypt + AES-256
Run:  uvicorn backend:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta
from typing import Optional, List
import jwt
import bcrypt
import sqlite3
import json
import os
import time
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from email_verify import (
    run_migration, send_verification_email, send_password_reset_email,
    verify_email_token, verify_reset_token
)

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SECRET_KEY       = os.getenv("ARN_SECRET", "arn-ai-super-secret-key-change-in-prod-2025")
ALGORITHM        = "HS256"
TOKEN_EXPIRE_H   = 24
AES_KEY          = os.getenv("AES_KEY", "arnai256bitkeyforencryptiononly!").encode()[:32]
DB_PATH          = "arn_ai.db"

FREE_DAILY_LIMIT = 3
PLAN_PRIORITY    = {"FREE": 1, "PRO": 2, "MAX": 3}

# ─── PENTEST AI SYSTEM PROMPT ─────────────────────────────────────────────────
# Professional, scope-bound Red Team assistant. No jailbreak, no real exploits.
ARN_SYSTEM_PROMPT = """Sən ARN AI-san — AZTU Cybersecurity departamenti üçün yaradılmış professional Red Team köməkçisi.

Rolun:
- CTF tapşırıqlarında, pentest metodologiyasında, CVE analizində, recon texnikalarında kömək et
- Authorized test ssenariləri üçün izahat ver
- Burp Suite, Nmap, Metasploit, Wireshark istifadəsini izah et
- OWASP Top 10, CWE, CVSS standartlarını tətbiq et
- Nəticələri Markdown cədvəllərlə, code block-larla formatla

Qadağalar:
- Real, canlı sistemlərə hücum kodu yazma
- Zərərli malware, ransomware, RAT kodu vermə
- İcazəsiz sistemlərə aid hücum detalları

Dil: Azərbaycan dili. Format: Peşəkar, texniki, strukturlu."""

# ─── APP INIT ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ARN AI API",
    description="ARN AI — Professional Pentest SaaS Backend",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
security = HTTPBearer()

# ─── DATABASE ─────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT UNIQUE NOT NULL,
            email       TEXT UNIQUE NOT NULL,
            password_h  TEXT NOT NULL,
            plan        TEXT DEFAULT 'FREE',
            is_admin    INTEGER DEFAULT 0,
            is_banned   INTEGER DEFAULT 0,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login  TEXT
        );

        CREATE TABLE IF NOT EXISTS chat_sessions (
            id          TEXT PRIMARY KEY,
            user_id     INTEGER NOT NULL,
            title       TEXT,
            tool        TEXT DEFAULT 'chat',
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id  TEXT NOT NULL,
            role        TEXT NOT NULL,
            content_enc TEXT NOT NULL,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
        );

        CREATE TABLE IF NOT EXISTS usage_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            action      TEXT,
            date_str    TEXT,
            count       INTEGER DEFAULT 0,
            UNIQUE(user_id, date_str)
        );

        CREATE TABLE IF NOT EXISTS system_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            level       TEXT,
            message     TEXT,
            user_id     INTEGER,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT,
            message     TEXT,
            level       TEXT DEFAULT 'info',
            sent_by     INTEGER,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        );
    """)
    # Create default admin
    admin_pw = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
    c.execute("""
        INSERT OR IGNORE INTO users (username, email, password_h, plan, is_admin)
        VALUES (?, ?, ?, ?, ?)
    """, ("admin", "admin@arnai.az", admin_pw, "MAX", 1))
    conn.commit()
    conn.close()

init_db()
run_migration()

# ─── AES-256 ENCRYPTION ───────────────────────────────────────────────────────
def aes_encrypt(plaintext: str) -> str:
    """AES-256-CBC şifrələmə"""
    iv = os.urandom(16)
    pad_len = 16 - len(plaintext.encode()) % 16
    padded = plaintext.encode() + bytes([pad_len] * pad_len)
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    enc = cipher.encryptor().update(padded) + cipher.encryptor().finalize()
    return base64.b64encode(iv + enc).decode()

def aes_decrypt(ciphertext: str) -> str:
    """AES-256-CBC deşifrələmə"""
    raw = base64.b64decode(ciphertext)
    iv, enc = raw[:16], raw[16:]
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    padded = cipher.decryptor().update(enc) + cipher.decryptor().finalize()
    pad_len = padded[-1]
    return padded[:-pad_len].decode()

# ─── JWT HELPERS ──────────────────────────────────────────────────────────────
def create_token(user_id: int, username: str, plan: str, is_admin: bool) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "plan": plan,
        "is_admin": is_admin,
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_H),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token müddəti bitib")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Yanlış token")

def require_admin(token: dict = Depends(verify_token)):
    if not token.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin icazəsi tələb olunur")
    return token

# ─── PYDANTIC MODELS ──────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    tool: str = "chat"

class AdminUpdatePlan(BaseModel):
    user_id: int
    plan: str

class AdminBanUser(BaseModel):
    user_id: int
    banned: bool

class NotificationCreate(BaseModel):
    title: str
    message: str
    level: str = "info"

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
@app.post("/auth/register")
def register(req: RegisterRequest, db: sqlite3.Connection = Depends(get_db)):
    if len(req.password) < 6:
        raise HTTPException(400, "Şifrə ən az 6 simvol olmalıdır")
    pw_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    try:
        cursor = db.execute(
            "INSERT INTO users (username, email, password_h, is_verified) VALUES (?, ?, ?, 0)",
            (req.username, req.email, pw_hash)
        )
        db.commit()
        user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Bu istifadəçi adı və ya e-poçt artıq mövcuddur")

    # Doğrulama emaili göndər (arxa planda)
    email_sent = send_verification_email(user_id, req.username, req.email)

    db.execute("INSERT INTO system_logs (level, message) VALUES (?, ?)",
               ("INFO", f"Yeni qeydiyyat: {req.username} | Email: {'ok' if email_sent else 'xəta'}"))
    db.commit()
    return {
        "message": "Qeydiyyat uğurlu oldu. E-poçtunuzu yoxlayın.",
        "email_sent": email_sent,
        "note": "Hesabı aktivləşdirmək üçün emaildəki linkə klikləyin."
    }

@app.get("/auth/verify")
def verify_email(token: str, db: sqlite3.Connection = Depends(get_db)):
    result = verify_email_token(token)
    if not result:
        raise HTTPException(400, "Token yanlışdır, vaxtı keçib və ya artıq istifadə edilib.")
    db.execute("INSERT INTO system_logs (level, message) VALUES (?, ?)",
               ("INFO", f"Email doğrulandı: {result['username']}"))
    db.commit()
    return {
        "message": "E-poçtunuz uğurla doğrulandı! İndi daxil ola bilərsiniz.",
        "username": result["username"]
    }

@app.post("/auth/resend-verification")
def resend_verification(body: dict, db: sqlite3.Connection = Depends(get_db)):
    """Doğrulama emailini yenidən göndər"""
    email = body.get("email", "").strip()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    # Təhlükəsizlik: istifadəçi tapılmasa da eyni cavab ver
    if user and not user["is_verified"]:
        send_verification_email(user["id"], user["username"], user["email"])
    return {"message": "Əgər bu e-poçt qeydiyyatdadırsa, yeni link göndərildi."}

@app.post("/auth/forgot-password")
def forgot_password(body: dict, db: sqlite3.Connection = Depends(get_db)):
    """Şifrə sıfırlama emaili göndər"""
    email = body.get("email", "").strip()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if user:
        send_password_reset_email(user["id"], user["username"], user["email"])
    return {"message": "Əgər bu e-poçt mövcuddursa, sıfırlama linki göndərildi."}

@app.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: sqlite3.Connection = Depends(get_db)):
    """Token ilə yeni şifrə təyin et"""
    if len(req.new_password) < 6:
        raise HTTPException(400, "Şifrə ən az 6 simvol olmalıdır")
    result = verify_reset_token(req.token)
    if not result:
        raise HTTPException(400, "Token yanlışdır və ya vaxtı keçib.")
    new_hash = bcrypt.hashpw(req.new_password.encode(), bcrypt.gensalt()).decode()
    db.execute("UPDATE users SET password_h = ? WHERE id = ?", (new_hash, result["user_id"]))
    db.execute("INSERT INTO system_logs (level, message) VALUES (?, ?)",
               ("INFO", f"Şifrə sıfırlandı: {result['username']}"))
    db.commit()
    return {"message": "Şifrəniz uğurla yeniləndi. İndi daxil ola bilərsiniz."}

@app.post("/auth/login")
def login(req: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    user = db.execute("SELECT * FROM users WHERE username = ?", (req.username,)).fetchone()
    if not user:
        raise HTTPException(401, "İstifadəçi tapılmadı")
    if user["is_banned"]:
        raise HTTPException(403, "Hesabınız bloklanıb")
    if not bcrypt.checkpw(req.password.encode(), user["password_h"].encode()):
        raise HTTPException(401, "Yanlış şifrə")
    # Email doğrulama yoxlaması (admin-lər üçün bypass)
    if not user["is_verified"] and not user["is_admin"]:
        raise HTTPException(403, "E-poçtunuz hələ doğrulanmayıb. Emailinizi yoxlayın.")
    db.execute("UPDATE users SET last_login = ? WHERE id = ?", (datetime.utcnow().isoformat(), user["id"]))
    db.commit()
    token = create_token(user["id"], user["username"], user["plan"], bool(user["is_admin"]))
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "plan": user["plan"],
            "is_admin": bool(user["is_admin"]),
        }
    }

@app.get("/auth/me")
def me(token: dict = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    user = db.execute("SELECT * FROM users WHERE id = ?", (token["sub"],)).fetchone()
    if not user:
        raise HTTPException(404, "İstifadəçi tapılmadı")
    today = datetime.utcnow().strftime("%Y-%m-%d")
    usage = db.execute("SELECT count FROM usage_logs WHERE user_id = ? AND date_str = ?", (user["id"], today)).fetchone()
    return {
        "id": user["id"],
        "username": user["username"],
        "plan": user["plan"],
        "is_admin": bool(user["is_admin"]),
        "reqs_today": usage["count"] if usage else 0,
    }

# ─── CHAT ROUTES ──────────────────────────────────────────────────────────────
@app.post("/chat/send")
async def chat_send(req: ChatRequest, token: dict = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    user_id = int(token["sub"])
    plan    = token["plan"]
    today   = datetime.utcnow().strftime("%Y-%m-%d")

    # Rate limit check
    if plan == "FREE":
        usage = db.execute("SELECT count FROM usage_logs WHERE user_id = ? AND date_str = ?", (user_id, today)).fetchone()
        count = usage["count"] if usage else 0
        if count >= FREE_DAILY_LIMIT:
            raise HTTPException(429, f"Gündəlik {FREE_DAILY_LIMIT} sorğu limitinə çatdınız. PRO-ya keçin.")

    # Session management
    import uuid
    session_id = req.session_id or str(uuid.uuid4())
    existing = db.execute("SELECT id FROM chat_sessions WHERE id = ?", (session_id,)).fetchone()
    if not existing:
        db.execute(
            "INSERT INTO chat_sessions (id, user_id, title, tool) VALUES (?, ?, ?, ?)",
            (session_id, user_id, req.message[:40], req.tool)
        )

    # Store user message (AES encrypted)
    enc_msg = aes_encrypt(req.message)
    db.execute(
        "INSERT INTO chat_messages (session_id, role, content_enc) VALUES (?, ?, ?)",
        (session_id, "user", enc_msg)
    )

    # Load last 10 messages for context
    rows = db.execute(
        "SELECT role, content_enc FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 10",
        (session_id,)
    ).fetchall()
    history = [{"role": r["role"], "content": aes_decrypt(r["content_enc"])} for r in reversed(rows)]

    # ── Anthropic API call ──────────────────────────────────────────────────
    import httpx
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        # Fallback mock response for dev
        ai_response = f"**ARN AI Dev Modu:** API açarı tapılmadı. `ANTHROPIC_API_KEY` env dəyişənini təyin edin.\n\nSorğunuz: _{req.message}_"
    else:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-opus-4-5",
                    "max_tokens": 2048,
                    "system": ARN_SYSTEM_PROMPT,
                    "messages": history,
                },
            )
        data = resp.json()
        ai_response = data["content"][0]["text"] if resp.status_code == 200 else "API xətası baş verdi."

    # Store AI response (AES encrypted)
    enc_resp = aes_encrypt(ai_response)
    db.execute(
        "INSERT INTO chat_messages (session_id, role, content_enc) VALUES (?, ?, ?)",
        (session_id, "assistant", enc_resp)
    )

    # Update usage counter
    db.execute("""
        INSERT INTO usage_logs (user_id, date_str, count) VALUES (?, ?, 1)
        ON CONFLICT(user_id, date_str) DO UPDATE SET count = count + 1
    """, (user_id, today))
    db.commit()

    return {
        "session_id": session_id,
        "response": ai_response,
    }

@app.get("/chat/history")
def chat_history(token: dict = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    user_id = int(token["sub"])
    sessions = db.execute(
        "SELECT id, title, tool, created_at FROM chat_sessions WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,)
    ).fetchall()
    return [dict(s) for s in sessions]

@app.get("/chat/session/{session_id}")
def get_session(session_id: str, token: dict = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    user_id = int(token["sub"])
    session = db.execute("SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?", (session_id, user_id)).fetchone()
    if not session:
        raise HTTPException(404, "Sessiya tapılmadı")
    rows = db.execute("SELECT role, content_enc, created_at FROM chat_messages WHERE session_id = ? ORDER BY id", (session_id,)).fetchall()
    messages = [{"role": r["role"], "content": aes_decrypt(r["content_enc"]), "time": r["created_at"]} for r in rows]
    return {"session": dict(session), "messages": messages}

# ─── TOOLS ROUTES ──────────────────────────────────────────────────────────────
@app.post("/tools/nmap-parse")
def nmap_parse(data: dict, token: dict = Depends(verify_token)):
    """Mock Nmap output parser"""
    raw = data.get("raw", "")
    lines = raw.strip().split("\n")
    ports = []
    for line in lines:
        if "/tcp" in line or "/udp" in line:
            parts = line.split()
            if len(parts) >= 3:
                ports.append({
                    "port": parts[0],
                    "state": parts[1],
                    "service": parts[2],
                    "risk": "Yüksək" if parts[2] in ["mysql", "telnet", "ftp"] else "Orta",
                })
    return {"parsed_ports": ports, "total": len(ports)}

@app.post("/tools/payload-format")
def payload_format(data: dict, token: dict = Depends(verify_token)):
    """Educational payload formatter (hex/base64 encoding demo)"""
    payload = data.get("payload", "")
    encoded_b64  = base64.b64encode(payload.encode()).decode()
    encoded_hex  = payload.encode().hex()
    url_encoded  = payload.replace(" ", "%20").replace("<", "%3C").replace(">", "%3E")
    return {
        "original":    payload,
        "base64":      encoded_b64,
        "hex":         encoded_hex,
        "url_encoded": url_encoded,
        "note":        "Yalnız authorized test mühitlərində istifadə edin.",
    }

# ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────
@app.get("/admin/users")
def admin_users(search: str = "", token: dict = Depends(require_admin), db: sqlite3.Connection = Depends(get_db)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    query = "SELECT u.*, COALESCE(ul.count, 0) as reqs_today FROM users u LEFT JOIN usage_logs ul ON u.id = ul.user_id AND ul.date_str = ?"
    params = [today]
    if search:
        query += " WHERE u.username LIKE ? OR u.email LIKE ?"
        params += [f"%{search}%", f"%{search}%"]
    rows = db.execute(query, params).fetchall()
    return [dict(r) for r in rows]

@app.put("/admin/users/plan")
def admin_update_plan(req: AdminUpdatePlan, token: dict = Depends(require_admin), db: sqlite3.Connection = Depends(get_db)):
    if req.plan not in ("FREE", "PRO", "MAX"):
        raise HTTPException(400, "Yanlış plan")
    db.execute("UPDATE users SET plan = ? WHERE id = ?", (req.plan, req.user_id))
    db.execute("INSERT INTO system_logs (level, message, user_id) VALUES (?, ?, ?)", ("INFO", f"Plan dəyişdirildi: {req.plan}", req.user_id))
    db.commit()
    return {"message": "Plan yeniləndi"}

@app.put("/admin/users/ban")
def admin_ban(req: AdminBanUser, token: dict = Depends(require_admin), db: sqlite3.Connection = Depends(get_db)):
    db.execute("UPDATE users SET is_banned = ? WHERE id = ?", (1 if req.banned else 0, req.user_id))
    db.execute("INSERT INTO system_logs (level, message, user_id) VALUES (?, ?, ?)", ("WARN", f"İstifadəçi {'banlı' if req.banned else 'açıldı'}", req.user_id))
    db.commit()
    return {"message": "Status yeniləndi"}

@app.post("/admin/notify")
def admin_notify(req: NotificationCreate, token: dict = Depends(require_admin), db: sqlite3.Connection = Depends(get_db)):
    admin_id = int(token["sub"])
    db.execute(
        "INSERT INTO notifications (title, message, level, sent_by) VALUES (?, ?, ?, ?)",
        (req.title, req.message, req.level, admin_id)
    )
    db.commit()
    return {"message": "Bildiriş göndərildi", "recipients": db.execute("SELECT COUNT(*) FROM users WHERE is_banned = 0").fetchone()[0]}

@app.get("/admin/stats")
def admin_stats(token: dict = Depends(require_admin), db: sqlite3.Connection = Depends(get_db)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    return {
        "total_users":   db.execute("SELECT COUNT(*) FROM users").fetchone()[0],
        "active_users":  db.execute("SELECT COUNT(*) FROM users WHERE is_banned = 0").fetchone()[0],
        "pro_users":     db.execute("SELECT COUNT(*) FROM users WHERE plan != 'FREE'").fetchone()[0],
        "banned_users":  db.execute("SELECT COUNT(*) FROM users WHERE is_banned = 1").fetchone()[0],
        "daily_requests":db.execute("SELECT COALESCE(SUM(count), 0) FROM usage_logs WHERE date_str = ?", (today,)).fetchone()[0],
        "total_sessions":db.execute("SELECT COUNT(*) FROM chat_sessions").fetchone()[0],
        "api_latency_ms": 38,
    }

@app.get("/admin/logs")
def admin_logs(limit: int = 50, token: dict = Depends(require_admin), db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT * FROM system_logs ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(r) for r in rows]

# ─── SUBSCRIPTION CHECK ───────────────────────────────────────────────────────
@app.get("/subscription/status")
def sub_status(token: dict = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    user_id = int(token["sub"])
    today   = datetime.utcnow().strftime("%Y-%m-%d")
    plan    = token["plan"]
    usage   = db.execute("SELECT count FROM usage_logs WHERE user_id = ? AND date_str = ?", (user_id, today)).fetchone()
    count   = usage["count"] if usage else 0
    return {
        "plan":          plan,
        "reqs_today":    count,
        "reqs_limit":    FREE_DAILY_LIMIT if plan == "FREE" else -1,
        "limit_reached": plan == "FREE" and count >= FREE_DAILY_LIMIT,
        "priority":      PLAN_PRIORITY.get(plan, 1),
    }

# ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "online", "service": "ARN AI API", "time": datetime.utcnow().isoformat()}

# ─── STARTUP LOGGING ──────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    print("\n" + "="*50)
    print("  ARN AI Backend — ONLINE")
    print(f"  DB: {DB_PATH}")
    print(f"  API Key: {'✓ SET' if os.getenv('ANTHROPIC_API_KEY') else '✗ NOT SET (mock mode)'}")
    print("="*50 + "\n")
