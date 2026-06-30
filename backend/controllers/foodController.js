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
                    content: `You are a precise sports nutrition assistant with expert knowledge of nutrition databases.

Estimate nutrients for each food item based on food_item and quantity_grams.
Use realistic reference values from nutrition databases such as USDA and equivalent food composition tables.

Reference values (per 100g, cooked unless stated otherwise):
- Pasta/noodles (cooked): ~130 kcal, 5g P, 25g C, 1g F
- Rice (cooked): ~130 kcal, 3g P, 28g C, 0.3g F
- Chicken breast (grilled): ~165 kcal, 31g P, 0g C, 3.6g F
- Ground beef (cooked): ~250 kcal, 26g P, 0g C, 17g F
- Salmon (cooked): ~208 kcal, 20g P, 0g C, 13g F
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
3. Calculate nutrients proportionally to the given quantity.
4. REQUIRED: calories must ALWAYS be calculated as protein*4 + carbs*4 + fat*9, rounded.
5. All values must be positive numbers, never null or 0 for an item with a known quantity.
6. For unknown foods, estimate based on similar known foods.
7. Reply only with valid JSON.

Format:
{
  "items": [
    {
      "food_item": "Name",
      "quantity_grams": number,
      "calories": number,
      "protein_grams": number,
      "carbs_grams": number,
      "fat_grams": number
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
        if (!transcript) return res.status(400).json({ error: 'No transcript found' });

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            messages: [
                {
                    role: 'system',
                    content: `You are a precise nutrition assistant for athletes.

Extract all food items from the text and estimate their nutrients as realistically as possible.

Extraction rules:
1. Return each food as its own item.
2. Return food_item names in English, including preparation style when relevant.
3. If an exact quantity is mentioned, set quantity_grams to that number.
4. If an approximate quantity is mentioned, such as "a handful" or "a plate", estimate a realistic gram amount.
5. If no quantity can be detected, set quantity_grams to null and quantity_unclear to true.
6. Account for preparation style when estimating nutrients, such as grilled, cooked, or fried.

Rules for follow-up questions when quantities are missing:
- Generate followup_question in English.
- Ask concrete, helpful follow-up questions with reference values that make the answer easier for the user.
- ALWAYS give 3 size options: small, medium, large with concrete gram amounts.
- Also ask about preparation style when relevant.
- Pasta example: "How much pasta did you eat? Small (~150g, about 195 kcal), medium (~250g, about 325 kcal), or large (~400g, about 520 kcal)?"
- Meat example: "Was the chicken grilled or fried? And how much: small (~100g), medium (~150g), or large (~200g)?"
- Ask only about the most important missing item first.
- For noodles, rice, legumes, and other foods that absorb water, ALWAYS ask whether the user means dry weight or cooked weight, because calories differ strongly.
- Example: "Was that dry weight from the package or cooked weight? 250g dry (~880 kcal) vs. 250g cooked (~325 kcal)."

Nutrition rules:
- Estimate calories, protein_grams, carbs_grams, and fat_grams realistically.
- Calories must be consistent: calories ~= protein*4 + carbs*4 + fat*9.

Meal type rule:
- Keep detected_meal_type as one of these exact internal values: "Frühstück", "Mittagessen", "Abendessen", "Snack", or null.
- Do not translate detected_meal_type values.

Reply only with valid JSON:
{
  "items": [
    {
      "food_item": "English food name including preparation style",
      "quantity_grams": number or null,
      "calories": number or null,
      "protein_grams": number or null,
      "carbs_grams": number or null,
      "fat_grams": number or null,
      "quantity_unclear": true or false
    }
  ],
  "detected_meal_type": "Frühstück" or "Mittagessen" or "Abendessen" or "Snack" or null,
  "all_quantities_clear": true or false,
  "followup_question": "Concrete English follow-up question with reference values if quantities are unclear, otherwise null"
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
        console.error('GPT extraction error:', error);
        res.status(500).json({ error: 'Extraction failed' });
    }
};

const clarifyQuantities = async (req, res) => {
    try {
        const { transcript, previousItems } = req.body;
        if (!transcript || !Array.isArray(previousItems)) {
            return res.status(400).json({ error: 'Missing data' });
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            messages: [
                {
                    role: 'system',
                    content: `You are a precise nutrition assistant for athletes.

The user has already mentioned these food items:
${JSON.stringify(previousItems, null, 2)}

The user is now answering a follow-up question. Update the entries accordingly.

Rules:
1. ALWAYS return all previous food items; do not delete anything.
2. Update only items the user is answering about now.
3. Keep existing clear quantities and nutrient values unchanged.
4. If the user gives a quantity, update quantity_grams and estimate all nutrients again.
5. If the user gives only a quantity, apply it to the first item with a missing quantity.
6. If the user mentions a new food item, add it.
7. If the user mentions preparation style, such as "grilled", update food_item and nutrients accordingly.
8. Return food_item names in English, including preparation style when relevant.
9. Account for preparation style for precise nutrient estimates.
10. Calories must be consistent: calories ~= protein*4 + carbs*4 + fat*9.
11. If quantities are still missing, ask a concrete English follow-up question with reference values.
12. Example follow-up: "Was the rice cooked or dry weight? A typical serving of cooked rice is ~150-200g."
13. Keep detected_meal_type as null unless the user explicitly provides one of these exact internal values: "Frühstück", "Mittagessen", "Abendessen", "Snack".
14. Do not translate detected_meal_type values.
15. Reply only with valid JSON.

Format:
{
  "items": [
    {
      "food_item": "English name including preparation style",
      "quantity_grams": number or null,
      "calories": number or null,
      "protein_grams": number or null,
      "carbs_grams": number or null,
      "fat_grams": number or null,
      "quantity_unclear": true or false
    }
  ],
  "detected_meal_type": null,
  "all_quantities_clear": true or false,
  "followup_question": "Concrete English follow-up question with reference values, or null"
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
        console.error('GPT clarification error:', error);
        res.status(500).json({ error: 'Clarification failed' });
    }
};

module.exports = { extractFoodItems, clarifyQuantities };
