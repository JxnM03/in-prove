import React from 'react';

function HalfCircleProgress({ consumed, goal }) {
    const percentage = Math.min(consumed / goal, 1);
    const isOver = consumed > goal;
    const remaining = Math.max(goal - consumed, 0);

    // Feste Geometrie: Halbkreis von links nach rechts
    const r = 70;
    const cx = 100;
    const cy = 95;
    const strokeWidth = 12;

    // Gesamtlänge des Halbkreis-Bogens
    const circumference = Math.PI * r;
    const dashOffset = circumference * (1 - percentage);

    return (
        <div className="checkin-progress">
            <svg viewBox="0 0 200 115" className="halfcircle-svg">
                {/* Hintergrund-Halbkreis */}
                <path
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
                {/* Progress-Halbkreis via strokeDasharray */}
                <path
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    fill="none"
                    stroke={isOver ? '#ef4444' : '#3157d5'}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                />
                {/* Zahl */}
                <text
                    x={cx}
                    y={cy - 14}
                    textAnchor="middle"
                    fontSize="24"
                    fontWeight="800"
                    fill="#111827"
                >
                    {consumed}
                </text>
                {/* Label */}
                <text
                    x={cx}
                    y={cy + 8}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#64748b"
                    fontWeight="700"
                >
                    kcal today
                </text>
            </svg>

            <div className="checkin-stats">
                <div>
                    <span>Goal</span>
                    <strong>{goal} kcal</strong>
                </div>
                <div>
                    <span>{isOver ? 'Over by' : 'Remaining'}</span>
                    <strong style={{ color: isOver ? '#ef4444' : '#3157d5' }}>
                        {isOver ? `+${consumed - goal}` : remaining} kcal
                    </strong>
                </div>
            </div>
        </div>
    );
}

function CheckIn({ athlete, calorieGoal, consumedCalories, mealCount }) {
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
            />

            {mealCount > 0 && (
                <p className="checkin-meals">
                    {mealCount} {mealCount === 1 ? 'meal' : 'meals'} logged today
                </p>
            )}
        </section>
    );
}

export default CheckIn;