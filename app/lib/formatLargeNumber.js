/**
 * Memformat angka besar menjadi string yang mudah dibaca
 * dengan singkatan K (Ribu), Jt (Juta), M (Miliar), T (Triliun), Qd (Quadriliun).
 *
 * @param {number} value Angka yang akan diformat.
 * @param {number} [decimalPlaces=2] Jumlah angka di belakang koma (default 2).
 * @returns {string} Angka yang diformat.
 */
export const formatLargeNumber = (value, decimalPlaces = 2) => {
    // Pastikan input adalah angka valid
    if (typeof value !== 'number' || isNaN(value)) {
      return value; // Atau bisa juga return 'N/A' atau error
    }
  
    // Tentukan batas dan singkatan
    const ranges = [
      { value: 1e15, symbol: 'Qd' }, // Quadrillion (10^15)
      { value: 1e12, symbol: 'T' },  // Trillion (10^12)
      { value: 1e9, symbol: 'M' },   // Miliar (10^9)
      { value: 1e6, symbol: 'Jt' },  // Juta (10^6)
      { value: 1e3, symbol: 'K' },   // Ribu (10^3)
    ];
  
    // Pastikan angka positif untuk logika ini, tangani negatif terpisah
    const isNegative = value < 0;
    let absValue = Math.abs(value);
  
    // Jika angka sangat kecil atau 0, kembalikan dalam format biasa
    if (absValue < 1000) {
      return `${value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimalPlaces
      })}`;
    }
  
    for (let i = 0; i < ranges.length; i++) {
      if (absValue >= ranges[i].value) {
        // Hitung nilai yang diformat
        const formattedValue = (absValue / ranges[i].value).toFixed(decimalPlaces);
        
        // Hapus trailing zeros jika ada (misal 1.00 menjadi 1)
        const cleanValue = parseFloat(formattedValue);
  
        // Kembalikan dengan singkatan dan tanda negatif jika ada
        return `${isNegative ? '-' : ''}${cleanValue}${ranges[i].symbol}`;
      }
    }
  
    // Jika tidak cocok dengan rentang di atas (misal angka sangat besar yang tidak masuk quadriliun)
    // Kembalikan angka asli dengan format locale (ribuan biasa)
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimalPlaces
    });
  }