const pool = require('../db/index');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'inprove-secret-key';

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Athlete in DB suchen
        const result = await pool.query(
            'SELECT * FROM athletes WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const athlete = result.rows[0];

        // Passwort prüfen
        const passwordMatch = await bcrypt.compare(password, athlete.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // JWT Token erstellen
        const token = jwt.sign(
            { id: athlete.id, username: athlete.username, name: athlete.name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            athlete: {
                id: athlete.id,
                name: athlete.name,
                username: athlete.username
            }
        });

    } catch (error) {
        console.error('Login Fehler:', error);
        res.status(500).json({ error: 'Login fehlgeschlagen' });
    }
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.athlete = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

module.exports = { login, verifyToken };