import React from 'react';

const formatNumber = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.round(number);
};

function InlineLoadingDots() {
  return (
    <span className="inline-loading-dots" aria-label="Loading">
      <span></span>
      <span></span>
      <span></span>
    </span>
  );
}

function MacroTag({ label, value, color, isUpdating }) {
  return (
    <span className="macro-tag" style={{ color }}>
      <span className="macro-tag-label">{label}</span>
      {value !== null ? (
        <strong>{value}g</strong>
      ) : isUpdating ? (
        <InlineLoadingDots />
      ) : (
        <strong>—</strong>
      )}
    </span>
  );
}

function FoodList({ items, isUpdating = false }) {
  if (!items || items.length === 0) {
    return (
      <section className="food-list card empty-food">
        <p className="eyebrow">Current meal</p>
        <h2>No food items detected yet</h2>
        <p>Start a recording to track your meal.</p>
      </section>
    );
  }

  const totalCalories = items.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
  const totalProtein = items.reduce((sum, item) => sum + (Number(item.protein_grams) || 0), 0);
  const totalCarbs = items.reduce((sum, item) => sum + (Number(item.carbs_grams) || 0), 0);
  const totalFat = items.reduce((sum, item) => sum + (Number(item.fat_grams) || 0), 0);
  const resolvedItems = items.filter((item) => formatNumber(item.quantity_grams)).length;

  return (
    <section className="food-list card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Current meal</p>
          <h2>Detected food items</h2>
        </div>
        <div className="progress-pill">
          {resolvedItems}/{items.length} quantities
        </div>
      </div>

      <div className="nutrition-summary">
        <div>
          <span>Calories</span>
          <strong>{Math.round(totalCalories) > 0 ? `${Math.round(totalCalories)} kcal` : '— kcal'}</strong>
        </div>
        <div>
          <span>Protein</span>
          <strong>{totalProtein > 0 ? `${Math.round(totalProtein)}g` : '—'}</strong>
        </div>
        <div>
          <span>Carbs</span>
          <strong>{totalCarbs > 0 ? `${Math.round(totalCarbs)}g` : '—'}</strong>
        </div>
        <div>
          <span>Fat</span>
          <strong>{totalFat > 0 ? `${Math.round(totalFat)}g` : '—'}</strong>
        </div>
      </div>

      <div className="food-card-list">
        {items.map((item, index) => {
          const quantity = formatNumber(item.quantity_grams);
          const calories = formatNumber(item.calories);
          const protein = formatNumber(item.protein_grams);
          const carbs = formatNumber(item.carbs_grams);
          const fat = formatNumber(item.fat_grams);
          const quantityMissing = !quantity;
          const caloriesMissing = !calories;

          return (
            <article
              className={quantityMissing ? 'food-item-card missing' : 'food-item-card'}
              key={index}
            >
              <div className="food-main">
                <div className="food-icon">{quantityMissing ? '❔' : '🍽️'}</div>
                <div>
                  <h3>{item.food_item}</h3>
                  <p>
                    {quantityMissing ? (
                      isUpdating ? <InlineLoadingDots /> : 'Quantity still missing'
                    ) : (
                      `${quantity} g`
                    )}
                  </p>
                  {!quantityMissing && (
                    <div className="food-macros">
                      <MacroTag label="P" value={protein} color="#3157d5" isUpdating={isUpdating} />
                      <MacroTag label="C" value={carbs} color="#0ea5e9" isUpdating={isUpdating} />
                      <MacroTag label="F" value={fat} color="#8b5cf6" isUpdating={isUpdating} />
                    </div>
                  )}
                </div>
              </div>

              <div className="food-metrics">
                <strong>
                  {caloriesMissing && isUpdating ? <InlineLoadingDots /> : (calories || '—')}
                </strong>
                <span>kcal</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default FoodList;