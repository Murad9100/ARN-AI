from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os, uuid, httpx, sqlite3

# ─── TOKEN (Bura toxunma) ───
GEMINI_API_KEY = "AIzaSyBOw0ojqDUOUPnY_qBFNSdjq-wOwsfTFOU"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ARN_SYSTEM_PROMPT = "Sən ARN AI-san — Murad Səfərov tərəfindən yaradılmış dahi və səmimi süni intellektsən. Azərbaycan dilində danış."

@app.get("/health")
def health():
    return {"status": "online", "message": "ARN AI is alive on backend.py!"}

@app.post("/chat/send")
async def chat_send(req: dict):
    user_msg = req.get("message", "").strip()
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
            return {"response": ai_res, "session_id": str(uuid.uuid4())}
        else:
            return {"response": f"API Xətası: {resp.status_code}", "session_id": "error"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
