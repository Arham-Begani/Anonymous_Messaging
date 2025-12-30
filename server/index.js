require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// Helper for hashing
function hashPassword(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

async function initDb() {
  try {
    // Users table
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      anonymous_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS active_sessions (
      socket_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      sender_id INTEGER,
      sender_anonymous_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS banned_users (
      user_id INTEGER PRIMARY KEY,
      reason TEXT,
      banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed admin account
    const adminHash = hashPassword('admin123');
    const adminAnonId = Math.floor(Math.random() * 9000) + 1000;
    await pool.query(
      `INSERT INTO users (username, password_hash, role, anonymous_id) 
       VALUES ($1, $2, 'admin', $3) 
       ON CONFLICT (username) DO NOTHING`,
      ['admin', adminHash, adminAnonId]
    );
    console.log('[DB] PostgreSQL initialized and admin account verified.');
  } catch (err) {
    console.error('[DB] Initialization error:', err);
  }
}

initDb();

// Connected users map
const connectedUsers = new Map();

// ==================== API ENDPOINTS ====================

app.post('/api/login', async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const h = hashPassword(password);
    const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password_hash = $2', [name.toLowerCase(), h]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const banResult = await pool.query('SELECT * FROM banned_users WHERE user_id = $1', [user.id]);
    if (banResult.rows[0]) return res.status(403).json({ error: 'Your account has been suspended' });

    res.json({
      success: true,
      token: password,
      role: user.role,
      anonymousId: user.anonymous_id,
      userId: user.id
    });
  } catch (err) {
    console.error('[LOGIN] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/create-user', async (req, res) => {
  const { adminToken, username, password, role = 'user' } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const adminHash = hashPassword(adminToken);
    const adminRes = await pool.query('SELECT * FROM users WHERE password_hash = $1 AND role = $2', [adminHash, 'admin']);
    if (!adminRes.rows[0]) return res.status(403).json({ error: 'Unauthorized' });

    const existing = await pool.query('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
    if (existing.rows[0]) return res.status(400).json({ error: 'Username already exists' });

    const userHash = hashPassword(password);
    const anonId = Math.floor(Math.random() * 9000) + 1000;
    await pool.query('INSERT INTO users (username, password_hash, role, anonymous_id) VALUES ($1, $2, $3, $4)',
      [username.toLowerCase(), userHash, role, anonId]
    );

    res.json({ success: true, username: username.toLowerCase(), anonymousId: anonId });
  } catch (err) {
    console.error('[ADMIN] Create user error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/admin/list-users', async (req, res) => {
  const { adminToken } = req.body;
  try {
    const adminHash = hashPassword(adminToken);
    const adminRes = await pool.query('SELECT * FROM users WHERE password_hash = $1 AND role = $2', [adminHash, 'admin']);
    if (!adminRes.rows[0]) return res.status(403).json({ error: 'Unauthorized' });

    const users = await pool.query('SELECT id, username, role, anonymous_id, created_at FROM users');
    res.json({ users: users.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/admin/delete-user', async (req, res) => {
  const { adminToken, userId } = req.body;
  try {
    const adminHash = hashPassword(adminToken);
    const adminRes = await pool.query('SELECT * FROM users WHERE password_hash = $1 AND role = $2', [adminHash, 'admin']);
    if (!adminRes.rows[0]) return res.status(403).json({ error: 'Unauthorized' });

    await pool.query('DELETE FROM users WHERE id = $1 AND role != $2', [userId, 'admin']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
  socket.on('join', async ({ userId, password }) => {
    try {
      const h = hashPassword(password);
      const userRes = await pool.query('SELECT * FROM users WHERE id = $1 AND password_hash = $2', [userId, h]);
      const user = userRes.rows[0];

      if (!user) {
        socket.emit('error', 'Invalid credentials');
        return socket.disconnect();
      }

      const banRes = await pool.query('SELECT * FROM banned_users WHERE user_id = $1', [user.id]);
      if (banRes.rows[0]) {
        socket.emit('error', 'Suspended');
        return socket.disconnect();
      }

      await pool.query('INSERT INTO active_sessions (socket_id, user_id) VALUES ($1, $2) ON CONFLICT (socket_id) DO UPDATE SET user_id = EXCLUDED.user_id', [socket.id, user.id]);

      connectedUsers.set(socket.id, {
        id: user.id,
        username: user.username,
        anonymousId: user.anonymous_id,
        role: user.role
      });

      socket.join('global_chat');

      const historyRes = await pool.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 50');
      const formattedHistory = historyRes.rows.reverse().map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.sender_anonymous_id,
        timestamp: msg.created_at
      }));
      socket.emit('messageHistory', formattedHistory);
      io.emit('userCount', connectedUsers.size);
    } catch (e) {
      socket.disconnect();
    }
  });

  socket.on('sendMessage', async ({ content, senderId }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    try {
      const result = await pool.query(
        'INSERT INTO messages (content, sender_id, sender_anonymous_id) VALUES ($1, $2, $3) RETURNING id',
        [content, user.id, user.anonymousId]
      );

      const newMessage = {
        id: result.rows[0].id,
        content,
        senderId: user.anonymousId,
        timestamp: new Date().toISOString()
      };

      socket.emit('messageAck', { tempId: senderId, message: newMessage });
      socket.to('global_chat').emit('receiveMessage', newMessage);
    } catch (e) {
      console.error('[MESSAGE] Error:', e);
    }
  });

  socket.on('typing', () => socket.to('global_chat').emit('userTyping', socket.id));
  socket.on('stopTyping', () => socket.to('global_chat').emit('userStopTyping', socket.id));

  socket.on('disconnect', async () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      await pool.query('DELETE FROM active_sessions WHERE socket_id = $1', [socket.id]);
      connectedUsers.delete(socket.id);
      io.emit('userCount', connectedUsers.size);
    }
  });

  socket.on('admin:clearChat', async () => {
    const user = connectedUsers.get(socket.id);
    if (user?.role !== 'admin') return;
    await pool.query('DELETE FROM messages');
    io.to('global_chat').emit('messageHistory', []);
    io.to('global_chat').emit('system_message', { content: 'Chat cleared by admin.' });
  });

  socket.on('admin:banUser', async ({ targetAnonId, reason }) => {
    const user = connectedUsers.get(socket.id);
    if (user?.role !== 'admin' || !targetAnonId) return;

    const targetRes = await pool.query('SELECT id FROM users WHERE anonymous_id = $1', [targetAnonId]);
    const targetUser = targetRes.rows[0];
    if (!targetUser) return;

    await pool.query('INSERT INTO banned_users (user_id, reason) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING', [targetUser.id, reason || 'Banned']);
    io.to('global_chat').emit('system_message', { content: `User #${targetAnonId} has been banned.` });

    for (const [sid, u] of connectedUsers.entries()) {
      if (u.anonymousId === targetAnonId) {
        const s = io.sockets.sockets.get(sid);
        if (s) {
          s.emit('error', 'Banned');
          s.disconnect();
        }
      }
    }
  });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
