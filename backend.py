"""
ARN AI — FastAPI Backend (Production Ready)
Stack: FastAPI + SQLite + JWT + Bcrypt + AES-256 + Gemini 1.5 Flash
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

# email_verify.py-nın eyni qovluqda olduğundan əmin ol
from email_verify import (
    run_migration, send_verification_email, send_password_reset_email,
    verify_email_token, verify_reset_token
)

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SECRET_KEY       = os.getenv("ARN_SECRET", "murad_secret_2026")
ALGORITHM        = "HS256"
TOKEN_EXPIRE_H   = 24
AES_KEY          = os.getenv("AES_KEY", "arnai256bitkeyforencryption!!").encode()[:32]
DB_PATH          = "arn_ai.db"
GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "")

# ARN AI-ın xarakteri və bilik çərçivəsi
ARN_SYSTEM_PROMPT = """Sən ARN AI-san — AZTU Cybersecurity departamenti üçün yaradılmış professional Red Team köməkçisi.
Rolun: CTF tapşırıqları, pentest metodologiyası, CVE analizi, recon texnikaları və şəbəkə təhlükəsizliyi sahəsində peşəkar məsləhətlər verməkdir.
Dil: Azərbaycan dili. Tonda: Peşəkar, texniki və strukturlu ol. 
Qeyd: Real hücum kodları (malware/ransomware) vermə, yalnız təhsil və authorized test məqsədli izahlar ver."""

# ─── APP INIT ─────────────────────────────────────────────────────────────────
app = FastAPI(title="ARN AI API", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173", 
        "https://arn-ai-eight.vercel.app"
    ],
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

# ─── AES ENCRYPTION ───────────────────────────────────────────────────────────
def aes_encrypt(plaintext: str) -> str:
    iv = os.urandom(16)
    pad_len = 16 - len(plaintext.encode()) % 16
    padded = plaintext.encode() + bytes([pad_len] * pad_len)
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    enc = cipher.encryptor().update(padded) + cipher.encryptor().finalize()
    return base64.b64encode(iv + enc).decode()

def aes_decrypt(ciphertext: str) -> str:
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

# ─── MODELS ───────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    username: str
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
        send_verification_email(user_id, req.username, req.email)
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
        async with httpx.AsyncClient(timeout=40.0) as client:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            gemini_payload = {
                "contents": [{"parts": [{"text": f"{ARN_SYSTEM_PROMPT}\n\nİstifadəçi sualı: {user_msg}"}]}]
            }
            resp = await client.post(gemini_url, json=gemini_payload)
            
            if resp.status_code == 200:
                result = resp.json()
                try:
                    ai_res = result['candidates'][0]['content']['parts'][0]['text']
                except (KeyError, IndexError):
                    ai_res = "AI cavab hazırlayarkən daxili xəta baş verdi."
            else:
                ai_res = f"AI API xətası (Kod: {resp.status_code}). Zəhmət olmasa bir az sonra yoxlayın."

    # Bazaya qeyd etmə (Şifrəli)
    db.execute("INSERT OR IGNORE INTO chat_sessions (id, user_id, title) VALUES (?, ?, ?)", (session_id, user_id, user_msg[:40]))
    db.execute("INSERT INTO chat_messages (session_id, role, content_enc) VALUES (?, ?, ?)", (session_id, "user", aes_encrypt(user_msg)))
    db.execute("INSERT INTO chat_messages (session_id, role, content_enc) VALUES (?, ?, ?)", (session_id, "assistant", aes_encrypt(ai_res)))
    db.commit()

    return {"response": ai_res, "session_id": session_id}

@app.get("/health")
def health():
    return {"status": "online", "server": "ARN-AI-Production", "version": "1.2.0"}
