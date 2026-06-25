const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const extractFoodItems = async (req, res) => {
    try {
        const { transcript } = req.body;

        if (!transcript) {
            return res.status(400).json({ error: 'Kein Transkript gefunden' });
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Du bist ein Ernährungsassistent für Sportler. 
                    Extrahiere aus dem Text alle Lebensmittel und deren Mengen.
                    Erkenne außerdem den Mahlzeit-Typ (Frühstück, Mittagessen, Abendessen oder Snack) falls erwähnt.
                    Antworte NUR mit einem JSON-Objekt in folgendem Format:
                    {
                        "items": [
                            {
                                "food_item": "Name des Lebensmittels",
                                "quantity_grams": Menge in Gramm als Zahl oder null,
                                "calories": geschätzte Kalorien als Zahl oder null,
                                "quantity_unclear": true oder false
                            }
                        ],
                        "detected_meal_type": "Frühstück" oder "Mittagessen" oder "Abendessen" oder "Snack" oder null,
                        "all_quantities_clear": true oder false,
                        "followup_question": "Rückfrage falls Mengen unklar, sonst null"
                    }`
                },
                {
                    role: 'user',
                    content: transcript
                }
            ],
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);
        res.json(result);

    } catch (error) {
        console.error('GPT Fehler:', error);
        res.status(500).json({ error: 'Extraktion fehlgeschlagen' });
    }
};

const clarifyQuantities = async (req, res) => {
    try {
        const { transcript, previousItems } = req.body;

        if (!transcript || !previousItems) {
            return res.status(400).json({ error: 'Fehlende Daten' });
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Du bist ein Ernährungsassistent für Sportler.
                    Der Nutzer hat bereits folgende Lebensmittel genannt: ${JSON.stringify(previousItems)}
                    Aktualisiere die Mengen basierend auf der neuen Antwort des Nutzers.
                    Antworte NUR mit einem JSON-Objekt im gleichen Format wie zuvor.`
                },
                {
                    role: 'user',
                    content: transcript
                }
            ],
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);
        res.json(result);

    } catch (error) {
        console.error('GPT Clarification Fehler:', error);
        res.status(500).json({ error: 'Clarification fehlgeschlagen' });
    }
};

module.exports = { extractFoodItems, clarifyQuantities };