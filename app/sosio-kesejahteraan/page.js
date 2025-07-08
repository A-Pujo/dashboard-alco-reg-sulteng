// Pastikan Anda menggunakan 'use client' jika ini adalah komponen klien di Next.js App Router
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ModalFilter from '../components/ModalFilter'; // Sesuaikan path jika berbeda
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Info, CalendarDays, Filter } from 'lucide-react'; // Contoh ikon dari lucide-react
import { formatLargeNumber } from '../lib/formatLargeNumber';

export default function DashboardKesra() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    waktu_awal: '2024-01-01',
    waktu_akhir: '2024-12-31',
  });
  const [ekonomiData, setEkonomiData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Konfigurasi dinamis untuk ModalFilter
  const filterFields = [
    { label: 'Waktu Awal', name: 'waktu_awal', type: 'input', inputType: 'date' },
    { label: 'Waktu Akhir', name: 'waktu_akhir', type: 'input', inputType: 'date' },
  ]

  const handleOpenFilterModal = () => {
    setIsFilterModalOpen(true);
  }

  // Fungsi untuk menutup modal
  const handleCloseFilterModal = () => {
    setIsFilterModalOpen(false);
  }

    // Fungsi yang akan dipanggil oleh modal saat filter diterapkan
  const handleApplyFilter = (filters) => {
  setAppliedFilters(filters)
    // console.log(filters)
  }

  // Panggil fetch data saat komponen dimuat atau filter berubah
  useEffect(() => {
    
  }, [appliedFilters]); // Sertakan fetchFiskalData dalam dependency array karena useCallback
  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <div className='flex justify-center'>
        <img src='https://blush.design/api/download?shareUri=pfkaLhuba&w=300&h=300&fm=png' />
      </div>
      <p className='w-full text-center font-bold'>Halaman sedang dibikin gaes ☕</p>

      <ModalFilter
        isOpen={isFilterModalOpen}
        onClose={handleCloseFilterModal}
        onApplyFilter={setAppliedFilters} // Langsung set appliedFilters
        filterFields={filterFields}
        initialFilterValues={appliedFilters} // Mengisi modal dengan filter yang sedang aktif
      />
    </main>
  );
}