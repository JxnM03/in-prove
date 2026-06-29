const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const isPositiveNumber = (value) => {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
};

const toNumberOrNull = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const normalizeFoodName = (name) => {
    return String(name || '').trim().toLowerCase();
};

const normalizeItem = (item) => {
    const quantity = toNumberOrNull(item.quantity_grams);
    const calories = toNumberOrNull(item.calories);
    const protein = toNumberOrNull(item.protein_grams);
    const carbs = toNumberOrNull(item.carbs_grams);
    const fat = toNumberOrNull(item.fat_grams);

    return {
        food_item: item.food_item || item.name || '',
        quantity_grams: quantity,
        calories: calories,
        protein_grams: protein,
        carbs_grams: carbs,
        fat_grams: fat,
        quantity_unclear: !isPositiveNumber(quantity)
    };
};

const hasClearQuantity = (item) => isPositiveNumber(item.quantity_grams);

const calculateAllQuantitiesClear = (items) => {
    return items.length > 0 && items.every(hasClearQuantity);
};

const buildFollowupQuestion = (items) => {
    const missingItems = items
        .filter((item) => !hasClearQuantity(item))
        .map((item) => item.food_item)
        .filter(Boolean);

    if (missingItems.length === 0) return null;
    if (missingItems.length === 1) return `Wie viel ${missingItems[0]} hast du gegessen?`;
    return `Wie viel ${missingItems.join(' und ')} hast du gegessen?`;
};

const findMatchingItemIndex = (items, updatedItem) => {
    const updatedName = normalizeFoodName(updatedItem.food_item);
    if (!updatedName) return -1;

    return items.findIndex((item) => {
        const existingName = normalizeFoodName(item.food_item);
        if (!existingName) return false;
        return (
            existingName === updatedName ||
            existingName.includes(updatedName) ||
            updatedName.includes(existingName)
        );
    });
};

const extractFirstQuantityFromText = (text) => {
    const match = String(text || '').match(/(\d+(?:[.,]\d+)?)\s*(g|gramm|gram|grams)?/i);
    if (!match) return null;
    return Number(match[1].replace(',', '.'));
};

const applyFallbackQuantityIfNeeded = (items, transcript, gptItems) => {
    const hasGptQuantity = gptItems.some((item) => isPositiveNumber(item.quantity_grams));
    if (hasGptQuantity) return items;

    const quantity = extractFirstQuantityFromText(transcript);
    if (!isPositiveNumber(quantity)) return items;

    const firstMissingIndex = items.findIndex((item) => !hasClearQuantity(item));
    if (firstMissingIndex === -1) return items;

    const updatedItems = [...items];
    updatedItems[firstMissingIndex] = {
        ...updatedItems[firstMissingIndex],
        quantity_grams: quantity,
        quantity_unclear: false
    };
    return updatedItems;
};

