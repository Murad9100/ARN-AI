"""
ARN AI — Email Doğrulama Modulu
--------------------------------
Axın:
  1. Qeydiyyat → token generasiya → email göndər → is_verified=False
  2. İstifadəçi linkə klik edir → /auth/verify?token=xxx
  3. Token yoxlanılır → is_verified=True → giriş icazəsi verilir

SMTP Provayderləri (seçin birini, .env-ə yazın):
  - Gmail:      smtp.gmail.com:587  (App Password lazımdır)
  - Mailtrap:   sandbox.smtp.mailtrap.io:2525  (dev üçün ideal)
  - Brevo:      smtp-relay.brevo.com:587
  - Resend:     smtp.resend.com:465
"""

import smtplib
import secrets
import sqlite3
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta

# ─── CONFIG ──────────────────────────────────────────────────────────────────
SMTP_HOST     = os.getenv("SMTP_HOST",  "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER",  "your@gmail.com")
SMTP_PASS     = os.getenv("SMTP_PASS",  "app-password-here")
FROM_NAME     = os.getenv("FROM_NAME",  "ARN AI")
FRONTEND_URL  = os.getenv("FRONTEND_URL","http://localhost:3000")
TOKEN_EXPIRE_H = 24   # token 24 saat etibarlıdır

DB_PATH = "arn_ai.db"

# ─── DB MIGRATION ─────────────────────────────────────────────────────────────
MIGRATION_SQL = """
-- Mövcud users cədvəlinə sütunlar əlavə et
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified INTEGER DEFAULT 0;

-- Email doğrulama tokenləri
CREATE TABLE IF NOT EXISTS email_tokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    token       TEXT    NOT NULL UNIQUE,
    purpose     TEXT    NOT NULL DEFAULT 'verify',   -- verify | reset
    expires_at  TEXT    NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_tokens(token);
"""

def run_migration():
    """Verilənlər bazasına email doğrulama sütunlarını əlavə et"""
    conn = sqlite3.connect(DB_PATH)
    try:
        # SQLite ALTER TABLE IF NOT EXISTS dəstəkləmir, əl ilə yoxlayırıq
        cols = [r[1] for r in conn.execute("PRAGMA table_info(users)").fetchall()]
        if "is_verified" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS email_tokens (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id     INTEGER NOT NULL,
                token       TEXT    NOT NULL UNIQUE,
                purpose     TEXT    NOT NULL DEFAULT 'verify',
                expires_at  TEXT    NOT NULL,
                used        INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT    DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_email_tokens_token ON email_tokens(token)")
        conn.commit()
        print("[ARN] Email doğrulama cədvəlləri hazırdır.")
    finally:
        conn.close()

# ─── TOKEN HELPERS ────────────────────────────────────────────────────────────
def generate_token() -> str:
    """64 hex simvollu kriptoqrafik token"""
    return secrets.token_hex(32)

def save_token(user_id: int, purpose: str = "verify") -> str:
    """Token yarat, DB-ə yaz, token string-ini qaytar"""
    token    = generate_token()
    expires  = (datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_H)).isoformat()
    conn = sqlite3.connect(DB_PATH)
    try:
        # Köhnə istifadəsiz tokenləri sil
        conn.execute(
            "DELETE FROM email_tokens WHERE user_id = ? AND purpose = ? AND used = 0",
            (user_id, purpose)
        )
        conn.execute(
            "INSERT INTO email_tokens (user_id, token, purpose, expires_at) VALUES (?, ?, ?, ?)",
            (user_id, token, purpose, expires)
        )
        conn.commit()
    finally:
        conn.close()
    return token

