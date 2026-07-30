import { calculateAccuracy } from '../utils/statistics';

export const SUMMARY_REASON_ICONS = {
    'Squat depth too shallow': '📏',
    'Not deep enough': '⬇️',
    'Too deep - risk of injury': '⚠️',
    'Slightly too deep': '↕️',
    'Uneven leg movement': '🦵',
    'Poor form detected': '❌',
};

export function buildReasonCounts(badReps = []) {
    const reasonCounts = {};
    badReps.forEach((rep) => {
        (rep.reasons || []).forEach((reason) => {
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });
    });

    return Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);
}

export function buildAllReps(goodAngles = [], badReps = []) {
    return [
        ...goodAngles.map((angle, index) => ({ angle, type: 'good', index })),
        ...badReps.map((rep, index) => ({ angle: rep.angle, type: 'bad', index: goodAngles.length + index })),
    ];
}

export function buildAngleChartData(allReps = []) {
    return {
        labels: allReps.map((_, i) => `Rep ${i + 1}`),
        datasets: [{
            label: 'Deepest Knee Angle (°)',
            data: allReps.map((rep) => rep.angle),
            borderColor: '#F15025',
            backgroundColor: 'rgba(241,80,37,0.15)',
            tension: 0.4,
            fill: true,
            pointBackgroundColor: allReps.map((rep) =>
                rep.type === 'good' ? '#22c55e' :
                    rep.angle >= 60 && rep.angle <= 120 ? '#f59e0b' : '#ef4444'
            ),
            pointRadius: 6,
            pointBorderColor: allReps.map((rep) =>
                rep.type === 'good' ? '#16a34a' : '#dc2626'
            ),
            pointBorderWidth: 2,
        }],
    };
}

export function buildRepChartData(totalGood, totalBad) {
    return {
        labels: ['Good Reps', 'Incorrect Reps'],
        datasets: [{
            label: 'Reps',
            data: [totalGood, totalBad],
            backgroundColor: ['#22c55e', '#ef4444'],
            borderRadius: 10,
            barThickness: 60,
        }],
    };
}

export function buildChartOptions(title, minY, maxY) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#666' } },
            title: { display: true, text: title, color: '#222', font: { size: 14 } },
        },
        scales: {
            x: { ticks: { color: '#666' }, grid: { color: '#E6E8E6' } },
            y: { ticks: { color: '#666' }, grid: { color: '#E6E8E6' }, min: minY, max: maxY },
        },
    };
}

export function buildSessionSummary({
    goodAngles = [],
    badReps = [],
    repCount = 0,
    sessionTime = 0,
    setResults = [],
}) {
    const totalGood = repCount;
    const totalBad = badReps.length;
    const totalAttempts = totalGood + totalBad;
    const accuracy = calculateAccuracy(totalGood, totalBad);
    const allReps = buildAllReps(goodAngles, badReps);
    const reasonCounts = buildReasonCounts(badReps);

    return {
        totalGood,
        totalBad,
        totalAttempts,
        accuracy,
        allReps,
        reasonCounts,
        angleChartData: buildAngleChartData(allReps),
        repChartData: buildRepChartData(totalGood, totalBad),
        setResults,
        sessionTime,
    };
}
