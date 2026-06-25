const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

require('./db/index');

// NEU: Audio Route einbinden
const audioRoutes = require('./routes/audio');
app.use('/api/audio', audioRoutes);

app.get('/', (req, res) => {
    res.json({ message: '✅ in:prove Backend läuft!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server läuft auf Port ${PORT}`);
});