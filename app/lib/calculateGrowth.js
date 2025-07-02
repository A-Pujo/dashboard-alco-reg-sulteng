export const calculateGrowth = (currentValue, previousValue) => {
    if (previousValue === 0 || previousValue === null || previousValue === undefined) {
        return null; // Hindari pembagian nol atau jika data sebelumnya tidak ada
    }
    return ((currentValue - previousValue) / previousValue) * 100; // Dalam persen
}