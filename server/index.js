require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
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
app.use(express.static(path.join(__dirname, '../client/dist')));

// Helper for hashing
function hashPassword(plain) {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

// Database selection
let isPostgres = !!process.env.DATABASE_URL;
let db;
let pool;

async function setupDatabase() {
  if (isPostgres) {
    try {
      console.log('[DB] Attempting PostgreSQL connection...');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      });
      // Test connection
      await pool.query('SELECT 1');
      console.log('[DB] PostgreSQL connected successfully.');
    } catch (err) {
      console.error('[DB] PostgreSQL connection failed, falling back to SQLite:', err.message);
      isPostgres = false;
      pool = null;
    }
  }

  if (!isPostgres) {
    console.log('[DB] Using local SQLite');
    db = new sqlite3.Database(path.join(__dirname, 'chat_users.db'), (err) => {
      if (err) console.error('[DB] SQLite connection error:', err);
      else console.log('[DB] SQLite connected.');
    });
  }
}

// Helper for promise-based queries
function query(sql, params = []) {
  if (isPostgres && pool) {
    return pool.query(sql, params);
  } else {
    const sqliteSql = sql.replace(/\$(\d+)/g, '?');
    return new Promise((resolve, reject) => {
      const method = sqliteSql.trim().toLowerCase().startsWith('select') ? 'all' : 'run';
      db[method](sqliteSql, params, function (err, rows) {
        if (err) reject(err);
        else resolve({ rows: rows || [], lastID: this?.lastID, lastId: this?.lastID, changes: this?.changes });
      });
    });
  }
}


