const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

require('./db/index');

const audioRoutes = require('./routes/audio');
const foodRoutes = require('./routes/food');
const logRoutes = require('./routes/log');
const athleteRoutes = require('./routes/athletes');
const authRoutes = require('./routes/auth');

app.use('/api/audio', audioRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/log', logRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.json({ message: '✅ in:prove Backend läuft!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server läuft auf Port ${PORT}`);
});