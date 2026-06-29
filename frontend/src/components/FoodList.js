import React from 'react';

const formatNumber = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

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

  const totalCalories = items.reduce(
    (sum, item) => sum + (Number(item.calories) || 0),
    0
  );

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
          <strong>
            {Math.round(totalCalories) > 0
              ? `${Math.round(totalCalories)} kcal`
              : '— kcal'}
          </strong>
        </div>

        <div>
          <span>Items</span>
          <strong>{items.length}</strong>
        </div>
      </div>

      <div className="food-card-list">
        {items.map((item, index) => {
          const quantity = formatNumber(item.quantity_grams);
          const calories = formatNumber(item.calories);
          const quantityMissing = !quantity;
          const caloriesMissing = !calories;

          return (
            <article
              className={quantityMissing ? 'food-item-card missing' : 'food-item-card'}
              key={index}
            >
              <div className="food-main">
                <div className="food-icon">
                  {quantityMissing ? '❔' : '🍽️'}
                </div>

                <div>
                  <h3>{item.food_item}</h3>
                  <p>
                    {quantityMissing ? (
                      isUpdating ? (
                        <InlineLoadingDots />
                      ) : (
                        'Quantity still missing'
                      )
                    ) : (
                      `${quantity} g`
                    )}
                  </p>
                </div>
              </div>

              <div className="food-metrics">
                <strong>
                  {caloriesMissing && isUpdating ? (
                    <InlineLoadingDots />
                  ) : (
                    calories || '—'
                  )}
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
