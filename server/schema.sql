-- Run this in your PostgreSQL database

CREATE TABLE IF NOT EXISTS access_tokens (
    id SERIAL PRIMARY KEY,
    token_hash TEXT UNIQUE NOT NULL, -- SHA256 hash of the pre-distributed password
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS active_sessions (
    token_hash TEXT PRIMARY KEY,
    socket_id TEXT NOT NULL,
    user_name TEXT,
    login_time TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    sender_id TEXT, -- Persist sender socket/user ID
    sender_name TEXT, -- Persist sender display name
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed some passwords (hashes) for testing
-- Password: "password123" -> Hash (SHA256): ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f
INSERT INTO access_tokens (token_hash) VALUES 
('ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f')
ON CONFLICT DO NOTHING;
