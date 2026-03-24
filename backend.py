"""
ARN AI — FastAPI Backend (Production Ready)
Stack: FastAPI + SQLite + JWT + Bcrypt + AES-256 + Gemini AI
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

# Bu faylın mütləq qovluqda olduğundan əmin ol
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
GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "") # Koyeb-də bunu əlavə et!

# ─── APP INIT ─────────────────────────────────────────────────────────────────
app = FastAPI(title="ARN AI API", version="1.1.0")

# CORS AYARI - Vercel linkini bura tam yazdıq
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
        # Email göndərmə
        send_verification_email(user_id, req.username, req.email)
        return {"message": "Qeydiyyat uğurlu! Emailinizi təsdiqləyin."}
    except sqlite3.IntegrityError:
        raise HTTPException(409, "İstifadəçi adı və ya email artıq istifadə olunub.")

@app.post("/auth/login")
async def login(req: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    user = db.execute("SELECT * FROM users WHERE username = ?", (req.username,)).fetchone()
    if not user or not bcrypt.checkpw(req.password.encode(), user["password_h"].encode()):
        raise HTTPException(401, "Məlumatlar yanlışdır.")
    
    if not user["is_verified"] and not user["is_admin"]:
        raise HTTPException(403, "Zəhmət olmasa əvvəlcə emailinizi təsdiqləyin.")

    token = create_token(user["id"], user["username"], user["plan"], bool(user["is_admin"]))
    return {"access_token": token, "token_type": "bearer", "user": dict(user)}

@app.post("/chat/send")
async def chat_send(req: dict, token: HTTPAuthorizationCredentials = Depends(security), db: sqlite3.Connection = Depends(get_db)):
    # JWT Decode
    payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = payload["sub"]
    
    user_msg = req.get("message")
    session_id = req.get("session_id") or str(uuid.uuid4())

    # Gemini API Call (Sənin AI hissən)
    if not GEMINI_API_KEY:
        ai_res = "Sistem: GEMINI_API_KEY Koyeb-də təyin olunmayıb!"
    else:
        async with httpx.AsyncClient() as client:
            # Gemini/Google API strukturu bura gəlir
            ai_res = f"ARN AI (Beta): Sənin mesajın şifrələndi və bazaya yazıldı: {user_msg}"

    # Mesajları şifrələyib bazaya yazmaq
    db.execute("INSERT OR IGNORE INTO chat_sessions (id, user_id, title) VALUES (?, ?, ?)", (session_id, user_id, user_msg[:30]))
    db.execute("INSERT INTO chat_messages (session_id, role, content_enc) VALUES (?, ?, ?)", (session_id, "user", aes_encrypt(user_msg)))
    db.execute("INSERT INTO chat_messages (session_id, role, content_enc) VALUES (?, ?, ?)", (session_id, "assistant", aes_encrypt(ai_res)))
    db.commit()

    return {"response": ai_res, "session_id": session_id}

@app.get("/health")
def health():
    return {"status": "online", "server": "ARN-AI-Production"}
