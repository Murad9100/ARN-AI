-- ============================================================
--  ARN AI — Database Schema
--  Engine: PostgreSQL (SQLite uyğun variant da daxildir)
--  Şifrələmə: Chat məzmunu AES-256-CBC ilə şifrələnir
-- ============================================================

-- ─── EXTENSIONS (PostgreSQL) ─────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id           SERIAL PRIMARY KEY,
    username     VARCHAR(50)  UNIQUE NOT NULL,
    email        VARCHAR(255) UNIQUE NOT NULL,
    password_h   TEXT         NOT NULL,          -- bcrypt hash
    plan         VARCHAR(10)  NOT NULL DEFAULT 'FREE'
                              CHECK (plan IN ('FREE', 'PRO', 'MAX')),
    is_admin     BOOLEAN      NOT NULL DEFAULT FALSE,
    is_banned    BOOLEAN      NOT NULL DEFAULT FALSE,
    ban_reason   TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login   TIMESTAMPTZ,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_plan     ON users(plan);

-- ─── CHAT SESSIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(100),
    tool        VARCHAR(30)  NOT NULL DEFAULT 'chat',
    is_archived BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON chat_sessions(user_id);

-- ─── CHAT MESSAGES (AES-256 ŞİFRƏLİ) ────────────────────────
-- content_enc: AES-256-CBC ilə şifrələnmiş base64 mətn
-- IV şifrələnmiş mətnin ilk 16 byte-ına daxildir
CREATE TABLE IF NOT EXISTS chat_messages (
    id          SERIAL       PRIMARY KEY,
    session_id  UUID         NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(10)  NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content_enc TEXT         NOT NULL,           -- AES-256-CBC(base64) şifrəli
    tokens_used INTEGER,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_session ON chat_messages(session_id);

-- ─── USAGE LOGS (Rate Limiting) ──────────────────────────────
CREATE TABLE IF NOT EXISTS usage_logs (
    id          SERIAL       PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_str    DATE         NOT NULL,           -- YYYY-MM-DD
    count       INTEGER      NOT NULL DEFAULT 0,
    UNIQUE (user_id, date_str)
);

CREATE INDEX idx_usage_user_date ON usage_logs(user_id, date_str);

-- ─── SYSTEM LOGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_logs (
    id          SERIAL       PRIMARY KEY,
    level       VARCHAR(10)  NOT NULL DEFAULT 'INFO'
                              CHECK (level IN ('INFO', 'WARN', 'ERROR', 'CRITICAL')),
    message     TEXT         NOT NULL,
    user_id     INTEGER      REFERENCES users(id) ON DELETE SET NULL,
    ip_address  INET,
    endpoint    VARCHAR(100),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_syslogs_level   ON system_logs(level);
CREATE INDEX idx_syslogs_created ON system_logs(created_at DESC);

-- ─── NOTIFICATIONS (Admin → Users) ───────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL       PRIMARY KEY,
    title       VARCHAR(100) NOT NULL,
    message     TEXT         NOT NULL,
    level       VARCHAR(10)  NOT NULL DEFAULT 'info'
                              CHECK (level IN ('info', 'warning', 'critical')),
    sent_by     INTEGER      NOT NULL REFERENCES users(id),
    target_plan VARCHAR(10)  DEFAULT NULL,       -- NULL = hər kəs
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── NOTIFICATION READS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_reads (
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    read_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, notification_id)
);

-- ─── SUBSCRIPTION PLANS (Reference) ─────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
    plan_name    VARCHAR(10) PRIMARY KEY,
    display_name VARCHAR(50),
    daily_limit  INTEGER,                        -- NULL = limitsiz
    price_azn    NUMERIC(6,2),
    features     JSONB
);

INSERT INTO subscription_plans VALUES
  ('FREE', 'Pulsuz Plan',   3,    0.00, '{"tools": ["chat"], "priority": 1}'),
  ('PRO',  'PRO Plan',      NULL, 19.00,'{"tools": ["chat","payload","portscan","webex"], "priority": 2}'),
  ('MAX',  'MAX Plan',      NULL, 49.00,'{"tools": ["all"], "priority": 3, "api_access": true}')
ON CONFLICT DO NOTHING;

-- ─── SEED DATA ────────────────────────────────────────────────
-- Default admin (şifrə: admin123 — mütləq dəyişin!)
INSERT INTO users (username, email, password_h, plan, is_admin)
VALUES (
    'admin',
    'admin@arnai.az',
    '$2b$12$placeholder_replace_with_real_bcrypt_hash',
    'MAX',
    TRUE
) ON CONFLICT DO NOTHING;

-- ─── FUNCTIONS ────────────────────────────────────────────────
-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sessions_updated
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── VIEWS ────────────────────────────────────────────────────
-- Admin dashboard üçün user statistikası
CREATE OR REPLACE VIEW v_user_stats AS
SELECT
    u.id,
    u.username,
    u.email,
    u.plan,
    u.is_admin,
    u.is_banned,
    u.created_at,
    u.last_login,
    COALESCE(ul.count, 0) AS reqs_today,
    COUNT(DISTINCT cs.id)  AS total_sessions,
    COUNT(DISTINCT cm.id)  AS total_messages
FROM users u
LEFT JOIN usage_logs ul
    ON u.id = ul.user_id AND ul.date_str = CURRENT_DATE
LEFT JOIN chat_sessions cs ON u.id = cs.user_id
LEFT JOIN chat_messages  cm ON cs.id = cm.session_id
GROUP BY u.id, ul.count;

-- ─── COMMENTS ─────────────────────────────────────────────────
COMMENT ON TABLE chat_messages IS
    'Bütün mesajlar AES-256-CBC ilə şifrələnir. content_enc = base64(iv[16] || ciphertext)';
COMMENT ON COLUMN users.password_h IS
    'bcrypt($password, 12 rounds) — heç vaxt plaintext saxlanılmır';
