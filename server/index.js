require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

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

// Database connection - Use environment variable for persistent storage path on hosting
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'chat_users.db');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error opening database', err.message);
  else console.log('Connected to SQLite database.');
});

// Promisified DB helpers
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) { err ? reject(err) : resolve(this); });
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => { err ? reject(err) : resolve(rows); });
});
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => { err ? reject(err) : resolve(row); });
});

// Initialize database tables
db.serialize(() => {
  // Users table - each user has unique username + password
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    anonymous_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS active_sessions (
    socket_id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    sender_id INTEGER,
    sender_anonymous_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS banned_users (
    user_id INTEGER PRIMARY KEY,
    reason TEXT,
    banned_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed admin account: username "admin", password "admin123"
  const adminHash = hashPassword('admin123');
  const adminAnonId = Math.floor(Math.random() * 9000) + 1000;
  db.run(`INSERT OR IGNORE INTO users (username, password_hash, role, anonymous_id) VALUES (?, ?, 'admin', ?)`,
    ['admin', adminHash, adminAnonId],
    (err) => {
      if (!err) console.log('[SEED] Admin account ready (username: admin, password: admin123)');
    }
  );
});

// Connected users map
const connectedUsers = new Map();

// ==================== API ENDPOINTS ====================

// Login - checks username + password
app.post('/api/login', async (req, res) => {
  const { name, password } = req.body;

  console.log('[LOGIN] Attempt for user:', name);

  if (!name || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const h = hashPassword(password);
    const user = await dbGet('SELECT * FROM users WHERE username = ? AND password_hash = ?', [name.toLowerCase(), h]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check if banned
    const banData = await dbGet('SELECT * FROM banned_users WHERE user_id = ?', [user.id]);
    if (banData) {
      return res.status(403).json({ error: 'Your account has been suspended' });
    }

    console.log('[LOGIN] Success for:', name, 'Role:', user.role);
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

// Admin: Create new user
app.post('/api/admin/create-user', async (req, res) => {
  const { adminToken, username, password, role = 'user' } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    // Verify admin token
    const adminHash = hashPassword(adminToken);
    const admin = await dbGet('SELECT * FROM users WHERE password_hash = ? AND role = ?', [adminHash, 'admin']);

    if (!admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if username exists
    const existing = await dbGet('SELECT * FROM users WHERE username = ?', [username.toLowerCase()]);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create user
    const userHash = hashPassword(password);
    const anonId = Math.floor(Math.random() * 9000) + 1000;

    await dbRun('INSERT INTO users (username, password_hash, role, anonymous_id) VALUES (?, ?, ?, ?)',
      [username.toLowerCase(), userHash, role, anonId]
    );

    console.log('[ADMIN] Created user:', username);
    res.json({ success: true, username: username.toLowerCase(), anonymousId: anonId });
  } catch (err) {
    console.error('[ADMIN] Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Admin: List all users
app.post('/api/admin/list-users', async (req, res) => {
  const { adminToken } = req.body;

  try {
    const adminHash = hashPassword(adminToken);
    const admin = await dbGet('SELECT * FROM users WHERE password_hash = ? AND role = ?', [adminHash, 'admin']);

    if (!admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const users = await dbAll('SELECT id, username, role, anonymous_id, created_at FROM users');
    res.json({ users });
  } catch (err) {
    console.error('[ADMIN] List users error:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// Admin: Delete user
app.post('/api/admin/delete-user', async (req, res) => {
  const { adminToken, userId } = req.body;

  try {
    const adminHash = hashPassword(adminToken);
    const admin = await dbGet('SELECT * FROM users WHERE password_hash = ? AND role = ?', [adminHash, 'admin']);

    if (!admin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await dbRun('DELETE FROM users WHERE id = ? AND role != ?', [userId, 'admin']);
    res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN] Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
  console.log('[SOCKET] New connection:', socket.id);

  socket.on('join', async ({ userId, password }) => {
    try {
      const h = hashPassword(password);
      const user = await dbGet('SELECT * FROM users WHERE id = ? AND password_hash = ?', [userId, h]);

      if (!user) {
        socket.emit('error', 'Invalid credentials');
        return socket.disconnect();
      }

      // Check if banned
      const banData = await dbGet('SELECT * FROM banned_users WHERE user_id = ?', [user.id]);
      if (banData) {
        socket.emit('error', 'Your account has been suspended');
        return socket.disconnect();
      }

      await dbRun('INSERT OR REPLACE INTO active_sessions (socket_id, user_id) VALUES (?, ?)', [socket.id, user.id]);
      connectedUsers.set(socket.id, {
        id: user.id,
        username: user.username,
        anonymousId: user.anonymous_id,
        role: user.role
      });

      socket.join('global_chat');

      // Send message history
      const history = await dbAll('SELECT * FROM messages ORDER BY created_at DESC LIMIT 50');
      const formattedHistory = history.reverse().map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.sender_anonymous_id,
        timestamp: msg.created_at
      }));
      socket.emit('messageHistory', formattedHistory);

      // Emit updated user count
      io.emit('userCount', connectedUsers.size);
    } catch (e) {
      console.error('[JOIN] Error:', e);
      socket.disconnect();
    }
  });

  socket.on('sendMessage', async ({ content, senderId }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    try {
      const result = await dbRun(
        'INSERT INTO messages (content, sender_id, sender_anonymous_id) VALUES (?, ?, ?)',
        [content, user.id, user.anonymousId]
      );

      const newMessage = {
        id: result.lastID,
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

  socket.on('typing', () => {
    socket.to('global_chat').emit('userTyping', socket.id);
  });

  socket.on('stopTyping', () => {
    socket.to('global_chat').emit('userStopTyping', socket.id);
  });

  socket.on('disconnect', async () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      try {
        await dbRun('DELETE FROM active_sessions WHERE socket_id = ?', [socket.id]);
      } catch (e) {
        console.error('[DISCONNECT] Error:', e);
      }
      connectedUsers.delete(socket.id);
      io.emit('userCount', connectedUsers.size);
    }
  });

  // Admin: Clear Chat
  socket.on('admin:clearChat', async () => {
    const user = connectedUsers.get(socket.id);
    if (user?.role !== 'admin') return;

    try {
      await dbRun('DELETE FROM messages');
      io.to('global_chat').emit('messageHistory', []);
      io.to('global_chat').emit('system_message', { content: 'Chat cleared by admin.' });
    } catch (e) {
      console.error('[ADMIN] Clear chat error:', e);
    }
  });

  // Admin: Ban User
  socket.on('admin:banUser', async ({ targetAnonId, reason }) => {
    const user = connectedUsers.get(socket.id);
    if (user?.role !== 'admin' || !targetAnonId) return;

    try {
      // Find user by anonymous_id
      const targetUser = await dbGet('SELECT id FROM users WHERE anonymous_id = ?', [targetAnonId]);
      if (!targetUser) return;

      await dbRun('INSERT OR IGNORE INTO banned_users (user_id, reason) VALUES (?, ?)', [targetUser.id, reason || 'Banned by admin']);
      io.to('global_chat').emit('system_message', { content: `User #${targetAnonId} has been banned.` });

      // Kick all sockets for this user
      for (const [sid, u] of connectedUsers.entries()) {
        if (u.anonymousId === targetAnonId) {
          const s = io.sockets.sockets.get(sid);
          if (s) {
            s.emit('error', 'You have been banned.');
            s.disconnect();
          }
        }
      }
    } catch (e) {
      console.error('[ADMIN] Ban user error:', e);
    }
  });
});

// For any request that doesn't match one above, send back React's index.html file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
