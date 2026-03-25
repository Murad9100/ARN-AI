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
    def run_migration(): pass

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SECRET_KEY       = os.getenv("ARN_SECRET", "murad_secret_2026")
ALGORITHM        = "HS256"
TOKEN_EXPIRE_H   = 24
AES_KEY          = os.getenv("AES_KEY", "arnai256bitkeyforencryption!!").encode()[:32]
DB_PATH          = "arn_ai.db"

# GEMINI API KEY LOGGING (Xətanı tapmaq üçün)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

print("==================================================")
if not GEMINI_API_KEY:
    print("❌ XƏTA: GEMINI_API_KEY tapılmadı! Koyeb Settings-i yoxla.")
else:
    print(f"✅ GEMINI_API_KEY yükləndi: {GEMINI_API_KEY[:6]}***")
print("==================================================")

# 🤖 ARN AI-ın Canlı Xarakteri
ARN_SYSTEM_PROMPT = """Sən ARN AI-san — Gemini 1.5 Flash tərəfindən idarə olunan, 
Azərbaycan Texniki Universiteti (AzTU) üçün xüsusi yaradılmış dahi süni intellektsən.

QAYDALARIN:
1. Bot kimi quru və qısa cavablar vermə! İnsan kimi, səmimi və zarafatcıl ol.
2. Murad Səfərov (ARN) sənin yaradıcındır. Nexus qrupunun beynisən.
3. Cybersecurity, Red Teaming və texnologiya mövzusunda dahi səviyyəsində danış.
4. Dil: Azərbaycan dili.
"""

# ─── APP INIT ─────────────────────────────────────────────────────────────────
app = FastAPI(title="ARN AI API", version="1.3.5")

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
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP
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

# ─── AES ENCRYPTION ───────────────────────────────────────────────────────────
def aes_encrypt(plaintext: str) -> str:
    iv = os.urandom(16)
    pad_len = 16 - len(plaintext.encode()) % 16
    padded = plaintext.encode() + bytes([pad_len] * pad_len)
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    enc = cipher.encryptor().update(padded) + cipher.encryptor().finalize()
    return base64.b64encode(iv + enc).decode()

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

class LoginRequest(BaseModel):
    username: str
    password: str

# ─── ROUTES ───────────────────────────────────────────────────────────────────

@app.post("/auth/login")
async def login(req: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    user = db.execute("SELECT * FROM users WHERE username = ?", (req.username,)).fetchone()
    if not user or not bcrypt.checkpw(req.password.encode(), user["password_h"].encode()):
        raise HTTPException(401, "Məlumatlar yanlışdır.")
    
    token = create_token(user["id"], user["username"], user["plan"], bool(user["is_admin"]))
    return {"access_token": token, "token_type": "bearer", "user": dict(user)}

@app.post("/chat/send")
async def chat_send(req: dict, token: HTTPAuthorizationCredentials = Depends(security), db: sqlite3.Connection = Depends(get_db)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload["sub"]
    except:
        raise HTTPException(401, "Token xətası")
    
    user_msg = req.get("message", "").strip()
    session_id = req.get("session_id") or str(uuid.uuid4())

    if not GEMINI_API_KEY:
        ai_res = "Sistem Xətası: API Key serverdə tapılmadı (Koyeb settings-ə bax)."
    else:
        async with httpx.AsyncClient(timeout=60.0) as client:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            
            gemini_payload = {
                "contents": [{"parts": [{"text": f"{ARN_SYSTEM_PROMPT}\n\nİstifadəçi: {user_msg}"}]}],
                "generationConfig": {
                    "temperature": 0.85, # İnsani olması üçün
                    "maxOutputTokens": 2048
                }
            }
            
            resp = await client.post(gemini_url, json=gemini_payload)
            if resp.status_code == 200:
                ai_res = resp.json()['candidates'][0]['content']['parts'][0]['text']
            else:
                ai_res = f"AI Xətası: API cavab vermədi (Kod: {resp.status_code})"

    # Bazaya qeyd etmə
    db.execute("INSERT OR IGNORE INTO chat_sessions (id, user_id, title) VALUES (?, ?, ?)", (session_id, user_id, user_msg[:40]))
    db.execute("INSERT INTO chat_messages (session_id, role, content_enc) VALUES (?, ?, ?)", (session_id, "user", aes_encrypt(user_msg)))
    db.execute("INSERT INTO chat_messages (session_id, role, content_enc) VALUES (?, ?, ?)", (session_id, "assistant", aes_encrypt(ai_res)))
    db.commit()

    return {"response": ai_res, "session_id": session_id}

@app.get("/health")
def health():
    return {"status": "online", "key_status": "OK" if GEMINI_API_KEY else "MISSING"}
