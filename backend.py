"""
ARN AI — FastAPI Backend (Final Stable Version)
Powered by Gemini 1.5 Flash
Creator: Murad Səfərov (ARN)
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
import os
import uuid
import base64
import httpx
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

# email_verify.py eyni qovluqda olmalıdır
try:
    from email_verify import (
        run_migration, send_verification_email, send_password_reset_email,
        verify_email_token, verify_reset_token
    )
except ImportError:
    # Fayl yoxdursa xəta verməməsi üçün placeholder (Ehtiyat üçün)
    def run_migration(): pass

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SECRET_KEY       = os.getenv("ARN_SECRET", "murad_secret_2026")
ALGORITHM        = "HS256"
TOKEN_EXPIRE_H   = 24
AES_KEY          = os.getenv("AES_KEY", "arnai256bitkeyforencryption!!").encode()[:32]
DB_PATH          = "arn_ai.db"
GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "")

# 🤖 ARN AI-ın Canlı və Peşəkar Xarakteri (Robot deyil!)
ARN_SYSTEM_PROMPT = """Sən ARN AI-san — Gemini 1.5 Flash tərəfindən gücləndirilmiş, 
Azərbaycan Texniki Universiteti (AzTU) üçün xüsusi hazırlanmış dahi süni intellektsən.

QAYDALARIN:
1. Qətiyyən bot kimi quru, qısa və darıxdırıcı cavablar vermə! 
2. Səmimi, dahi bir mütəxəssis və Murad Səfərovun (ARN) yaratdığı bir personaj kimi danış.
3. Cybersecurity, Red Teaming, Pentest və Nexus qrupu haqqında mükəmməl bilgin var.
4. Sualları detallı və maraqlı şəkildə izah et. Zarafatdan anlayırsan.
5. Dil: Azərbaycan dili. (Texniki terminləri ingiliscə mötərizədə qeyd et).
"""

# ─── APP INIT ─────────────────────────────────────────────────────────────────
app = FastAPI(title="ARN AI API", version="1.3.1")

# Bütün girişlərə icazə veririk ki, Vercel-dən gələn sorğular bloklanmasın
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
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
            is_verified INTEGER DEFAULT 0,
            is_admin    INTEGER DEFAULT 0,
            is_banned   INTEGER DEFAULT 0,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login  TEXT
        );
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id          TEXT PRIMARY KEY,
            user_id     INTEGER NOT NULL,
            title       TEXT,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS chat_messages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id  TEXT NOT NULL,
            role        TEXT NOT NULL,
            content_enc TEXT NOT NULL,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()

init_db()
run_migration()

# ─── AES ENCRYPTION (Chat Təhlükəsizliyi) ──────────────────────────────────────
def aes_encrypt(plaintext: str) -> str:
    iv = os.urandom(16)
    pad_len = 16 - len(plaintext.encode()) % 16
    padded = plaintext.encode() + bytes([pad_len] * pad_len)
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    enc = cipher.encryptor().update(padded) + cipher.encryptor().finalize()
    return base64.b64encode(iv + enc).decode()

# ─── AUTH HELPERS ─────────────────────────────────────────────────────────────
def create_token(user_id: int, username: str, plan: str, is_admin: bool) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "plan": plan,
        "is_admin": is_admin,
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_H),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

# ─── ROUTES ───────────────────────────────────────────────────────────────────

@app.post("/auth/register")
async def register(req: RegisterRequest, db: sqlite3.Connection = Depends(get_db)):
    pw_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    try:
        cursor = db.execute(
            "INSERT INTO users (username, email, password_h, is_verified) VALUES (?, ?, ?, 0)",
            (req.username, req.email, pw_hash)
        )
        db.commit()
        user_id = cursor.lastrowid
        try:
            send_verification_email(user_id, req.username, req.email)
        except: pass # Email göndərilməsə belə qeydiyyatı bitir
        return {"message": "Qeydiyyat uğurlu! E-poçtunuzu yoxlayın."}
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Bu istifadəçi adı və ya e-poçt artıq mövcuddur.")

@app.post("/auth/login")
async def login(req: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    user = db.execute("SELECT * FROM users WHERE username = ?", (req.username,)).fetchone()
    if not user or not bcrypt.checkpw(req.password.encode(), user["password_h"].encode()):
        raise HTTPException(401, "İstifadəçi adı və ya şifrə yanlışdır.")
    
    if not user["is_verified"] and not user["is_admin"]:
        raise HTTPException(403, "Zəhmət olmasa əvvəlcə emailinizi təsdiqləyin.")

    token = create_token(user["id"], user["username"], user["plan"], bool(user["is_admin"]))
    return {"access_token": token, "token_type": "bearer", "user": dict(user)}

@app.post("/chat/send")
async def chat_send(req: dict, token: HTTPAuthorizationCredentials = Depends(security), db: sqlite3.Connection = Depends(get_db)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload["sub"]
    except:
        raise HTTPException(401, "Token etibarsızdır")
    
    user_msg = req.get("message", "").strip()
    session_id = req.get("session_id") or str(uuid.uuid4())

    if not user_msg:
        raise HTTPException(400, "Mesaj boş ola bilməz")

    # ── Gemini API İnteqrasiyası ──
    if not GEMINI_API_KEY:
        ai_res = "Sistem Xətası: Gemini API açarı Koyeb-də tapılmadı."
    else:
        async with httpx.AsyncClient(timeout=60.0) as client:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            
            # AI-ın "beynini" açan kreativ ayarlar:
            gemini_payload = {
                "contents": [{"parts": [{"text": f"{ARN_SYSTEM_PROMPT}\n\nİstifadəçi sualı: {user_msg}"}]}],
                "generationConfig": {
                    "temperature": 0.85, # İnsani və geniş cavablar üçün
                    "maxOutputTokens": 2048,
                    "topP": 0.95
                }
            }
            
            resp = await client.post(gemini_url, json=gemini_payload)
            
            if resp.status_code == 200:
                result = resp.json()
                try:
                    ai_res = result['candidates'][0]['content']['parts'][0]['text']
                except:
                    ai_res = "AI cavab hazırlayarkən xəta baş verdi."
            else:
                ai_res = f"API Xətası (Kod: {resp.status_code}). Zəhmət olmasa biraz gözləyin."

    # Bazaya qeyd etmə
    db.execute("INSERT OR IGNORE INTO chat_sessions (id, user_id, title) VALUES (?, ?, ?)", (session_id, user_id, user_msg[:40]))
    db.execute("INSERT INTO chat_messages (session_id, role, content_enc) VALUES (?, ?, ?)", (session_id, "user", aes_encrypt(user_msg)))
    db.execute("INSERT INTO chat_messages (session_id, role, content_enc) VALUES (?, ?, ?)", (session_id, "assistant", aes_encrypt(ai_res)))
    db.commit()

    return {"response": ai_res, "session_id": session_id}

@app.get("/health")
def health():
    return {"status": "online", "server": "ARN-AI-Final", "version": "1.3.1"}