const enrichNutrientsIfPossible = async (items) => {
    const needsEnrichment = items.some(
        (item) => hasClearQuantity(item) && (
            !isPositiveNumber(item.calories) ||
            !isPositiveNumber(item.protein_grams) ||
            !isPositiveNumber(item.carbs_grams) ||
            !isPositiveNumber(item.fat_grams)
        )
    );

    if (!needsEnrichment) return items;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            messages: [
                {
                    role: 'system',
                    content: `Du bist ein präziser Sporternährungsassistent mit Expertenwissen über Nährwertdatenbanken.

                    Schätze für jedes Lebensmittel die Nährwerte basierend auf food_item und quantity_grams.
                    Nutze dabei realistische Referenzwerte aus Nährwertdatenbanken (z.B. USDA, Bundeslebensmittelschlüssel).

                    Referenzwerte (pro 100g, gekocht sofern nicht anders angegeben):
                    - Pasta/Nudeln (gekocht): ~130 kcal, 5g P, 25g C, 1g F
                    - Reis (gekocht): ~130 kcal, 3g P, 28g C, 0.3g F
                    - Hähnchenbrust (gegrillt): ~165 kcal, 31g P, 0g C, 3.6g F
                    - Rinderhackfleisch (gebraten): ~250 kcal, 26g P, 0g C, 17g F
                    - Lachs (gebraten): ~208 kcal, 20g P, 0g C, 13g F
                    - Ei (gekocht): ~155 kcal, 13g P, 1g C, 11g F
                    - Weißbrot/Toast: ~265 kcal, 9g P, 49g C, 3g F
                    - Vollmilch: ~61 kcal, 3g P, 5g C, 3g F
                    - Olivenöl: ~884 kcal, 0g P, 0g C, 100g F
                    - Avocado: ~160 kcal, 2g P, 9g C, 15g F
                    - Banane: ~89 kcal, 1g P, 23g C, 0.3g F
                    - Mandeln/Nüsse: ~580 kcal, 21g P, 22g C, 50g F

                    Wichtige Regeln:
                    1. Verändere food_item NICHT.
                    2. Verändere quantity_grams NICHT.
                    3. Berechne Nährwerte proportional zur angegebenen Menge.
                    4. PFLICHT: calories muss IMMER berechnet werden als: protein*4 + carbs*4 + fat*9 (gerundet).
                    5. Alle Werte müssen positive Zahlen sein – niemals null oder 0 für ein Item mit bekannter Menge.
                    6. Bei unbekannten Lebensmitteln: schätze anhand ähnlicher bekannter Lebensmittel.
                    7. Antworte ausschließlich mit gültigem JSON.

                    Format:
                    {
                    "items": [
                        {
                        "food_item": "Name",
                        "quantity_grams": Zahl,
                        "calories": Zahl,
                        "protein_grams": Zahl,
                        "carbs_grams": Zahl,
                        "fat_grams": Zahl
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
        const enrichedItems = Array.isArray(result.items) ? result.items : [];

        return items.map((item) => {
            const match = enrichedItems.find(
                (e) => normalizeFoodName(e.food_item) === normalizeFoodName(item.food_item)
            );
            if (!match) return item;

            return {
                ...item,
                calories: isPositiveNumber(toNumberOrNull(match.calories)) ? toNumberOrNull(match.calories) : item.calories,
                protein_grams: isPositiveNumber(toNumberOrNull(match.protein_grams)) ? toNumberOrNull(match.protein_grams) : item.protein_grams,
                carbs_grams: isPositiveNumber(toNumberOrNull(match.carbs_grams)) ? toNumberOrNull(match.carbs_grams) : item.carbs_grams,
                fat_grams: isPositiveNumber(toNumberOrNull(match.fat_grams)) ? toNumberOrNull(match.fat_grams) : item.fat_grams,
            };
        });
    } catch (error) {
        console.error('Nährwertschätzung fehlgeschlagen:', error);
        return items;
    }
};

const buildResponse = async ({ items, detectedMealType = null }) => {
    const normalizedItems = items.map(normalizeItem);
    const allQuantitiesClear = calculateAllQuantitiesClear(normalizedItems);

    const enrichedItems = allQuantitiesClear
        ? await enrichNutrientsIfPossible(normalizedItems)
        : normalizedItems;

    return {
        items: enrichedItems,
        detected_meal_type: detectedMealType,
        all_quantities_clear: allQuantitiesClear,
        followup_question: allQuantitiesClear ? null : buildFollowupQuestion(enrichedItems)
    };
};

const normalizeExtractionResult = async (result) => {
    const items = Array.isArray(result.items) ? result.items.map(normalizeItem) : [];
    return buildResponse({ items, detectedMealType: result.detected_meal_type || null });
};

const mergeClarificationResult = async (previousItems, gptResult, transcript) => {
    let mergedItems = previousItems.map(normalizeItem);
    const updatedItems = Array.isArray(gptResult.items)
        ? gptResult.items.map(normalizeItem)
        : [];

    updatedItems.forEach((updatedItem) => {
        const matchIndex = findMatchingItemIndex(mergedItems, updatedItem);

        if (matchIndex >= 0) {
            const existingItem = mergedItems[matchIndex];
            const hasNewQuantity = isPositiveNumber(updatedItem.quantity_grams);
            const hasNewCalories = isPositiveNumber(updatedItem.calories);
            const hasNewProtein = isPositiveNumber(updatedItem.protein_grams);
            const hasNewCarbs = isPositiveNumber(updatedItem.carbs_grams);
            const hasNewFat = isPositiveNumber(updatedItem.fat_grams);

            mergedItems[matchIndex] = {
                ...existingItem,
                food_item: existingItem.food_item || updatedItem.food_item,
                quantity_grams: hasNewQuantity ? updatedItem.quantity_grams : existingItem.quantity_grams,
                calories: hasNewCalories ? updatedItem.calories : existingItem.calories,
                protein_grams: hasNewProtein ? updatedItem.protein_grams : existingItem.protein_grams,
                carbs_grams: hasNewCarbs ? updatedItem.carbs_grams : existingItem.carbs_grams,
                fat_grams: hasNewFat ? updatedItem.fat_grams : existingItem.fat_grams,
                quantity_unclear: hasNewQuantity ? false : !hasClearQuantity(existingItem)
            };
        } else if (updatedItem.food_item) {
            mergedItems.push(updatedItem);
        }
    });

    mergedItems = applyFallbackQuantityIfNeeded(mergedItems, transcript, updatedItems);
    return buildResponse({ items: mergedItems, detectedMealType: gptResult.detected_meal_type || null });
};

const extractFoodItems = async (req, res) => {
    try {
        const { transcript } = req.body;
        if (!transcript) return res.status(400).json({ error: 'Kein Transkript gefunden' });

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            messages: [
                {
                    role: 'system',
                    content: `Du bist ein präziser Ernährungsassistent für Sportler.

Extrahiere alle Lebensmittel aus dem Text und schätze deren Nährwerte so realistisch wie möglich.

Regeln für die Extraktion:
1. Gib jedes Lebensmittel als eigenes Item zurück.
2. Wenn eine genaue Menge genannt wird, trage sie als quantity_grams ein.
3. Wenn eine ungefähre Menge genannt wird (z.B. "eine Handvoll", "ein Teller"), schätze eine realistische Grammzahl.
4. Wenn gar keine Menge erkennbar ist, setze quantity_grams auf null und quantity_unclear auf true.
5. Berücksichtige die Zubereitungsart für Nährwerte (gegrillt, gekocht, frittiert etc.).

Regeln für Rückfragen bei fehlenden Mengen:
- Stelle konkrete, hilfreiche Rückfragen mit Referenzwerten die dem Nutzer die Antwort erleichtern.
- Gib IMMER 3 Größenoptionen an: klein, mittel, groß mit konkreten Gramm-Angaben.
- Frage zusätzlich nach der Zubereitungsart wenn sie relevant ist.
- Beispiel Pasta: "Wie viel Pasta hast du gegessen? Klein (~150g, ca. 195 kcal), Normal (~250g, ca. 325 kcal) oder Groß (~400g, ca. 520 kcal)?"
- Beispiel Fleisch: "War das Hähnchen gegrillt oder frittiert? Und wie viel – Klein (~100g), Normal (~150g) oder Groß (~200g)?"
- Frage immer nur nach dem wichtigsten fehlenden Item zuerst.
- Bei Nudeln, Reis, Hülsenfrüchten und anderen Lebensmitteln die Wasser aufnehmen: frage IMMER ob das Trocken- oder Kochgewicht gemeint ist, da sich die Kalorien stark unterscheiden.
- Beispiel: "War das Trockengewicht (aus der Packung) oder das Gewicht nach dem Kochen? 250g Trocken (~880 kcal) vs. 250g Gekocht (~325 kcal)."

Regeln für Nährwerte:
- Schätze calories, protein_grams, carbs_grams, fat_grams realistisch.
- Kalorien müssen konsistent sein: calories ≈ protein*4 + carbs*4 + fat*9

Antworte ausschließlich mit gültigem JSON:
{
  "items": [
    {
      "food_item": "Name des Lebensmittels (inkl. Zubereitungsart)",
      "quantity_grams": Zahl oder null,
      "calories": Zahl oder null,
      "protein_grams": Zahl oder null,
      "carbs_grams": Zahl oder null,
      "fat_grams": Zahl oder null,
      "quantity_unclear": true oder false
    }
  ],
  "detected_meal_type": "Frühstück" oder "Mittagessen" oder "Abendessen" oder "Snack" oder null,
  "all_quantities_clear": true oder false,
  "followup_question": "Konkrete Rückfrage mit Referenzwerten falls Mengen unklar, sonst null"
}`
                },
                { role: 'user', content: transcript }
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

const clarifyQuantities = async (req, res) => {
    try {
        const { transcript, previousItems } = req.body;
        if (!transcript || !Array.isArray(previousItems)) {
            return res.status(400).json({ error: 'Fehlende Daten' });
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            messages: [
                {
                    role: 'system',
                    content: `Du bist ein präziser Ernährungsassistent für Sportler.

Der Nutzer hat bereits folgende Lebensmittel genannt:
${JSON.stringify(previousItems, null, 2)}

Der Nutzer antwortet jetzt auf eine Rückfrage. Aktualisiere die Einträge entsprechend.

Regeln:
1. Gib IMMER alle bisherigen Lebensmittel zurück – lösche nichts.
2. Aktualisiere nur Items, für die der Nutzer jetzt eine Antwort gibt.
3. Behalte vorhandene klare Mengen und Nährwerte unverändert.
4. Wenn der Nutzer eine Menge nennt, aktualisiere quantity_grams und schätze alle Nährwerte neu.
5. Wenn der Nutzer die Zubereitungsart nennt (z.B. "gegrillt"), aktualisiere food_item und Nährwerte entsprechend.
6. Berücksichtige die Zubereitungsart für präzise Nährwertschätzungen.
7. Kalorien müssen konsistent sein: calories ≈ protein*4 + carbs*4 + fat*9
8. Wenn noch Mengen fehlen, stelle eine konkrete Rückfrage mit Referenzwerten.
9. Beispiel Rückfrage: "War der Reis gekocht oder war das Trockengewicht? Eine typische Portion gekochter Reis sind ~150-200g."
10. Antworte ausschließlich mit gültigem JSON.

Format:
{
  "items": [
    {
      "food_item": "Name (inkl. Zubereitungsart)",
      "quantity_grams": Zahl oder null,
      "calories": Zahl oder null,
      "protein_grams": Zahl oder null,
      "carbs_grams": Zahl oder null,
      "fat_grams": Zahl oder null,
      "quantity_unclear": true oder false
    }
  ],
  "detected_meal_type": null,
  "all_quantities_clear": true oder false,
  "followup_question": "Konkrete Rückfrage mit Referenzwerten oder null"
}`
                },
                { role: 'user', content: transcript }
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