async function initDb() {
  const pk = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const timestamp = isPostgres ? 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP';

  try {
    // Users table
    await query(`CREATE TABLE IF NOT EXISTS users (
      id ${pk},
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      anonymous_id INTEGER NOT NULL,
      created_at ${timestamp}
    )`);

    await query(`CREATE TABLE IF NOT EXISTS active_sessions (
      socket_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      login_time ${timestamp}
    )`);

    await query(`CREATE TABLE IF NOT EXISTS topics (
      id ${pk},
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      created_by INTEGER,
      created_at ${timestamp}
    )`);

    await query(`CREATE TABLE IF NOT EXISTS announcements (
      id ${pk},
      content TEXT NOT NULL,
      author_id INTEGER,
      created_at ${timestamp}
    )`);

    await query(`CREATE TABLE IF NOT EXISTS banned_users (
      id ${pk},
      user_id INTEGER UNIQUE NOT NULL,
      reason TEXT,
      created_at ${timestamp}
    )`);

    // Migration: Add new columns if missing
    const migrations = [
      { table: 'topics', column: 'created_by', type: 'INTEGER' },
      { table: 'topics', column: 'bg_color', type: 'TEXT DEFAULT \'#0A0A0A\'' },
      { table: 'topics', column: 'text_color', type: 'TEXT DEFAULT \'#FFFFFF\'' },
      { table: 'topics', column: 'accent_color', type: 'TEXT DEFAULT \'#3B82F6\'' },
      { table: 'topics', column: 'animation', type: 'TEXT DEFAULT \'none\'' },
      { table: 'topics', column: 'username_color', type: 'TEXT DEFAULT \'#888888\'' }
    ];

    for (const m of migrations) {
      try {
        await query(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`);
      } catch (e) {
        // console.log(`Migration skipped: ${m.table}.${m.column} already exists`);
      }
    }

    // Seed default topic using Postgres-safe syntax
    if (isPostgres) {
      await query(`
        INSERT INTO topics (name, slug, description) 
        VALUES ('Global Chat', 'global', 'The main lobby for everyone')
        ON CONFLICT (slug) DO NOTHING
      `);
    } else {
      await query(`
        INSERT OR IGNORE INTO topics (name, slug, description) 
        VALUES ('Global Chat', 'global', 'The main lobby for everyone')
      `);
    }

    await query(`CREATE TABLE IF NOT EXISTS messages (
      id ${pk},
      content TEXT NOT NULL,
      sender_id INTEGER,
      sender_anonymous_id INTEGER,
      topic_id INTEGER DEFAULT 1,
      created_at ${timestamp}
    )`);

    // Migration for messages
    try {
      await query(`ALTER TABLE messages ADD COLUMN topic_id INTEGER DEFAULT 1`);
    } catch (e) { }

    // Update existing messages
    const globalTopic = await query("SELECT id FROM topics WHERE slug = 'global'");
    if (globalTopic.rows[0]) {
      const gid = globalTopic.rows[0].id;
      if (isPostgres) {
        await query(`UPDATE messages SET topic_id = $1 WHERE topic_id IS NULL`, [gid]);
      } else {
        await query(`UPDATE messages SET topic_id = $1 WHERE topic_id IS NULL OR topic_id = 1`, [gid]);
      }
    }
    const adminHash = hashPassword('admin123');
    const adminAnonId = 0;

    if (isPostgres) {
      await query(
        `INSERT INTO users (username, password_hash, role, anonymous_id) 
         VALUES ($1, $2, 'admin', $3)
         ON CONFLICT (username) DO NOTHING`,
        ['admin', adminHash, adminAnonId]
      );
    } else {
      await query(
        `INSERT OR IGNORE INTO users (username, password_hash, role, anonymous_id) 
         VALUES ($1, $2, 'admin', $3)`,
        ['admin', adminHash, adminAnonId]
      );
    }
    console.log('[DB] Database initialized and admin account verified.');
  } catch (err) {
    console.error('[DB] Initialization error:', err);
  }
}

// Connected users map
const connectedUsers = new Map();

// ==================== API ENDPOINTS ====================

app.post('/api/login', async (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const h = hashPassword(password);
    const result = await query('SELECT * FROM users WHERE username = $1 AND password_hash = $2', [name.toLowerCase(), h]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const banResult = await query('SELECT * FROM banned_users WHERE user_id = $1', [user.id]);
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
    const adminRes = await query('SELECT * FROM users WHERE password_hash = $1 AND role = $2', [adminHash, 'admin']);
    if (!adminRes.rows[0]) return res.status(403).json({ error: 'Unauthorized' });

    const existing = await query('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
    if (existing.rows[0]) return res.status(400).json({ error: 'Username already exists' });

    const userHash = hashPassword(password);
    const anonId = Math.floor(Math.random() * 9000) + 1000;
    await query('INSERT INTO users (username, password_hash, role, anonymous_id) VALUES ($1, $2, $3, $4)',
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
    const adminRes = await query('SELECT * FROM users WHERE password_hash = $1 AND role = $2', [adminHash, 'admin']);
    if (!adminRes.rows[0]) return res.status(403).json({ error: 'Unauthorized' });

    const users = await query('SELECT id, username, role, anonymous_id, created_at FROM users');
    res.json({ users: users.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/admin/delete-user', async (req, res) => {
  const { adminToken, userId } = req.body;
  try {
    const adminHash = hashPassword(adminToken);
    const adminRes = await query('SELECT * FROM users WHERE password_hash = $1 AND role = $2', [adminHash, 'admin']);
    if (!adminRes.rows[0]) return res.status(403).json({ error: 'Unauthorized' });

    await query('DELETE FROM users WHERE id = $1 AND role != $2', [userId, 'admin']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/announcements', async (req, res) => {
  try {
    const result = await query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 20');
    res.json({ announcements: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

app.post('/api/admin/create-announcement', async (req, res) => {
  const { adminToken, content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });

  try {
    const adminHash = hashPassword(adminToken);
    const adminRes = await query('SELECT * FROM users WHERE password_hash = $1 AND role = $2', [adminHash, 'admin']);
    const admin = adminRes.rows[0];
    if (!admin) return res.status(403).json({ error: 'Unauthorized' });

    const insertSql = isPostgres
      ? 'INSERT INTO announcements (content, author_id) VALUES ($1, $2) RETURNING id'
      : 'INSERT INTO announcements (content, author_id) VALUES ($1, $2)';

    const result = await query(insertSql, [content, admin.id]);
    const annId = isPostgres ? result.rows[0].id : result.lastID;
    const announcement = (await query('SELECT * FROM announcements WHERE id = $1', [annId])).rows[0];
    io.emit('newAnnouncement', announcement);

    // Also send a system message to the chat
    io.emit('receiveMessage', {
      id: `sys-${Date.now()}`,
      content: `📢 ANNOUNCEMENT: ${content}`,
      senderId: 'SYSTEM',
      timestamp: new Date().toISOString(),
      type: 'system'
    });

    res.json({ success: true, announcement });
  } catch (err) {
    console.error('[ANNOUNCEMENT] Create error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/topics', async (req, res) => {
  try {
    const result = await query('SELECT * FROM topics ORDER BY created_at ASC');
    res.json({ topics: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

app.post('/api/admin/create-topic', async (req, res) => {
  const { adminToken, name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  try {
    const adminHash = hashPassword(adminToken);
    const adminRes = await query('SELECT * FROM users WHERE password_hash = $1 AND role = $2', [adminHash, 'admin']);
    const admin = adminRes.rows[0];
    if (!admin) return res.status(403).json({ error: 'Unauthorized' });

    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!slug) return res.status(400).json({ error: 'Invalid name' });
    const insertSql = isPostgres
      ? 'INSERT INTO topics (name, slug, description, created_by) VALUES ($1, $2, $3, $4) RETURNING id'
      : 'INSERT INTO topics (name, slug, description, created_by) VALUES ($1, $2, $3, $4)';

    const result = await query(insertSql, [name, slug, description || '', admin.id]);
    const topicId = isPostgres ? result.rows[0].id : result.lastID;
    const topic = (await query('SELECT * FROM topics WHERE id = $1', [topicId])).rows[0];
    io.emit('newTopic', topic);
    res.json({ success: true, topic });
  } catch (err) {
    if (err.code === '23505' || err.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Topic already exists' });
    }
    console.error('[TOPIC] Create error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

app.put('/api/admin/update-topic', async (req, res) => {
  const { adminToken, topicId, name, description, bg_color, text_color, accent_color, animation, username_color } = req.body;
  if (!topicId) return res.status(400).json({ error: 'Topic ID required' });

  try {
    const adminHash = hashPassword(adminToken);
    const adminRes = await query('SELECT * FROM users WHERE password_hash = $1 AND role = $2', [adminHash, 'admin']);
    if (!adminRes.rows[0]) return res.status(403).json({ error: 'Unauthorized' });

    // Build dynamic update
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name) { updates.push(`name = $${paramIndex++}`); params.push(name); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); params.push(description); }
    if (bg_color) { updates.push(`bg_color = $${paramIndex++}`); params.push(bg_color); }
    if (text_color) { updates.push(`text_color = $${paramIndex++}`); params.push(text_color); }
    if (accent_color) { updates.push(`accent_color = $${paramIndex++}`); params.push(accent_color); }
    if (animation) { updates.push(`animation = $${paramIndex++}`); params.push(animation); }
    if (username_color) { updates.push(`username_color = $${paramIndex++}`); params.push(username_color); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(topicId);
    await query(`UPDATE topics SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);

    const topic = (await query('SELECT * FROM topics WHERE id = $1', [topicId])).rows[0];
    io.emit('topicUpdated', topic);
    res.json({ success: true, topic });
  } catch (err) {
    console.error('[TOPIC] Update error:', err);
    res.status(500).json({ error: 'Failed to update topic' });
  }
});

app.delete('/api/admin/delete-topic', async (req, res) => {
  const { adminToken, topicId } = req.body;
  if (!topicId) return res.status(400).json({ error: 'Topic ID required' });

  try {
    const adminHash = hashPassword(adminToken);
    const adminRes = await query('SELECT * FROM users WHERE password_hash = $1 AND role = $2', [adminHash, 'admin']);
    if (!adminRes.rows[0]) return res.status(403).json({ error: 'Unauthorized' });

    // Check if it's the global topic
    const topic = (await query('SELECT * FROM topics WHERE id = $1', [topicId])).rows[0];
    if (!topic) return res.status(404).json({ error: 'Topic not found' });
    if (topic.slug === 'global') return res.status(400).json({ error: 'Cannot delete Global Chat' });

    // Delete messages first, then topic
    await query('DELETE FROM messages WHERE topic_id = $1', [topicId]);
    await query('DELETE FROM topics WHERE id = $1', [topicId]);

    io.emit('topicDeleted', { topicId });
    res.json({ success: true });
  } catch (err) {
    console.error('[TOPIC] Delete error:', err);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
  socket.on('join', async ({ userId, password }) => {
    try {
      const h = hashPassword(password);
      const userRes = await query('SELECT * FROM users WHERE id = $1 AND password_hash = $2', [userId, h]);
      const user = userRes.rows[0];

      if (!user) {
        socket.emit('error', 'Invalid credentials');
        return socket.disconnect();
      }

      const banRes = await query('SELECT * FROM banned_users WHERE user_id = $1', [user.id]);
      if (banRes.rows[0]) {
        socket.emit('error', 'Suspended');
        return socket.disconnect();
      }

      await query('INSERT INTO active_sessions (socket_id, user_id) VALUES ($1, $2) ON CONFLICT (socket_id) DO UPDATE SET user_id = excluded.user_id', [socket.id, user.id]);

      connectedUsers.set(socket.id, {
        id: user.id,
        username: user.username,
        anonymousId: user.anonymous_id,
        role: user.role
      });

      const defaultTopicRes = await query('SELECT id FROM topics WHERE slug = $1', ['global']);
      const defaultTopicId = defaultTopicRes.rows[0]?.id || 1;

      // Join default topic room
      const roomName = `topic_${defaultTopicId}`;
      socket.join(roomName);

      // Store current topic in user session (optional, but good for tracking)
      connectedUsers.get(socket.id).currentTopicId = defaultTopicId;

      const historyRes = await query('SELECT * FROM messages WHERE topic_id = $1 ORDER BY created_at DESC LIMIT 50', [defaultTopicId]);
      const formattedHistory = historyRes.rows.reverse().map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.sender_anonymous_id,
        timestamp: msg.created_at,
        topicId: msg.topic_id
      }));
      socket.emit('messageHistory', formattedHistory);
      io.emit('userCount', connectedUsers.size);
    } catch (e) {
      socket.disconnect();
    }
  });

  socket.on('joinTopic', async ({ topicId }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Leave current topic rooms
    const currentRooms = Array.from(socket.rooms).filter(r => r.startsWith('topic_'));
    currentRooms.forEach(r => socket.leave(r));

    // Join new topic
    socket.join(`topic_${topicId}`);
    user.currentTopicId = topicId;

    // Send history for new topic
    try {
      const historyRes = await query('SELECT * FROM messages WHERE topic_id = $1 ORDER BY created_at DESC LIMIT 50', [topicId]);
      const formattedHistory = historyRes.rows.reverse().map(msg => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.sender_anonymous_id,
        timestamp: msg.created_at,
        topicId: msg.topic_id
      }));
      socket.emit('messageHistory', formattedHistory);
    } catch (e) {
      console.error('Error fetching topic history:', e);
    }
  });

  socket.on('sendMessage', async ({ content, senderId, topicId }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Default to 'global' if no topic provided
    let finalTopicId = topicId;
    if (!finalTopicId) {
      const globalTopic = await query("SELECT id FROM topics WHERE slug = 'global' LIMIT 1");
      finalTopicId = globalTopic.rows[0]?.id || 1;
    }

    try {
      const insertSql = isPostgres
        ? 'INSERT INTO messages (content, sender_id, sender_anonymous_id, topic_id) VALUES ($1, $2, $3, $4) RETURNING id'
        : 'INSERT INTO messages (content, sender_id, sender_anonymous_id, topic_id) VALUES ($1, $2, $3, $4)';

      const result = await query(insertSql, [content, user.id, user.anonymousId, finalTopicId]);

      const newMessage = {
        id: isPostgres ? result.rows[0].id : result.lastID,
        content,
        senderId: user.anonymousId,
        timestamp: new Date().toISOString(),
        topicId: finalTopicId
      };

      socket.emit('messageAck', { tempId: senderId, message: newMessage });
      socket.to(`topic_${finalTopicId}`).emit('receiveMessage', newMessage);
    } catch (e) {
      console.error('[MESSAGE] Error:', e);
    }
  });

  socket.on('typing', (topicId) => socket.to(`topic_${topicId || 1}`).emit('userTyping', socket.id));
  socket.on('stopTyping', (topicId) => socket.to(`topic_${topicId || 1}`).emit('userStopTyping', socket.id));

  socket.on('disconnect', async () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      await query('DELETE FROM active_sessions WHERE socket_id = $1', [socket.id]);
      connectedUsers.delete(socket.id);
      io.emit('userCount', connectedUsers.size);
    }
  });

  socket.on('admin:clearChat', async ({ topicId }) => {
    const user = connectedUsers.get(socket.id);
    if (user?.role !== 'admin') return;

    // Clear only for specific topic if provided, else all? preferably specific topic.
    // Let's assume global clear for now unless topic is specified, but better to enforce topic.
    // If topicId is provided
    if (topicId) {
      await query('DELETE FROM messages WHERE topic_id = $1', [topicId]);
      io.to(`topic_${topicId}`).emit('messageHistory', []);
      io.to(`topic_${topicId}`).emit('system_message', { content: 'Chat cleared by admin.' });
    } else {
      // Legacy 'nuke everything'
      await query('DELETE FROM messages');
      io.emit('messageHistory', []); // This might be messy if people are in different rooms.
      // Ideally we should emit to all rooms.
    }
  });

  socket.on('admin:banUser', async ({ targetAnonId, reason }) => {
    const user = connectedUsers.get(socket.id);
    if (user?.role !== 'admin' || !targetAnonId) return;

    const targetRes = await query('SELECT id FROM users WHERE anonymous_id = $1', [targetAnonId]);
    const targetUser = targetRes.rows[0];
    if (!targetUser) return;

    await query('INSERT INTO banned_users (user_id, reason) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING', [targetUser.id, reason || 'Banned']);
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

// Error handler
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Fallback to React app for any other routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

async function startServer() {
  await setupDatabase();
  await initDb();

  const PORT = process.env.PORT || 3001;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is busy. Please close other processes or try a different port.`);
      process.exit(1);
    } else {
      console.error('Server start error:', err);
    }
  });
}

startServer();
