import React from 'react';

function HalfCircleProgress({ consumed, goal, color, label, unit = 'g' }) {
    const percentage = goal > 0 ? Math.min(consumed / goal, 1) : 0;
    const isOver = consumed > goal;
    const r = 70;
    const cx = 100;
    const cy = 95;
    const strokeWidth = 12;
    const circumference = Math.PI * r;
    const dashOffset = circumference * (1 - percentage);

    return (
        <div className="checkin-progress">
            <svg viewBox="0 0 200 115" className="halfcircle-svg">
                <path
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
                <path
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none"
                    stroke={isOver ? '#ef4444' : color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                />
                <text x={cx} y={cy - 14} textAnchor="middle" fontSize="22" fontWeight="800" fill="#111827">
                    {consumed}{unit}
                </text>
                <text x={cx} y={cy + 8} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700">
                    {label}
                </text>
            </svg>
            <div className="checkin-stats">
                <div>
                    <span>Goal</span>
                    <strong>{goal}{unit}</strong>
                </div>
                <div>
                    <span>{isOver ? 'Over' : 'Left'}</span>
                    <strong style={{ color: isOver ? '#ef4444' : color }}>
                        {isOver ? `+${consumed - goal}` : goal - consumed}{unit}
                    </strong>
                </div>
            </div>
        </div>
    );
}

function SmallHalfCircle({ consumed, goal, color, label }) {
    const percentage = goal > 0 ? Math.min(consumed / goal, 1) : 0;
    const isOver = consumed > goal;
    const r = 36;
    const cx = 44;
    const cy = 44;
    const strokeWidth = 7;
    const circumference = Math.PI * r;
    const dashOffset = circumference * (1 - percentage);

    return (
        <div className="macro-circle">
            <svg viewBox="0 0 88 52" className="macro-svg">
                <path
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
                <path
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none"
                    stroke={isOver ? '#ef4444' : color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                />
                <text x={cx} y={cy - 6} textAnchor="middle" fontSize="13" fontWeight="800" fill="#111827">
                    {consumed}g
                </text>
            </svg>
            <p className="macro-circle-label" style={{ color }}>{label}</p>
            <p className="macro-circle-goal">{goal}g goal</p>
        </div>
    );
}

function CheckIn({ athlete, calorieGoal, consumedCalories, mealCount, consumedMacros, macroGoals }) {
    console.log('CheckIn macroGoals:', macroGoals);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <section className="checkin-card card">
            <div className="checkin-header">
                <div>
                    <p className="eyebrow">Daily check-in</p>
                    <h2>{greeting}, {athlete.name.split(' ')[0]}! 👋</h2>
                    <p className="checkin-question">What did you eat today so far?</p>
                </div>
            </div>

            <HalfCircleProgress
                consumed={consumedCalories}
                goal={calorieGoal}
                color="#3157d5"
                label="kcal today"
                unit=""
            />

            {mealCount > 0 && (
                <p className="checkin-meals">
                    {mealCount} {mealCount === 1 ? 'meal' : 'meals'} logged today
                </p>
            )}

            <div className="macro-circles">
                <SmallHalfCircle
                    consumed={consumedMacros.protein}
                    goal={macroGoals.protein}
                    color="#3157d5"
                    label="Protein"
                />
                <SmallHalfCircle
                    consumed={consumedMacros.carbs}
                    goal={macroGoals.carbs}
                    color="#0ea5e9"
                    label="Carbs"
                />
                <SmallHalfCircle
                    consumed={consumedMacros.fat}
                    goal={macroGoals.fat}
                    color="#8b5cf6"
                    label="Fat"
                />
            </div>
        </section>
    );
}

export default CheckIn;