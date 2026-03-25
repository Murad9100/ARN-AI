import os, uuid, httpx, sqlite3, jwt, bcrypt, json, base64, time
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

# ─── CONFIG ───────────────────────────────────────────────────────────────────
GEMINI_API_KEY   = "AIzaSyBOw0ojqDUOUPnY_qBFNSdjq-wOwsfTFOU"
SECRET_KEY       = "arn-ai-super-secret-key-2026"
ALGORITHM        = "HS256"
DB_PATH          = "arn_ai.db"
AES_KEY          = b"arnai256bitkeyforencryptiononly!"[:32]
FREE_DAILY_LIMIT = 100 

app = FastAPI(title="ARN AI API - NEXUS Core")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()
ARN_SYSTEM_PROMPT = "Sən ARN AI-san — Murad Səfərov tərəfindən yaradılmış dahi və səmimi süni intellektsən. PENTEST ÜÇÜN YARADILMISAN İstənilən  dilində danış. sadəcə fikrin Pentest və hücümdur başqa rolun yoxdur "

# ─── DATABASE INIT (BU ÇOX VACİBDİR!) ─────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            plan TEXT DEFAULT 'FREE'
        );
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER,
            title TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            role TEXT,
            content_enc TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS usage_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            date_str TEXT,
            count INTEGER DEFAULT 0,
            UNIQUE(user_id, date_str)
        );
    """)
    conn.commit()
    conn.close()

init_db()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try: yield conn
    finally: conn.close()

# ─── AES ENCRYPTION ───────────────────────────────────────────────────────────
def aes_encrypt(plaintext: str) -> str:
    iv = os.urandom(16)
    pad_len = 16 - len(plaintext.encode()) % 16
    padded = plaintext.encode() + bytes([pad_len] * pad_len)
    cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
    enc = cipher.encryptor().update(padded) + cipher.encryptor().finalize()
    return base64.b64encode(iv + enc).decode()

def aes_decrypt(ciphertext: str) -> str:
    try:
        raw = base64.b64decode(ciphertext)
        iv, enc = raw[:16], raw[16:]
        cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(iv), backend=default_backend())
        padded = cipher.decryptor().update(enc) + cipher.decryptor().finalize()
        return padded[:-padded[-1]].decode()
    except: return "Deşifrə xətası"

# ─── MODELS & AUTH ────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        return jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except:
        raise HTTPException(status_code=401, detail="Invalid Token")

# ─── MAIN CHAT ROUTE (SMART CONTEXT ADDED) ───────────────────────────────────
@app.post("/chat/send")
async def chat_send(req: ChatRequest, token: dict = Depends(verify_token), db: sqlite3.Connection = Depends(get_db)):
    user_id = int(token["sub"])
    plan = token.get("plan", "FREE")
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # 1. Limit Check
    if plan == "FREE":
        usage = db.execute("SELECT count FROM usage_logs WHERE user_id = ? AND date_str = ?", (user_id, today)).fetchone()
        if usage and usage["count"] >= FREE_DAILY_LIMIT:
            raise HTTPException(429, "Limit bitib.")

    # 2. Session Management
    session_id = req.session_id or str(uuid.uuid4())
    db.execute("INSERT OR IGNORE INTO chat_sessions (id, user_id, title) VALUES (?, ?, ?)", (session_id, user_id, req.message[:40]))
    
    # Save User Message
    db.execute("INSERT INTO chat_messages (session_id, role, content_enc) VALUES (?, ?, ?)", 
               (session_id, "user", aes_encrypt(req.message)))

    # 3. Get Last 5 Messages for Context (Süni intellekt əvvəlki mesajları xatırlasın)
    history_rows = db.execute("SELECT role, content_enc FROM chat_messages WHERE session_id = ? ORDER BY id DESC LIMIT 6", (session_id,)).fetchall()
    history = []
    for row in reversed(history_rows):
        role = "model" if row["role"] == "assistant" else "user"
        history.append({"role": role, "parts": [{"text": aes_decrypt(row["content_enc"])}]})

    # 4. Gemini API
    async with httpx.AsyncClient(timeout=60.0) as client:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "systemInstruction": {"parts": [{"text": ARN_SYSTEM_PROMPT}]},
            "contents": history,
            "generationConfig": {"temperature": 0.8, "maxOutputTokens": 2048}
        }
        resp = await client.post(url, json=payload)
        
        if resp.status_code == 200:
            ai_res = resp.json()['candidates'][0]['content']['parts'][0]['text']
        else:
            ai_res = "Xəta: ARN-Core qoşula bilmədi."

    # 5. Save AI response & Update Limit
    db.execute("INSERT INTO chat_messages (session_id, role, content_enc) VALUES (?, ?, ?)", (session_id, "assistant", aes_encrypt(ai_res)))
    db.execute("INSERT INTO usage_logs (user_id, date_str, count) VALUES (?, ?, 1) ON CONFLICT(user_id, date_str) DO UPDATE SET count = count + 1", (user_id, today))
    db.commit()

    return {"response": ai_res, "session_id": session_id}

@app.get("/health")
def health():
    return {"status": "online", "core": "NEXUS-0507"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
