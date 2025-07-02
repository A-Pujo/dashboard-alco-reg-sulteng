// app/components/ModalFilter.js
'use client'; 

import React, { useState, useEffect } from 'react';

/**
 * Komponen Modal Filter yang dinamis.
 * Input fields dapat disesuaikan melalui prop filterFields.
 *
 * @param {object} props - Properti komponen.
 * @param {boolean} props.isOpen - Menentukan apakah modal terbuka atau tertutup.
 * @param {function} props.onClose - Fungsi untuk menutup modal.
 * @param {function(object): void} props.onApplyFilter - Fungsi yang dipanggil saat filter diterapkan.
 * Menerima satu argumen: objek berisi nilai-nilai filter (key: nama field, value: nilai).
 * @param {Array<object>} props.filterFields - Array objek konfigurasi untuk input fields.
 * Contoh struktur:
 * [{label: 'Waktu Awal', name:'waktu_awal', type: 'input', inputType: 'date'},
 * {label: 'Kategori', name: 'kategori', type: 'select', options: [{label: 'Opsi 1', value: 'value1'}]},
 * {label: 'Pilihan Radio', name: 'radio_choice', type: 'radio', options: [{label: 'Ya', value: 'yes'}, {label: 'Tidak', value: 'no'}]}
 * ]
 * @param {object} [props.initialFilterValues={}] - Objek opsional untuk mengisi nilai awal filter.
 */
const ModalFilter = ({ isOpen, onClose, onApplyFilter, filterFields, initialFilterValues = {} }) => {
  // State lokal untuk menyimpan nilai dari semua input field secara dinamis
  // Menggunakan objek di mana kunci adalah 'name' dari field dan nilai adalah inputnya.
  const [filterValues, setFilterValues] = useState({});

  // Inisialisasi filterValues saat modal dibuka atau initialFilterValues berubah
  useEffect(() => {
    if (isOpen) {
      const initial = {};
      filterFields.forEach(field => {
        initial[field.name] = initialFilterValues[field.name] !== undefined 
                              ? initialFilterValues[field.name] 
                              : (field.type === 'select' || field.type === 'radio' ? '' : ''); // Default kosong untuk select/radio jika tidak ada initial
      });
      setFilterValues(initial);
    }
  }, [isOpen, filterFields, initialFilterValues]);

  // Handler perubahan untuk semua jenis input
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilterValues(prevValues => ({
      ...prevValues,
      [name]: type === 'radio' ? (checked ? value : prevValues[name]) : value
    }));
  };

  // Fungsi yang dipanggil saat tombol "Terapkan Filter" diklik
  const handleApply = () => {
    onApplyFilter(filterValues); // Kirim objek nilai filter ke parent
    onClose(); // Tutup modal setelah menerapkan filter
  };

  // Fungsi yang dipanggil saat tombol "Batal" atau overlay diklik
  const handleClose = () => {
    // Opsional: Reset nilai input saat modal ditutup tanpa menerapkan filter
    // setFilterValues({}); 
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-0"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="fixed inset-0 bg-gray-700 opacity-30 transition-opacity"
        onClick={handleClose}
      ></div>

      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg z-50 transform transition-all scale-100 opacity-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Filter Data</h3>

        <div className="space-y-4">
          {filterFields.map((field, index) => (
            <div key={field.name || index}>
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              {field.type === 'input' && (
                <input
                  type={field.inputType || 'text'} // Default ke 'text' jika tidak dispesifikasikan
                  id={field.name}
                  name={field.name}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm input text-base-content"
                  value={filterValues[field.name] || ''}
                  onChange={handleChange}
                  placeholder={field.placeholder || `Masukkan ${field.label.toLowerCase()}`}
                />
              )}
              {field.type === 'select' && (
                <select
                  id={field.name}
                  name={field.name}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm select text-base-content"
                  value={filterValues[field.name] || ''}
                  onChange={handleChange}
                >
                  <option value="">Pilih {field.label.toLowerCase()}</option> {/* Opsi default */}
                  {field.options && field.options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              {field.type === 'radio' && (
                <div className="mt-2 space-y-2">
                  {field.options && field.options.map(option => (
                    <div key={option.value} className="flex items-center">
                      <input
                        type="radio"
                        id={`${field.name}-${option.value}`}
                        name={field.name} // Penting: name harus sama untuk grup radio
                        value={option.value}
                        className="radio focus:ring-blue-500 h-4 w-4 text-secondary border-gray-300"
                        checked={filterValues[field.name] === option.value}
                        onChange={handleChange}
                      />
                      <label htmlFor={`${field.name}-${option.value}`} className="ml-2 block text-sm text-gray-900">
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {/* Anda bisa menambahkan jenis input lain di sini (misal: checkbox) */}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-md border border-gray-300 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            onClick={handleClose}
          >
            Batal
          </button>
          <button
            type="button"
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            onClick={handleApply}
          >
            Terapkan Filter
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalFilter;