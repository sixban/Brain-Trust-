const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Session
app.use(session({
    secret: 'simple-secret-123',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'brain_trust'
});

db.connect(err => {
    if (err) {
        console.error('❌ Database connection failed:', err);
    } else {
        console.log('✅ Connected to MySQL');
    }
});

// ============= SIMPLE REGISTER (no bcrypt) =============
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    
    console.log('📝 Registering:', username);
    
    // DIRECT INSERT - no hashing!
    db.query(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, password],  // Password stored as plain text!
        (err, result) => {
            if (err) {
                console.log('❌ Error:', err);
                return res.status(400).json({ error: err.message });
            }
            
            // Set session
            req.session.userId = result.insertId;
            req.session.username = username;
            
            // Set cookie
            res.cookie('userId', result.insertId);
            
            console.log('✅ Registered:', username);
            res.json({ success: true, username });
        }
    );
});

// ============= SIMPLE LOGIN (no bcrypt) =============
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('🔑 Login attempt:', username);
    console.log('Password entered:', password);
    
    // Direct comparison - no hashing!
    db.query(
        'SELECT * FROM users WHERE username = ? AND password = ?',
        [username, password],  // Compare directly!
        (err, results) => {
            if (err) {
                console.log('❌ Error:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            console.log('📊 Results found:', results.length);
            
            if (results.length === 0) {
                console.log('❌ No match found');
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            const user = results[0];
            console.log('✅ Login successful for:', user.username);
            
            // Set session
            req.session.userId = user.id;
            req.session.username = user.username;
            
            // Set cookie
            res.cookie('userId', user.id);
            
            res.json({ 
                success: true, 
                username: user.username,
                userId: user.id 
            });
        }
    );
});

// Auto-login check
app.get('/api/check-auth', (req, res) => {
    const userId = req.session.userId || req.cookies.userId;
    
    if (!userId) {
        return res.json({ authenticated: false });
    }
    
    db.query(
        'SELECT id, username FROM users WHERE id = ?',
        [userId],
        (err, results) => {
            if (err || results.length === 0) {
                return res.json({ authenticated: false });
            }
            res.json({ authenticated: true, user: results[0] });
        }
    );
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.clearCookie('userId');
    res.json({ success: true });
});

// Home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(\n🚀 'Server running on http://localhost:${PORT}');
    console.log(📝 'Register: http://localhost:${PORT}/register.html');
    console.log(🔑 'Login: http://localhost:${PORT}/login.html\n');
});