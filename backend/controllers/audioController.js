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

        // Whisper: Audio zu Text
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(req.file.path),
            model: 'whisper-1',
            language: 'de'
        });

        // Temporäre Datei wieder löschen
        fs.unlinkSync(req.file.path);

        res.json({ transcript: transcription.text });

    } catch (error) {
        console.error('Whisper Fehler:', error);
        res.status(500).json({ error: 'Transkription fehlgeschlagen' });
    }
};

module.exports = { transcribeAudio };