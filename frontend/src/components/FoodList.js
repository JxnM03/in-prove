import React from 'react';

function FoodList({ items }) {
  if (!items || items.length === 0) return null;

  const totalCalories = items.reduce(
    (sum, item) => sum + (item.calories || 0), 0
  );

  return (
    <div className="food-list">
      <h2>🍽️ Erkannte Lebensmittel</h2>
      <table>
        <thead>
          <tr>
            <th>Lebensmittel</th>
            <th>Menge (g)</th>
            <th>Kalorien</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td>{item.food_item}</td>
              <td>{item.quantity_grams || '?'}</td>
              <td>{item.calories || '?'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="2"><strong>Gesamt</strong></td>
            <td><strong>{totalCalories} kcal</strong></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default FoodList;