def consume_token(token: str, purpose: str = "verify") -> dict | None:
    """
    Tokeni yoxla və istifadə et.
    Uğurlu olsa user dict qaytarır, yoxsa None.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            """SELECT et.*, u.id as uid, u.username, u.email
               FROM email_tokens et
               JOIN users u ON et.user_id = u.id
               WHERE et.token = ? AND et.purpose = ? AND et.used = 0""",
            (token, purpose)
        ).fetchone()

        if not row:
            return None  # token tapılmadı və ya artıq istifadə edilib

        if datetime.fromisoformat(row["expires_at"]) < datetime.utcnow():
            return None  # token vaxtı keçib

        # Token-i istifadə olunmuş kimi işarələ
        conn.execute("UPDATE email_tokens SET used = 1 WHERE token = ?", (token,))
        conn.commit()
        return dict(row)
    finally:
        conn.close()

# ─── EMAIL BUILDER ────────────────────────────────────────────────────────────
def _build_verify_email(username: str, verify_url: str) -> tuple[str, str]:
    """(subject, html_body) qaytarır"""
    subject = "ARN AI — E-poçtunuzu doğrulayın"
    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body    {{ margin:0; padding:0; background:#050505; font-family:'Courier New',monospace; color:#e8e8e8; }}
    .wrap   {{ max-width:560px; margin:40px auto; border:1px solid #1a1a1a; }}
    .header {{ background:#0d0d0d; padding:32px; text-align:center; border-bottom:2px solid #ff0033; }}
    .logo   {{ font-size:32px; font-weight:900; color:#ff0033;
               text-shadow:0 0 20px #ff0033; letter-spacing:6px; }}
    .sub    {{ font-size:10px; color:#cc0028; letter-spacing:3px; margin-top:4px; }}
    .body   {{ padding:36px 32px; background:#080808; }}
    .title  {{ font-size:16px; color:#e8e8e8; letter-spacing:2px; margin-bottom:16px; }}
    .msg    {{ font-size:13px; color:#888; line-height:1.8; margin-bottom:28px; }}
    .btn    {{ display:inline-block; background:#ff0033; color:#fff; padding:14px 32px;
               text-decoration:none; font-size:13px; letter-spacing:2px;
               text-transform:uppercase; border:none; }}
    .btn:hover {{ background:#cc0028; }}
    .warn   {{ font-size:11px; color:#444; margin-top:24px; border-top:1px solid #1a1a1a;
               padding-top:16px; line-height:1.7; }}
    .footer {{ background:#050505; padding:16px; text-align:center;
               font-size:10px; color:#333; letter-spacing:1px; }}
    .mono   {{ background:#111; color:#ff0033; padding:2px 8px; font-family:monospace; font-size:12px; }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="logo">ARN</div>
      <div style="font-size:18px;color:#e8e8e8;letter-spacing:3px;margin-top:4px">AI</div>
      <div class="sub">PENTEST ENGINE</div>
    </div>
    <div class="body">
      <div class="title">◈ HESAB DOĞRULAMASI</div>
      <div class="msg">
        Salam <span class="mono">{username}</span>,<br><br>
        ARN AI platformasına qeydiyyatınız üçün təşəkkürlər.<br>
        Hesabınızı aktivləşdirmək üçün aşağıdakı düyməyə klikləyin.
      </div>
      <a href="{verify_url}" class="btn">◈ E-POÇTU DOĞRULA</a>
      <div class="warn">
        ⚠ Bu link <strong>24 saat</strong> ərzində etibarlıdır.<br>
        Əgər bu sorğunu siz etməmisinizsə, bu emaili nəzərə almayın.<br>
        Birbaşa link: <a href="{verify_url}" style="color:#ff0033">{verify_url}</a>
      </div>
    </div>
    <div class="footer">ARN AI · AZTU Security Lab · {datetime.utcnow().year}</div>
  </div>
</body>
</html>"""
    return subject, html

