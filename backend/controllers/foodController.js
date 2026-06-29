const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const isPositiveNumber = (value) => {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
};

const toNumberOrNull = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const normalizeFoodName = (name) => {
    return String(name || '')
        .trim()
        .toLowerCase();
};

const normalizeItem = (item) => {
    const quantity = toNumberOrNull(item.quantity_grams);
    const calories = toNumberOrNull(item.calories);

    return {
        food_item: item.food_item || item.name || '',
        quantity_grams: quantity,
        calories: calories,
        quantity_unclear: !isPositiveNumber(quantity)
    };
};

const hasClearQuantity = (item) => {
    return isPositiveNumber(item.quantity_grams);
};

const calculateAllQuantitiesClear = (items) => {
    return items.length > 0 && items.every(hasClearQuantity);
};

const buildFollowupQuestion = (items) => {
    const missingItems = items
        .filter((item) => !hasClearQuantity(item))
        .map((item) => item.food_item)
        .filter(Boolean);

    if (missingItems.length === 0) {
        return null;
    }

    if (missingItems.length === 1) {
        return `Wie viel ${missingItems[0]} hast du gegessen?`;
    }

    return `Wie viel ${missingItems.join(' und ')} hast du gegessen?`;
};

const findMatchingItemIndex = (items, updatedItem) => {
    const updatedName = normalizeFoodName(updatedItem.food_item);

    if (!updatedName) {
        return -1;
    }

    return items.findIndex((item) => {
        const existingName = normalizeFoodName(item.food_item);

        if (!existingName) {
            return false;
        }

        return (
            existingName === updatedName ||
            existingName.includes(updatedName) ||
            updatedName.includes(existingName)
        );
    });
};

const extractFirstQuantityFromText = (text) => {
    const match = String(text || '').match(/(\d+(?:[.,]\d+)?)\s*(g|gramm|gram|grams)?/i);

    if (!match) {
        return null;
    }

    return Number(match[1].replace(',', '.'));
};

const applyFallbackQuantityIfNeeded = (items, transcript, gptItems) => {
    const hasGptQuantity = gptItems.some((item) => isPositiveNumber(item.quantity_grams));

    if (hasGptQuantity) {
        return items;
    }

    const quantity = extractFirstQuantityFromText(transcript);

    if (!isPositiveNumber(quantity)) {
        return items;
    }

    const firstMissingIndex = items.findIndex((item) => !hasClearQuantity(item));

    if (firstMissingIndex === -1) {
        return items;
    }

    const updatedItems = [...items];

    updatedItems[firstMissingIndex] = {
        ...updatedItems[firstMissingIndex],
        quantity_grams: quantity,
        quantity_unclear: false
    };

    return updatedItems;
};

const enrichCaloriesIfPossible = async(items) => {
    const needsCalories = items.some(
        (item) => hasClearQuantity(item) && !isPositiveNumber(item.calories)
    );

    if (!needsCalories) {
        return items;
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            messages: [{
                    role: 'system',
                    content: `Du bist ein Ernährungsassistent.

Schätze die Kalorien für die angegebenen Lebensmittel basierend auf food_item und quantity_grams.

Regeln:
1. Verändere food_item nicht.
2. Verändere quantity_grams nicht.
3. Setze calories als geschätzte Gesamtkalorien für genau diese Menge.
4. Antworte ausschließlich mit gültigem JSON.

Format:
{
  "items": [
    {
      "food_item": "Name des Lebensmittels",
      "quantity_grams": Menge in Gramm als Zahl,
      "calories": geschätzte Gesamtkalorien als Zahl
    }
  ]
}`
                },
                {
                    role: 'user',
                    content: JSON.stringify({ items }, null, 2)
                }
            ],
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);
        const calorieItems = Array.isArray(result.items) ? result.items : [];

        return items.map((item) => {
            const matchingCalorieItem = calorieItems.find(
                (calorieItem) =>
                normalizeFoodName(calorieItem.food_item) === normalizeFoodName(item.food_item)
            );

            const calories = toNumberOrNull(matchingCalorieItem ? matchingCalorieItem.calories : null);

            return {
                ...item,
                calories: isPositiveNumber(calories) ? calories : item.calories
            };
        });
    } catch (error) {
        console.error('Kalorienschätzung fehlgeschlagen:', error);
        return items;
    }
};

const buildResponse = async({ items, detectedMealType = null }) => {
    const normalizedItems = items.map(normalizeItem);
    const allQuantitiesClear = calculateAllQuantitiesClear(normalizedItems);

    const enrichedItems = allQuantitiesClear ?
        await enrichCaloriesIfPossible(normalizedItems) :
        normalizedItems;

    return {
        items: enrichedItems,
        detected_meal_type: detectedMealType,
        all_quantities_clear: allQuantitiesClear,
        followup_question: allQuantitiesClear ? null : buildFollowupQuestion(enrichedItems)
    };
};

const normalizeExtractionResult = async(result) => {
    const items = Array.isArray(result.items) ?
        result.items.map(normalizeItem) : [];

    return buildResponse({
        items,
        detectedMealType: result.detected_meal_type || null
    });
};

