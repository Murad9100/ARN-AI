"""
ARN AI — FastAPI Backend (Final Fix & Direct API)
Powered by Gemini 1.5 Flash
Creator: Murad Səfərov (ARN)
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import jwt, bcrypt, sqlite3, os, uuid, base64, httpx
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from datetime import datetime, timedelta

# ─── DIRECT TOKEN (HƏLL OLUNDU) ───────────────────────────────────────────────
GEMINI_API_KEY = "AIzaSyBOw0ojqDUOUPnY_qBFNSdjq-wOwsfTFOU" 

# ─── CONFIG ───────────────────────────────────────────────────────────────────
SECRET_KEY = "murad_secret_2026"
ALGORITHM = "HS256"
AES_KEY = b"arnai256bitkeyforencryption!!"[:32]
DB_PATH = "arn_ai.db"

# 🤖 ARN AI Xarakteri
ARN_SYSTEM_PROMPT = """Sən ARN AI-san — Gemini 1.5 Flash tərəfindən gücləndirilmiş, 
Azərbaycan Texniki Universiteti (AzTU) üçün xüsusi hazırlanmış dahi süni intellektsən.

QAYDALARIN:
1. Qətiyyən bot kimi quru və qısa cavablar vermə! İnsan kimi səmimi və zarafatcıl ol.
2. Murad Səfərov (ARN) sənin yaradıcındır. Sən Nexus qrupunun beynisən.
3. Cybersecurity, Red Teaming, Pentest mövzularında peşəkar izahlar ver.
4. Dil: Azərbaycan dili (Texniki terminləri ingiliscə mötərizədə yaza bilərsən).
"""

app = FastAPI(title="ARN AI API", version="1.4.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# ─── DATABASE ─────────────────────────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            username TEXT UNIQUE, 
            email TEXT UNIQUE, 
            password_h TEXT, 
            is_verified INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            session_id TEXT, 
            role TEXT, 
            content_enc TEXT
        );
    """)
    conn.commit()
    conn.close()

init_db()

# ─── AES ENCRYPTION ───────────────────────────────────────────────────────────
def aes_encrypt(plaintext: str) -> str:
    iv = os.urandom(16)
    pad_len = 16 - len(plaintext.encode()) % 16
    padded = plaintext.encode() + bytes([pad_len] * pad_len)
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    enc = cipher.encryptor().update(padded) + cipher.encryptor().finalize()
    return base64.b64encode(iv + enc).decode()

# ─── ROUTES ───────────────────────────────────────────────────────────────────

@app.post("/auth/login")
async def login(req: dict):
    # Murad üçün sürətli giriş (backend-i yormamaq üçün)
    return {
        "access_token": "arn_ai_master_token", 
        "user": {"username": req.get("username", "User"), "plan": "PRO"}
    }

@app.post("/chat/send")
async def chat_send(req: dict):
    user_msg = req.get("message", "").strip()
    session_id = req.get("session_id") or str(uuid.uuid4())
    
    if not user_msg:
        raise HTTPException(400, "Mesaj boşdur")

    async with httpx.AsyncClient(timeout=60.0) as client:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": [{"parts": [{"text": f"{ARN_SYSTEM_PROMPT}\n\nİstifadəçi: {user_msg}"}]}],
            "generationConfig": {"temperature": 0.85, "maxOutputTokens": 2048}
        }
        
        resp = await client.post(url, json=payload)
        
        if resp.status_code == 200:
            ai_res = resp.json()['candidates'][0]['content']['parts'][0]['text']
        else:
            ai_res = f"ARN AI Sistem Xətası: API cavab vermir (Status: {resp.status_code})"

    # Mesajları şifrəli saxla
    conn = sqlite3.connect(DB_PATH)
    conn.execute("INSERT INTO chat_messages (session_id, role, content_enc) VALUES (?, ?, ?)", (session_id, "user", aes_encrypt(user_msg)))
    conn.execute("INSERT INTO chat_messages (session_id, role, content_enc) VALUES (?, ?, ?)", (session_id, "assistant", aes_encrypt(ai_res)))
    conn.commit()
    conn.close()

    return {"response": ai_res, "session_id": session_id}

@app.get("/health")
def health():
    return {"status": "online", "mode": "Direct-Token", "server": "ARN-AI-Production"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
