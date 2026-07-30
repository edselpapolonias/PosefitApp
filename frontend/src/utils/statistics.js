export function calculateAccuracy(validCount, invalidCount) {
    const total = validCount + invalidCount;
    return total > 0 ? Math.round((validCount / total) * 100) : 0;
}

export function countReasons(reps) {
    return reps.reduce((acc, rep) => {
        (rep.reasons || []).forEach((reason) => {
            acc[reason] = (acc[reason] || 0) + 1;
        });
        return acc;
    }, {});
}
