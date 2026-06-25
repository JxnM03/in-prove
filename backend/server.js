const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Datenbankverbindung initialisieren
require('./db/index');

// Test-Route
app.get('/', (req, res) => {
    res.json({ message: '✅ in:prove Backend läuft!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server läuft auf Port ${PORT}`);
});