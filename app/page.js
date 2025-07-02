'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart
} from 'recharts'
import { Users, DollarSign, Activity, ShoppingCart, Menu, X, Home, BarChart2, Settings, LogOut, InfoIcon, Coins, ShoppingBag, Filter, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { supabase } from './lib/supabaseClient'
import { formatLargeNumber } from './lib/formatLargeNumber'
import ModalFilter from './components/ModalFilter'
import { calculateGrowth } from './lib/calculateGrowth'

const CardIndikatorKesra = ({ title, value, unit, growth, growthUnit, growthDescription, tooltipText }) => {
  const growthType = growth > 0 ? 'positive' : growth < 0 ? 'negative' : 'neutral';

  const GrowthIcon = () => {
    if (growthType === 'positive') return <ArrowUpRight className="w-5 h-5 mr-1 text-green-500" />;
    if (growthType === 'negative') return <ArrowDownRight className="w-5 h-5 mr-1 text-red-500" />;
    return <Minus className="w-5 h-5 mr-1 text-gray-500" />;
  };

  const growthColorClass = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-600',
  }[growthType];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200 relative">
      {tooltipText && (
        <div className="absolute top-2 right-2 text-gray-400 cursor-help" title={tooltipText}>
          <InfoIcon className="w-4 h-4" />
        </div>
      )}
      <p className="text-sm font-medium text-gray-500 mb-2">{title}</p>
      <div className="flex items-baseline mb-2">
        <p className="text-3xl font-semibold text-gray-900">{value}</p>
        {unit && <span className="ml-2 text-base text-gray-500">{unit}</span>}
      </div>
      <div className={`flex items-center text-sm font-medium ${growthColorClass}`}>
        <GrowthIcon />
        {growth !== null && growth !== undefined ? (
          <>
            <span>{Math.abs(growth).toFixed(2)}</span>
            {growthUnit && <span className="ml-0.5">{growthUnit}</span>}
            {growthDescription && <span className="ml-1 text-gray-500">{growthDescription}</span>}
          </>
        ) : (
          <span className="text-gray-500">Data pertumbuhan tidak tersedia</span>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [PDRBData, setPDRBData] = useState([])
  const [inflasiData, setInflasiData] = useState([])
  const [inflasiUniqueDaerah, setInflasiUniqueDaerah] = useState([])
  const [pendapatanNegara, setPendapatanNegara] = useState(0)
  const [belanjaNegara, setBelanjaNegara] = useState(0)
  const [pendapatanDaerah, setPendapatanDaerah] = useState(0)
  const [belanjaDaerah, setBelanjaDaerah] = useState(0)
  const [makroKesraData, setMakroKesraData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  const waktuSekarang = new Date()
  const [appliedFilters, setAppliedFilters] = useState({waktu_awal: `${waktuSekarang.getFullYear()}-01-01`, waktu_akhir: `${waktuSekarang.getFullYear()}-12-31`})

  const formatDateToQuarter = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      if (dateString.match(/^\d{4} Q[1-4]$/)) {
        return dateString
      }
      return null
    }
    const year = date.getFullYear()
    const month = date.getMonth()
    const quarter = Math.floor(month / 3) + 1
    return `${year} Q${quarter}`
  }

  const formatDateToMonth = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      const matchMonth = dateString.match(/^(\d{4})-(\d{1,2})$/)
      if (matchMonth) {
        const year = parseInt(matchMonth[1])
        const monthNum = parseInt(matchMonth[2])
        const formattedMonth = (monthNum + 1).toString().padStart(2, '0')
        return `${year}-${formattedMonth}`
      }
      return null
    }
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return `${year}-${month}`
  }

  const getLineColor = (index) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#f55d3e', '#00bcd4', '#9c27b0', '#a4d8c2', '#d8a4c2', '#c2d8a4', '#d8c2a4'
    ]
    return colors[index % colors.length]
  }

  const fetchPDRBData = async () => {
    setIsLoading(true)
    try {
      let { data, error } = await supabase.from('pdrb_sulteng_agg')
      .select('*')
      .gte('waktu', appliedFilters.waktu_awal)
      .lte('waktu', appliedFilters.waktu_akhir)
      .order('waktu', {ascending: true})

      if (error) {
        throw error
      }

      const transformedData = data.map(item => ({
        ...item,
        waktu: formatDateToQuarter(item.waktu)
      }))

      setPDRBData(transformedData)
      // console.log(transformedData)
    } catch (err) {
      console.warn(err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchInflasi = async () => {
    setIsLoading(true)
    try{
      let { data, error } = await supabase.from('inflasi')
      .select('*')
      .gte('waktu', appliedFilters.waktu_awal)
      .lte('waktu', appliedFilters.waktu_akhir)
      .order('waktu', {ascending: true})
      
      if(error) {
        throw error
      }

      const uniqueDaerah = new Set()
      data.forEach(item => uniqueDaerah.add(item.daerah))
      setInflasiUniqueDaerah(Array.from(uniqueDaerah))

      const groupedByWaktu = new Map()
      data.forEach(item => {
        const waktuBulanan = formatDateToMonth(item.waktu)
        if(!groupedByWaktu.has(waktuBulanan)) {
          groupedByWaktu.set(waktuBulanan, {})
        }
        groupedByWaktu.get(waktuBulanan)[item.daerah] = item.inflasi_tahunan
      })

      const transformedData = []
      const sortedMonthKeys = Array.from(groupedByWaktu.keys()).sort((a, b) => a.localeCompare(b))
      sortedMonthKeys.forEach(key => {
        const entry = { waktu: key }
        const daerahDataForWaktu = groupedByWaktu.get(key)

        Array.from(uniqueDaerah).forEach(daerah => {
          entry[daerah] = daerahDataForWaktu[daerah] !== undefined ? daerahDataForWaktu[daerah] : null;
        });
        transformedData.push(entry);
      })
      
      setInflasiData(transformedData)
    } catch (err) {
      console.warn(err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAPBN = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('fiskal_apbn_summary')
      .select('*')
      .gte('tgl_cutoff', appliedFilters.waktu_awal)
      .lte('tgl_cutoff', appliedFilters.waktu_akhir)
      .order('tgl_cutoff', {ascending: true})

      if (error) {
        throw error
      }

      const transformedData = data.map(item => ({
        ...item,
        waktu: formatDateToMonth(item.waktu)
      }))

      let pendapatan = transformedData.reduce((acc, item) => {
        return acc + item.pendapatan
      }, 0)
      setPendapatanNegara(formatLargeNumber(pendapatan))

      let belanja = transformedData.reduce((acc, item) => {
        return acc + item.belanja
      }, 0)
      setBelanjaNegara(formatLargeNumber(belanja))
      
    } catch (err) {
      console.warn(err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMakroKesra = useCallback(async () => {
    setIsLoading(true);
    try {
      // --- Data Dummy (GANTI DENGAN QUERY SUPABASE ASLI ANDA) ---
      // Anda perlu membuat tabel di Supabase untuk menyimpan data ini
      // Misalnya, tabel 'makro_kesra' dengan kolom:
      // id, waktu (date), tingkat_kemiskinan (float), tingkat_pengangguran (float),
      // tpk_hotel (float), ntp (float), ntn (float),
      // penumpang_laut (int), penumpang_udara (int)
      // Pastikan ada cukup data (setidaknya 2 titik waktu) untuk menghitung growth

      // Contoh pengambilan data dari Supabase (ini hanya template)
      // let { data, error } = await supabase.from('makro_kesra')
      //   .select('*')
      //   .gte('waktu', appliedFilters.waktu_awal)
      //   .lte('waktu', appliedFilters.waktu_akhir)
      //   .order('waktu', { ascending: true });

      // if (error) throw error;

      // Ambil data terbaru dan data sebelumnya
      // const latestKesraData = data[data.length - 1];
      // const previousKesraData = data[data.length - 2];

      // Data Dummy yang akan menggantikan hasil query Supabase Anda
      const dummyRawData = [
        // Data periode sebelumnya (misal, 2023)
        {
          waktu: '2023-12-31',
          tingkat_kemiskinan: 7.9, // persen
          tingkat_pengangguran: 4.5, // persen
          tpk_hotel: 55.0, // persen
          ntp: 105.0, // poin
          ntn: 102.5, // poin
          penumpang_laut: 150000, // jiwa
          penumpang_udara: 200000, // jiwa
        },
        // Data periode saat ini (misal, 2024 - yang akan ditampilkan)
        {
          waktu: '2024-12-31',
          tingkat_kemiskinan: 7.5, // persen
          tingkat_pengangguran: 4.2, // persen
          tpk_hotel: 60.0, // persen
          ntp: 107.0, // poin
          ntn: 104.0, // poin
          penumpang_laut: 165000, // jiwa
          penumpang_udara: 220000, // jiwa
        }
      ];

      const latestKesraData = dummyRawData[dummyRawData.length - 1];
      const previousKesraData = dummyRawData[dummyRawData.length - 2];

      if (!latestKesraData) {
        setMakroKesraData(null);
        return;
      }

      // Hitung growth untuk setiap indikator
      const processedData = {
        tingkatKemiskinan: {
          value: latestKesraData.tingkat_kemiskinan,
          growth: calculateGrowth(latestKesraData.tingkat_kemiskinan, previousKesraData?.tingkat_kemiskinan),
        },
        tingkatPengangguran: {
          value: latestKesraData.tingkat_pengangguran,
          growth: calculateGrowth(latestKesraData.tingkat_pengangguran, previousKesraData?.tingkat_pengangguran),
        },
        tpkHotel: {
          value: latestKesraData.tpk_hotel,
          growth: calculateGrowth(latestKesraData.tpk_hotel, previousKesraData?.tpk_hotel),
        },
        ntp: {
          value: latestKesraData.ntp,
          growth: calculateGrowth(latestKesraData.ntp, previousKesraData?.ntp),
        },
        ntn: {
          value: latestKesraData.ntn,
          growth: calculateGrowth(latestKesraData.ntn, previousKesraData?.ntn),
        },
        penumpangLaut: {
          value: latestKesraData.penumpang_laut,
          growth: calculateGrowth(latestKesraData.penumpang_laut, previousKesraData?.penumpang_laut),
        },
        penumpangUdara: {
          value: latestKesraData.penumpang_udara,
          growth: calculateGrowth(latestKesraData.penumpang_udara, previousKesraData?.penumpang_udara),
        },
      };
      setMakroKesraData(processedData);

    } catch (err) {
      console.warn("Error fetching Makro Kesra data:", err);
      setMakroKesraData(null);
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]); // Dependency array

  const filterFields = [
    { label: 'Waktu Awal', name: 'waktu_awal', type: 'input', inputType: 'date', placeholder: 'Pilih tanggal awal' },
    { label: 'Waktu Akhir', name: 'waktu_akhir', type: 'input', inputType: 'date', placeholder: 'Pilih tanggal akhir' },
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

  useEffect(() => {
    fetchPDRBData()
    fetchInflasi()
    fetchAPBN()
    fetchMakroKesra()
  }, [appliedFilters])

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Rangkuman Kinerja Fiskal</h2>
        <button className='flex-none btn btn-sm btn-ghost' onClick={handleOpenFilterModal}><Filter className='w-4 h-4 text-gray-600'/></button>
      </div>

      {/* Key Metrics Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Metric Card 1: Total Users */}
        <div className="border-l-4 border-primary bg-white p-6 rounded-lg shadow-md flex items-center justify-between transition-transform transform hover:scale-101">
          <div>
            <p className="text-sm font-medium text-gray-500">Pendapatan Negara</p>
            <p className="text-3xl font-semibold text-gray-900">{pendapatanNegara}</p>
          </div>
          <DollarSign className="w-10 h-10 text-yellow-500" />
        </div>

        {/* Metric Card 2: Total Revenue */}
        <div className="border-l-4 border-primary bg-white p-6 rounded-lg shadow-md flex items-center justify-between transition-transform transform hover:scale-101">
          <div>
            <p className="text-sm font-medium text-gray-500">Belanja Negara</p>
            <p className="text-3xl font-semibold text-gray-900">{belanjaNegara}</p>
          </div>
          <ShoppingCart className="w-10 h-10 text-info" />
        </div>

        {/* Metric Card 3: Sales Today */}
        <div className="border-l-4 border-secondary bg-white p-6 rounded-lg shadow-md flex items-center justify-between transition-transform transform hover:scale-101">
          <div>
            <p className="text-sm font-medium text-gray-500">Pendapatan Daerah</p>
            <p className="text-3xl font-semibold text-gray-900">{pendapatanDaerah}</p>
          </div>
          <Coins className="w-10 h-10 text-yellow-500" />
        </div>

        {/* Metric Card 4: Active Now */}
        <div className="border-l-4 border-secondary bg-white p-6 rounded-lg shadow-md flex items-center justify-between transition-transform transform hover:scale-101">
          <div>
            <p className="text-sm font-medium text-gray-500">Belanja Daerah</p>
            <p className="text-3xl font-semibold text-gray-900">{belanjaDaerah}</p>
          </div>
          <ShoppingBag className="w-10 h-10 text-info" />
        </div>
      </section>

      <h2 className='text-xl font-bold border-b border-gray-300 py-2 mb-4'><i>Overview</i> Ekonomi</h2>

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
        {/* Sales and Revenue Chart */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">PDRB Nominal</h2>
          {(PDRBData.length > 0) ? (
            <ResponsiveContainer className={`text-xs`} width="100%" height={300}>
              <ComposedChart data={PDRBData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="waktu" axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId='left'
                  dataKey="adhb"
                  axisLine={false}
                  tickLine={false}
                  label={{ 
                    value: 'Miliar', 
                    style: { textAnchor: 'middle' }, 
                    angle: -90, 
                    position: 'left', 
                    offset: 0
                  }}
                />
                <YAxis
                  yAxisId='right'
                  dataKey="laju_tahunan"
                  axisLine={false}
                  tickLine={false}
                  orientation='right'
                  label={{ 
                    value: 'Persen (%)', 
                    style: { textAnchor: 'middle' }, 
                    angle: -90, 
                    position: 'right', 
                    offset: 0
                  }}
                />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar yAxisId='left' dataKey="adhb" fill="#8884d8" name="PDRB" barSize={30}/>
                <Line yAxisId="right" name='Laju Tahunan' dataKey="laju_tahunan" stroke="#82ca9d" strokeWidth={4} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center skeleton h-[300px] w-full">
              <span className="loading loading-spinner text-secondary loading-lg"></span>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Inflasi</h2>
          {(inflasiData.length > 0) ? (
            <ResponsiveContainer width="100%" height={300} className={`text-xs`}>
              <LineChart data={inflasiData} >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="waktu" 
                  axisLine={false}
                  tickLine={false}
                  label={{ 
                    style: { textAnchor: 'middle' }, 
                    angle: -90,
                    offset: 0
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false} 
                  label={{ 
                    value: 'Persen (%)', 
                    style: { textAnchor: 'middle' }, 
                    angle: -90, 
                    position: 'left', 
                    offset: 0
                  }}
                />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                {inflasiUniqueDaerah.map((daerah, index) => (
                  <Line type="monotone" key={daerah} dataKey={daerah} stroke={getLineColor(index)} activeDot={{ r: 8 }} strokeWidth={3} name={`${daerah}`} />
                )
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center skeleton h-[300px] w-full">
              <span className="loading loading-spinner text-secondary loading-lg"></span>
            </div>
          )}
        </div>
      </section>

      <h2 className='text-xl font-bold border-b border-gray-300 py-2 mb-4'>Kondisi Makro-Kesra</h2>
      {/* di sini */}
      {isLoading && !makroKesraData ? (
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner text-primary loading-lg"></span>
        </div>
      ) : makroKesraData ? (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          <CardIndikatorKesra
            title="Tingkat Kemiskinan"
            value={makroKesraData.tingkatKemiskinan.value ? makroKesraData.tingkatKemiskinan.value.toFixed(2) : '-'}
            unit="%"
            growth={makroKesraData.tingkatKemiskinan.growth}
            growthUnit="%"
            growthDescription="YoY"
            tooltipText="Persentase penduduk miskin terhadap total penduduk."
          />
          <CardIndikatorKesra
            title="Tingkat Pengangguran Terbuka (TPT)"
            value={makroKesraData.tingkatPengangguran.value ? makroKesraData.tingkatPengangguran.value.toFixed(2) : '-'}
            unit="%"
            growth={makroKesraData.tingkatPengangguran.growth}
            growthUnit="%"
            growthDescription="YoY"
            tooltipText="Persentase angkatan kerja yang tidak memiliki pekerjaan."
          />
          <CardIndikatorKesra
            title="Tingkat Penghunian Kamar (TPK) Hotel"
            value={makroKesraData.tpkHotel.value ? makroKesraData.tpkHotel.value.toFixed(2) : '-'}
            unit="%"
            growth={makroKesraData.tpkHotel.growth}
            growthUnit="%"
            growthDescription="YoY"
            tooltipText="Persentase rata-rata kamar hotel yang dihuni dari total kamar tersedia."
          />
          <CardIndikatorKesra
            title="Nilai Tukar Petani (NTP)"
            value={makroKesraData.ntp.value ? makroKesraData.ntp.value.toFixed(2) : '-'}
            unit="poin"
            growth={makroKesraData.ntp.growth}
            growthUnit="%"
            growthDescription="YoY"
            tooltipText="Indikator daya beli petani di pedesaan."
          />
          <CardIndikatorKesra
            title="Nilai Tukar Nelayan (NTN)"
            value={makroKesraData.ntn.value ? makroKesraData.ntn.value.toFixed(2) : '-'}
            unit="poin"
            growth={makroKesraData.ntn.growth}
            growthUnit="%"
            growthDescription="YoY"
            tooltipText="Indikator daya beli nelayan di pedesaan."
          />
          <CardIndikatorKesra
            title="Penumpang Angkutan Laut"
            value={makroKesraData.penumpangLaut.value ? formatLargeNumber(makroKesraData.penumpangLaut.value) : '-'}
            unit="jiwa"
            growth={makroKesraData.penumpangLaut.growth}
            growthUnit="%"
            growthDescription="YoY"
            tooltipText="Jumlah penumpang yang menggunakan transportasi laut."
          />
          <CardIndikatorKesra
            title="Penumpang Angkutan Udara"
            value={makroKesraData.penumpangUdara.value ? formatLargeNumber(makroKesraData.penumpangUdara.value) : '-'}
            unit="jiwa"
            growth={makroKesraData.penumpangUdara.growth}
            growthUnit="%"
            growthDescription="YoY"
            tooltipText="Jumlah penumpang yang menggunakan transportasi udara."
          />
        </section>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
          Tidak ada data Makro-Kesra yang tersedia untuk periode ini.
        </div>
      )}

      <ModalFilter
        isOpen={isFilterModalOpen}
        onClose={handleCloseFilterModal}
        onApplyFilter={handleApplyFilter}
        filterFields={filterFields}
        initialFilterValues={appliedFilters}
      />

    </main>
  )
}
