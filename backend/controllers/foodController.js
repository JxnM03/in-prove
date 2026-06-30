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
    if (missingItems.length === 1) return `How much ${missingItems[0]} did you eat?`;
    return `How much ${missingItems.join(' and ')} did you eat?`;
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
                    content: `You are a precise sports nutrition assistant with expert knowledge of nutritional databases.

                    Estimate the nutritional values for each food item based on food_item and quantity_grams.
                    Use realistic reference values from nutrition databases (e.g. USDA FoodData Central).

                    Reference values (per 100g, cooked unless stated otherwise):
                    - Pasta (cooked): ~130 kcal, 5g P, 25g C, 1g F
                    - Rice (cooked): ~130 kcal, 3g P, 28g C, 0.3g F
                    - Chicken breast (grilled): ~165 kcal, 31g P, 0g C, 3.6g F
                    - Ground beef (fried): ~250 kcal, 26g P, 0g C, 17g F
                    - Salmon (fried): ~208 kcal, 20g P, 0g C, 13g F
                    - Egg (boiled): ~155 kcal, 13g P, 1g C, 11g F
                    - White bread/toast: ~265 kcal, 9g P, 49g C, 3g F
                    - Whole milk: ~61 kcal, 3g P, 5g C, 3g F
                    - Olive oil: ~884 kcal, 0g P, 0g C, 100g F
                    - Avocado: ~160 kcal, 2g P, 9g C, 15g F
                    - Banana: ~89 kcal, 1g P, 23g C, 0.3g F
                    - Almonds/nuts: ~580 kcal, 21g P, 22g C, 50g F

                    Important rules:
                    1. Do NOT change food_item.
                    2. Do NOT change quantity_grams.
                    3. Calculate nutritional values proportionally to the given quantity.
                    4. REQUIRED: calories must ALWAYS be calculated as: protein*4 + carbs*4 + fat*9 (rounded).
                    5. All values must be positive numbers – never null or 0 for an item with a known quantity.
                    6. For unknown foods: estimate based on similar known foods.
                    7. All food_item names and any text in the response must be written in English, regardless of the input language.
                    8. Respond exclusively with valid JSON.

                    Format:
                    {
                    "items": [
                        {
                        "food_item": "Name",
                        "quantity_grams": Number,
                        "calories": Number,
                        "protein_grams": Number,
                        "carbs_grams": Number,
                        "fat_grams": Number
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
    console.error('Nutrient estimation failed:', error);
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
                    content: `You are a precise sports nutrition assistant.

                        Extract all food items from the text and estimate their nutritional values as realistically as possible.

                        Extraction rules:
                        1. Return each food item as a separate item.
                        2. If an exact quantity is stated, enter it as quantity_grams.
                        3. If only an approximate quantity is given (e.g. "a handful", "a plate"), estimate a realistic gram amount.
                        4. If no quantity can be determined at all, set quantity_grams to null and quantity_unclear to true.
                        5. Consider the preparation method for nutritional values (grilled, boiled, fried, etc.).

                        Rules for follow-up questions when quantities are missing:
                        - Ask concrete, helpful follow-up questions with reference values that make it easy for the user to answer.
                        - ALWAYS give 3 size options: small, medium, large with concrete gram amounts.
                        - Additionally ask about the preparation method if relevant.
                        - Example pasta: "How much pasta did you eat? Small (~150g, approx. 195 kcal), Medium (~250g, approx. 325 kcal) or Large (~400g, approx. 520 kcal)?"
                        - Example meat: "Was the chicken grilled or fried? And how much – Small (~100g), Medium (~150g) or Large (~200g)?"
                        - Always ask about only the most important missing item first.
                        - For pasta, rice, legumes and other foods that absorb water: ALWAYS ask whether dry weight or cooked weight is meant, since the calories differ significantly.
                        - Example: "Was that the dry weight (from the package) or the weight after cooking? 250g dry (~880 kcal) vs. 250g cooked (~325 kcal)."

                        Rules for nutritional values:
                        - Estimate calories, protein_grams, carbs_grams, fat_grams realistically.
                        - Calories must be consistent: calories ≈ protein*4 + carbs*4 + fat*9

                        IMPORTANT: Regardless of the language the user writes or speaks in, ALWAYS respond in English. All food_item names, follow-up questions and any other text must be in English.

                        Respond exclusively with valid JSON:
                        {
                        "items": [
                            {
                            "food_item": "Name of the food item (including preparation method)",
                            "quantity_grams": Number or null,
                            "calories": Number or null,
                            "protein_grams": Number or null,
                            "carbs_grams": Number or null,
                            "fat_grams": Number or null,
                            "quantity_unclear": true or false
                            }
                        ],
                        "detected_meal_type": "Breakfast" or "Lunch" or "Dinner" or "Snack" or null,
                        "all_quantities_clear": true or false,
                        "followup_question": "Concrete follow-up question with reference values if quantities are unclear, otherwise null"
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
                    content: `You are a precise sports nutrition assistant.

                        The user has already mentioned the following food items:
                        ${JSON.stringify(previousItems, null, 2)}

                        The user is now answering a follow-up question about missing or unclear quantities.

                        Rules:
                        1. ALWAYS return all previous food items – delete nothing.
                        2. Only update items for which the user is now providing an answer.
                        3. Keep existing clear quantities and nutritional values unchanged.
                        4. If the user states a quantity, update quantity_grams and re-estimate all nutritional values.
                        5. If the user mentions the preparation method (e.g. "grilled"), update food_item and nutritional values accordingly.
                        6. Consider the preparation method for precise nutritional estimates.
                        7. Calories must be consistent: calories ≈ protein*4 + carbs*4 + fat*9
                        8. If quantities are still missing, ask a concrete follow-up question with reference values.
                        9. Example follow-up: "Was the rice cooked or was that the dry weight? A typical portion of cooked rice is ~150-200g."
                        10. IMPORTANT: Regardless of the language the user writes or speaks in, ALWAYS respond in English. All food_item names, follow-up questions and any other text must be in English.
                        11. Respond exclusively with valid JSON.

                        Format:
                        {
                        "items": [
                            {
                            "food_item": "Name (including preparation method)",
                            "quantity_grams": Number or null,
                            "calories": Number or null,
                            "protein_grams": Number or null,
                            "carbs_grams": Number or null,
                            "fat_grams": Number or null,
                            "quantity_unclear": true or false
                            }
                        ],
                        "detected_meal_type": null,
                        "all_quantities_clear": true or false,
                        "followup_question": "Concrete follow-up question with reference values or null"
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