const mergeClarificationResult = async(previousItems, gptResult, transcript) => {
    let mergedItems = previousItems.map(normalizeItem);
    const updatedItems = Array.isArray(gptResult.items) ?
        gptResult.items.map(normalizeItem) : [];

    updatedItems.forEach((updatedItem) => {
        const matchIndex = findMatchingItemIndex(mergedItems, updatedItem);

        if (matchIndex >= 0) {
            const existingItem = mergedItems[matchIndex];
            const hasNewQuantity = isPositiveNumber(updatedItem.quantity_grams);
            const hasNewCalories = isPositiveNumber(updatedItem.calories);

            mergedItems[matchIndex] = {
                ...existingItem,
                food_item: existingItem.food_item || updatedItem.food_item,
                quantity_grams: hasNewQuantity ?
                    updatedItem.quantity_grams : existingItem.quantity_grams,
                calories: hasNewCalories ?
                    updatedItem.calories : existingItem.calories,
                quantity_unclear: hasNewQuantity ?
                    false :
                    !hasClearQuantity(existingItem)
            };
        } else if (updatedItem.food_item) {
            mergedItems.push(updatedItem);
        }
    });

    mergedItems = applyFallbackQuantityIfNeeded(mergedItems, transcript, updatedItems);

    return buildResponse({
        items: mergedItems,
        detectedMealType: gptResult.detected_meal_type || null
    });
};

const extractFoodItems = async(req, res) => {
    try {
        const { transcript } = req.body;

        if (!transcript) {
            return res.status(400).json({ error: 'Kein Transkript gefunden' });
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            messages: [{
                    role: 'system',
                    content: `Du bist ein Ernährungsassistent für Sportler.

Extrahiere aus dem Text alle Lebensmittel und deren Mengen.
Erkenne außerdem den Mahlzeit-Typ, falls er erwähnt wird.

Wichtige Regeln:
1. Gib jedes Lebensmittel als eigenes Item zurück.
2. Wenn eine Menge klar genannt wird, trage quantity_grams als Zahl ein.
3. Wenn eine Menge nur ungefähr beschrieben wird, schätze eine plausible Grammzahl und setze quantity_unclear auf false.
4. Wenn keine Menge genannt wird und keine sichere Schätzung möglich ist, setze quantity_grams auf null und quantity_unclear auf true.
5. all_quantities_clear ist nur true, wenn jedes Item eine brauchbare Menge hat.
6. Wenn Mengen fehlen, stelle eine konkrete Rückfrage zu genau den fehlenden Mengen.
7. Kalorien sollen geschätzt werden, wenn eine Menge vorhanden ist.
8. Antworte ausschließlich mit gültigem JSON.

Format:
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

        const rawResult = JSON.parse(response.choices[0].message.content);
        const result = await normalizeExtractionResult(rawResult);

        res.json(result);

    } catch (error) {
        console.error('GPT Fehler:', error);
        res.status(500).json({ error: 'Extraktion fehlgeschlagen' });
    }
};

const clarifyQuantities = async(req, res) => {
    try {
        const { transcript, previousItems } = req.body;

        if (!transcript || !Array.isArray(previousItems)) {
            return res.status(400).json({ error: 'Fehlende Daten' });
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            messages: [{
                    role: 'system',
                    content: `Du bist ein Ernährungsassistent für Sportler.

Der Nutzer hat bereits folgende Lebensmittel genannt:
${JSON.stringify(previousItems, null, 2)}

Der Nutzer antwortet jetzt auf eine Rückfrage zu fehlenden oder unklaren Mengen.

Regeln:
1. Gib IMMER alle bisherigen Lebensmittel zurück.
2. Lösche keine Lebensmittel.
3. Füge keine neuen Lebensmittel hinzu, außer der Nutzer nennt ausdrücklich ein neues Lebensmittel.
4. Behalte vorhandene klare Mengen unverändert.
5. Aktualisiere nur Lebensmittel, für die der Nutzer jetzt eine Menge nennt.
6. Wenn die Antwort nur eine Menge enthält, ordne sie dem ersten Lebensmittel ohne quantity_grams zu.
7. Wenn der Nutzer das Lebensmittel in der Antwort nennt, ordne die Menge diesem Lebensmittel zu.
8. Kalorien sollen geschätzt werden, wenn eine Menge vorhanden ist.
9. Wenn danach alle Mengen klar sind, setze all_quantities_clear auf true und followup_question auf null.
10. Wenn weiterhin Mengen fehlen, stelle eine konkrete nächste Rückfrage.
11. Antworte ausschließlich mit gültigem JSON.

Format:
{
  "items": [
    {
      "food_item": "Name des Lebensmittels",
      "quantity_grams": Menge in Gramm als Zahl oder null,
      "calories": geschätzte Kalorien als Zahl oder null,
      "quantity_unclear": true oder false
    }
  ],
  "detected_meal_type": null,
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

        const rawResult = JSON.parse(response.choices[0].message.content);
        const result = await mergeClarificationResult(previousItems, rawResult, transcript);

        res.json(result);

    } catch (error) {
        console.error('GPT Clarification Fehler:', error);
        res.status(500).json({ error: 'Clarification fehlgeschlagen' });
    }
};

module.exports = { extractFoodItems, clarifyQuantities };