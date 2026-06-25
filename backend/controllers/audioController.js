const OpenAI = require('openai');
const fs = require('fs');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const transcribeAudio = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Keine Audiodatei gefunden' });
        }

        console.log('📁 Datei empfangen:', req.file.originalname, req.file.mimetype);

        const oldPath = req.file.path;
        const newPath = oldPath + '.wav';
        fs.renameSync(oldPath, newPath);

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(newPath),
            model: 'whisper-1',
            language: 'de'
        });

        fs.unlinkSync(newPath);

        console.log('✅ Transkription:', transcription.text);
        res.json({ transcript: transcription.text });

    } catch (error) {
        console.error('❌ Whisper Fehler:', error.message);
        res.status(500).json({ error: 'Transkription fehlgeschlagen' });
    }
};

module.exports = { transcribeAudio };