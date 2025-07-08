// Pastikan Anda menggunakan 'use client' jika ini adalah komponen klien di Next.js App Router
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ModalFilter from '../components/ModalFilter'; // Sesuaikan path jika berbeda
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Info, CalendarDays, Filter } from 'lucide-react'; // Contoh ikon dari lucide-react
import { formatLargeNumber } from '../lib/formatLargeNumber';

// --- Komponen Placeholder (Anda akan mengganti ini dengan komponen nyata Anda) ---

// Komponen Card untuk ringkasan kinerja
const CardKinerja = ({ title, value, unit, change, changeType = 'positive', description, icon: Icon }) => (
  <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
    <div className="flex justify-between items-start mb-3">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      {Icon && <Icon className="w-5 h-5 text-gray-400" />}
    </div>
    <div className="flex items-end mb-2">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {unit && <span className="ml-2 text-sm text-gray-500">{unit}</span>}
    </div>
    {change && (
      <div className={`flex items-center text-sm ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
        {changeType === 'positive' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        {change}
        <span className="ml-1 text-gray-500">{description}</span>
      </div>
    )}
  </div>
);

export default function DashboardKinerjaFiskal() {
  const now = new Date()
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({
    waktu_awal: `${now.getFullYear()}-01-01`,
    waktu_akhir: `${now.getFullYear()}-12-31`,
  })
  const [fiskalData, setFiskalData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

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

  // Fungsi untuk mengambil data (Anda akan mengganti ini dengan fungsi API nyata Anda)
  const fetchFiskalData = useCallback(async (filters) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulasi fetching data dari API atau database
      // Di sini Anda akan memanggil API Anda, mungkin menggunakan fungsi dari Supabase
      // Contoh: const response = await supabase.from('fiskal_apbn').select('*').filter(...filters);
      // Untuk tujuan contoh, kita akan mengembalikan data dummy
      const dummyData = {
        totalPendapatan: 150000000000000, // 150 Triliun
        totalBelanja: 120000000000000,    // 120 Triliun
        surplusDefisit: 30000000000000,   // 30 Triliun
        pendapatanYoYChange: '10.5%',
        belanjaYoYChange: '8.2%',
        pendapatanTrendData: [100, 110, 120, 130, 140, 150], // dalam Triliun
        belanjaTrendData: [90, 95, 105, 110, 115, 120],     // dalam Triliun
        trendLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
        detailTableData: [
          { item: 'Pajak', realisasi: '90 T', target: '100 T', percentage: '90%', growth: '8%' },
          { item: 'Bea Cukai', realisasi: '20 T', target: '22 T', percentage: '91%', growth: '12%' },
          { item: 'Belanja Pegawai', realisasi: '30 T', target: '32 T', percentage: '93%', growth: '5%' },
          { item: 'Belanja Modal', realisasi: '50 T', target: '60 T', percentage: '83%', growth: '15%' },
          // ... data lainnya
        ]
      };
      setFiskalData(dummyData);
    } catch (err) {
      console.error("Failed to fetch fiscal data:", err);
      setError("Gagal memuat data kinerja fiskal.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Panggil fetch data saat komponen dimuat atau filter berubah
  useEffect(() => {
    fetchFiskalData(appliedFilters);
  }, [appliedFilters, fetchFiskalData]); // Sertakan fetchFiskalData dalam dependency array karena useCallback

  // Kolom untuk tabel detail
  const tableColumns = [
    { Header: 'Item', accessor: 'item' },
    { Header: 'Realisasi', accessor: 'realisasi' },
    { Header: 'Target', accessor: 'target' },
    { Header: 'Persentase (%)', accessor: 'percentage' },
    { Header: 'Pertumbuhan (%)', accessor: 'growth' },
  ];

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Rangkuman Kinerja Fiskal</h2>
        <button className='flex-none btn btn-sm btn-ghost' onClick={handleOpenFilterModal}><Filter className='w-4 h-4 text-gray-600'/></button>
      </div>

      {/* Bagian Filter dan Info Tanggal */}
      <div className="flex text-xs items-center mb-4 text-gray-600">
        <CalendarDays className="w-5 h-5 mr-2" />
        <p>Cut off data: {appliedFilters.waktu_awal} s.d. {appliedFilters.waktu_akhir}</p>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <p className="text-lg text-gray-600">Memuat data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {fiskalData && !isLoading && (
        <>
          {/* Ringkasan Kinerja (Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <CardKinerja
              title="Total Pendapatan Konsolidasian"
              value={formatLargeNumber(fiskalData.totalPendapatan, 2)}
              unit="Rp"
              change={fiskalData.pendapatanYoYChange}
              changeType="positive"
              description="YoY"
              icon={ArrowUpRight}
            />
            <CardKinerja
              title="Total Belanja Konsolidasian"
              value={formatLargeNumber(fiskalData.totalBelanja, 2)}
              unit="Rp"
              change={fiskalData.belanjaYoYChange}
              changeType="negative"
              description="YoY"
              icon={ArrowDownRight}
            />
            <CardKinerja
              title="Surplus/Defisit Konsolidasian"
              value={formatLargeNumber(fiskalData.surplusDefisit, 2)}
              unit="Rp"
              change={null} // Tidak ada perubahan YoY untuk ini
              description="dari Target"
              icon={Info}
            />
          </div>

          {/* Grafik Tren Pendapatan & Belanja */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
            {/* Sales and Revenue Chart */}
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Pendapatan Negara</h2>
              asdsad
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Belanja Negara</h2>
              assadsad
            </div>
          </section>
        </>
      )}

      {/* Modal Filter */}
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