def _build_reset_email(username: str, reset_url: str) -> tuple[str, str]:
    """Şifrə sıfırlama emaili"""
    subject = "ARN AI — Şifrə Sıfırlama"
    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body  {{ margin:0; padding:0; background:#050505; font-family:'Courier New',monospace; color:#e8e8e8; }}
    .wrap {{ max-width:560px; margin:40px auto; border:1px solid #ff0033; }}
    .hdr  {{ background:#0d0d0d; padding:32px; text-align:center; border-bottom:2px solid #ff0033; }}
    .logo {{ font-size:32px; font-weight:900; color:#ff0033; letter-spacing:6px; text-shadow:0 0 20px #ff0033; }}
    .bd   {{ padding:36px 32px; background:#080808; }}
    .btn  {{ display:inline-block; background:#ff0033; color:#fff; padding:14px 32px;
             text-decoration:none; font-size:13px; letter-spacing:2px; text-transform:uppercase; }}
    .warn {{ font-size:11px; color:#666; margin-top:24px; border-top:1px solid #1a1a1a; padding-top:16px; line-height:1.7; }}
    .mono {{ background:#111; color:#ff0033; padding:2px 8px; font-family:monospace; }}
    .ft   {{ background:#050505; padding:16px; text-align:center; font-size:10px; color:#333; }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr"><div class="logo">ARN AI</div></div>
    <div class="bd">
      <div style="font-size:16px;letter-spacing:2px;margin-bottom:16px;">◈ ŞİFRƏ SIFIRLAMASI</div>
      <div style="font-size:13px;color:#888;line-height:1.8;margin-bottom:28px;">
        Salam <span class="mono">{username}</span>,<br><br>
        Hesabınız üçün şifrə sıfırlama sorğusu alındı.<br>
        Aşağıdakı düymə ilə yeni şifrə təyin edin.
      </div>
      <a href="{reset_url}" class="btn">◈ YENİ ŞİFRƏ TƏYİN ET</a>
      <div class="warn">
        ⚠ Bu link <strong>1 saat</strong> etibarlıdır.<br>
        Əgər bu sorğunu siz etməmisinizsə, hesabınızın təhlükəsizliyini yoxlayın.
      </div>
    </div>
    <div class="ft">ARN AI · {datetime.utcnow().year}</div>
  </div>
</body>
</html>"""
    return subject, html

# ─── SMTP SENDER ──────────────────────────────────────────────────────────────
def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    SMTP vasitəsilə email göndər.
    Uğurlu olsa True, xəta olsa False qaytarır.
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{FROM_NAME} <{SMTP_USER}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        print(f"[ARN EMAIL] Göndərildi → {to_email}")
        return True
    except Exception as e:
        print(f"[ARN EMAIL] Xəta: {e}")
        return False

# ─── PUBLIC API ───────────────────────────────────────────────────────────────
def send_verification_email(user_id: int, username: str, email: str) -> bool:
    """Qeydiyyatdan sonra doğrulama emaili göndər"""
    token      = save_token(user_id, purpose="verify")
    verify_url = f"{FRONTEND_URL}/verify?token={token}"
    subject, html = _build_verify_email(username, verify_url)
    return send_email(email, subject, html)

def send_password_reset_email(user_id: int, username: str, email: str) -> bool:
    """Şifrə sıfırlama emaili göndər"""
    token     = save_token(user_id, purpose="reset")
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    subject, html = _build_reset_email(username, reset_url)
    return send_email(email, subject, html)

def verify_email_token(token: str) -> dict | None:
    """
    Doğrulama tokenini yoxla, uğurlu olsa user_id-ni DB-də təsdiqlə.
    """
    row = consume_token(token, purpose="verify")
    if not row:
        return None
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("UPDATE users SET is_verified = 1 WHERE id = ?", (row["user_id"],))
        conn.commit()
    finally:
        conn.close()
    return {"user_id": row["user_id"], "username": row["username"], "email": row["email"]}

def verify_reset_token(token: str) -> dict | None:
    """Şifrə sıfırlama tokenini yoxla (DB-də dəyişiklik etmir)"""
    return consume_token(token, purpose="reset")
