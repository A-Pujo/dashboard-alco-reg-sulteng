'use client'

import React, { useState, useEffect, useCallback } from 'react'
import ModalFilter from '../components/ModalFilter' // Sesuaikan path jika berbeda
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Info, CalendarDays, Filter } from 'lucide-react'
import { formatLargeNumber } from '../lib/formatLargeNumber' // Assuming this utility is correctly implemented
import { supabase } from '@/app/lib/supabaseClient' // Import Supabase client

// Recharts Imports
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// --- Komponen Card untuk ringkasan kinerja ---
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
    {change !== null && change !== undefined && ( // Only show change if it's not null/undefined
      <div className={`flex items-center text-sm ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
        {changeType === 'positive' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        {typeof change === 'number' ? `${change.toFixed(2)}%` : change} {/* Format percentage */}
        <span className="ml-1 text-gray-500">{description}</span>
      </div>
    )}
  </div>
)

export default function DashboardKinerjaFiskal() {
  const now = new Date()
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState({
    waktu_awal: `${now.getFullYear()}-01-01`,
    waktu_akhir: `${now.getFullYear()}-12-31`,
  })
  const [fiskalData, setFiskalData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartData, setChartData] = useState([]) // New state for chart data

  // Konfigurasi dinamis untuk ModalFilter
  const filterFields = [
    { label: 'Waktu Awal', name: 'waktu_awal', type: 'input', inputType: 'date' },
    { label: 'Waktu Akhir', name: 'waktu_akhir', type: 'input', inputType: 'date' },
  ]

  const handleOpenFilterModal = useCallback(() => {
    setIsFilterModalOpen(true)
  }, [])

  const handleCloseFilterModal = useCallback(() => {
    setIsFilterModalOpen(false)
  }, [])

  const handleApplyFilter = useCallback((filters) => {
    setAppliedFilters(filters)
    handleCloseFilterModal() // Close modal after applying filters
  }, [handleCloseFilterModal])

  // Helper function to calculate sums for a given dataset
  const calculateSummary = useCallback((data) => {
    let totalPendapatan = 0
    let totalBelanja = 0
    let totalPembiayaan = 0 // Only for APBD
    let totalSILPA = 0      // Only for APBD

    data.forEach(item => {
      if (item.p_pajak !== undefined) { // Check if it's APBN data structure
        totalPendapatan += (item.p_pajak || 0) + (item.p_beacukai || 0) + (item.p_pnbp_lain || 0) + (item.p_blu || 0)
        totalBelanja += (item.b_pegawai || 0) + (item.b_barang || 0) + (item.b_modal || 0) + (item.b_bansos || 0) +
                        (item.b_dbh || 0) + (item.b_dakfisik || 0) + (item.b_daknonfisik || 0) + (item.b_dau || 0) +
                        (item.b_infis || 0) + (item.b_danadesa || 0)
      } else if (item.nama_pemda !== undefined) { // Check if it's APBD data structure
        totalPendapatan += (item.pendapatan || 0)
        totalBelanja += (item.belanja || 0)
        totalPembiayaan += (item.pembiayaan || 0)
        totalSILPA += (item.SILPA || 0)
      }
    })

    return { totalPendapatan, totalBelanja, totalPembiayaan, totalSILPA }
  }, [])

  // Helper to format large numbers for Y-axis ticks
  const formatCurrencyAxis = (tickItem) => {
    return formatLargeNumber(tickItem, 0) // Format without decimals for axis
  }

  // Function to prepare data for Recharts
  const prepareChartData = useCallback((apbnData, apbdData) => {
    const monthlyDataMap = new Map() // Key: YYYY-MM, Value: { monthLabel, apbnPendapatan, apbnBelanja, apbdPendapatan, apbdBelanja }

    // Process APBN data
    apbnData.forEach(item => {
      const date = new Date(item.tgl_cutoff)
      const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(date)

      if (!monthlyDataMap.has(yearMonth)) {
        monthlyDataMap.set(yearMonth, {
          name: monthLabel,
          APBN_Pendapatan: 0,
          APBN_Belanja: 0,
          APBD_Pendapatan: 0,
          APBD_Belanja: 0,
        })
      }
      const currentMonth = monthlyDataMap.get(yearMonth)
      currentMonth.APBN_Pendapatan += (item.p_pajak || 0) + (item.p_beacukai || 0) + (item.p_pnbp_lain || 0) + (item.p_blu || 0)
      currentMonth.APBN_Belanja += (item.b_pegawai || 0) + (item.b_barang || 0) + (item.b_modal || 0) + (item.b_bansos || 0) +
                                   (item.b_dbh || 0) + (item.b_dakfisik || 0) + (item.b_daknonfisik || 0) + (item.b_dau || 0) +
                                   (item.b_infis || 0) + (item.b_danadesa || 0)
    })

    // Process APBD data (assuming 'Provinsi Sulawesi Tengah' for simplicity, or sum all Pemda)
    // For now, let's sum all Pemda for APBD charts for a consolidated view of APBD
    apbdData.forEach(item => {
      const date = new Date(item.tgl_cutoff)
      const yearMonth = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(date)

      if (!monthlyDataMap.has(yearMonth)) {
        monthlyDataMap.set(yearMonth, {
          name: monthLabel,
          APBN_Pendapatan: 0,
          APBN_Belanja: 0,
          APBD_Pendapatan: 0,
          APBD_Belanja: 0,
        })
      }
      const currentMonth = monthlyDataMap.get(yearMonth)
      currentMonth.APBD_Pendapatan += (item.pendapatan || 0)
      currentMonth.APBD_Belanja += (item.belanja || 0)
    })

    // Sort data chronologically
    const sortedData = Array.from(monthlyDataMap.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([, value]) => value)

    return sortedData
  }, [])


  // Function to fetch and process fiscal data
  const fetchFiskalData = useCallback(async (filters) => {
    setIsLoading(true)
    setError(null)

    const { waktu_awal, waktu_akhir } = filters

    // Calculate previous year's period for YoY comparison
    const prevYearStart = new Date(waktu_awal)
    prevYearStart.setFullYear(prevYearStart.getFullYear() - 1)
    const prevWaktuAwal = prevYearStart.toISOString().split('T')[0]

    const prevYearEnd = new Date(waktu_akhir)
    prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1)
    const prevWaktuAkhir = prevYearEnd.toISOString().split('T')[0]

    try {
      // --- Fetch Current Period APBN Data ---
      const { data: apbnCurrentData, error: apbnError } = await supabase
        .from('fiskal_apbn')
        .select('*')
        .gte('tgl_cutoff', waktu_awal)
        .lte('tgl_cutoff', waktu_akhir)

      if (apbnError) throw apbnError

      // --- Fetch Previous Period APBN Data ---
      const { data: apbnPrevData, error: apbnPrevError } = await supabase
        .from('fiskal_apbn')
        .select('*')
        .gte('tgl_cutoff', prevWaktuAwal)
        .lte('tgl_cutoff', prevWaktuAkhir)

      if (apbnPrevError) throw apbnPrevError

      // --- Fetch Current Period APBD Data ---
      const { data: apbdCurrentData, error: apbdError } = await supabase
        .from('fiskal_pemda')
        .select('*')
        .gte('tgl_cutoff', waktu_awal)
        .lte('tgl_cutoff', waktu_akhir)

      if (apbdError) throw apbdError

      // --- Fetch Previous Period APBD Data ---
      const { data: apbdPrevData, error: apbdPrevError } = await supabase
        .from('fiskal_pemda')
        .select('*')
        .gte('tgl_cutoff', prevWaktuAwal)
        .lte('tgl_cutoff', prevWaktuAkhir)

      if (apbdPrevError) throw apbdPrevError

      // --- Calculate Summaries ---
      const apbnCurrentSummary = calculateSummary(apbnCurrentData)
      const apbnPrevSummary = calculateSummary(apbnPrevData)

      const apbdCurrentSummary = calculateSummary(apbdCurrentData)
      const apbdPrevSummary = calculateSummary(apbdPrevData)

      // --- Calculate YoY Changes ---
      const calculateYoYChange = (current, previous) => {
        if (previous === 0 || previous === null || previous === undefined) return null
        return ((current / previous - 1) * 100) // Return raw percentage for formatting in Card
      }

      const apbnPendapatanYoY = calculateYoYChange(apbnCurrentSummary.totalPendapatan, apbnPrevSummary.totalPendapatan)
      const apbnBelanjaYoY = calculateYoYChange(apbnCurrentSummary.totalBelanja, apbnPrevSummary.totalBelanja)

      const apbdPendapatanYoY = calculateYoYChange(apbdCurrentSummary.totalPendapatan, apbdPrevSummary.totalPendapatan)
      const apbdBelanjaYoY = calculateYoYChange(apbdCurrentSummary.totalBelanja, apbdPrevSummary.totalBelanja)
      const apbdPembiayaanYoY = calculateYoYChange(apbdCurrentSummary.totalPembiayaan, apbdPrevSummary.totalPembiayaan)
      const apbdSILPAYoY = calculateYoYChange(apbdCurrentSummary.totalSILPA, apbdPrevSummary.totalSILPA)


      // --- Consolidate all data for state ---
      setFiskalData({
        // APBN Summary
        apbn: {
          totalPendapatan: apbnCurrentSummary.totalPendapatan,
          totalBelanja: apbnCurrentSummary.totalBelanja,
          surplusDefisit: apbnCurrentSummary.totalPendapatan - apbnCurrentSummary.totalBelanja,
          pendapatanYoYChange: apbnPendapatanYoY,
          belanjaYoYChange: apbnBelanjaYoY,
        },
        // APBD Summary
        apbd: {
          totalPendapatan: apbdCurrentSummary.totalPendapatan,
          totalBelanja: apbdCurrentSummary.totalBelanja,
          totalPembiayaan: apbdCurrentSummary.totalPembiayaan,
          totalSILPA: apbdCurrentSummary.totalSILPA,
          surplusDefisit: apbdCurrentSummary.totalPendapatan - apbdCurrentSummary.totalBelanja + apbdCurrentSummary.totalPembiayaan, // Simplified calculation for APBD surplus/deficit
          pendapatanYoYChange: apbdPendapatanYoY,
          belanjaYoYChange: apbdBelanjaYoY,
          pembiayaanYoYChange: apbdPembiayaanYoY,
          SILPAYoYChange: apbdSILPAYoY,
        },
        // Consolidated/Combined Summary (if needed, example below)
        totalKonsolidasi: {
          totalPendapatan: apbnCurrentSummary.totalPendapatan + apbdCurrentSummary.totalPendapatan,
          totalBelanja: apbnCurrentSummary.totalBelanja + apbdCurrentSummary.totalBelanja,
          surplusDefisit: (apbnCurrentSummary.totalPendapatan - apbnCurrentSummary.totalBelanja) +
                          (apbdCurrentSummary.totalPendapatan - apbdCurrentSummary.totalBelanja + apbdCurrentSummary.totalPembiayaan),
          // You would need to calculate consolidated YoY if desired
        }
      })

      // Prepare data for charts
      const preparedChartData = prepareChartData(apbnCurrentData, apbdCurrentData)
      setChartData(preparedChartData)

    } catch (err) {
      console.error('Error fetching fiscal data:', err)
      setError('Gagal memuat data kinerja fiskal. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }, [calculateSummary, prepareChartData]) // Added prepareChartData to dependencies

  // Panggil fetch data saat komponen dimuat atau filter berubah
  useEffect(() => {
    fetchFiskalData(appliedFilters)
  }, [appliedFilters, fetchFiskalData])

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
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-lg text-gray-600 mt-2">Memuat data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
          <button className="btn btn-sm btn-error mt-2" onClick={() => fetchFiskalData(appliedFilters)}>Coba Lagi</button>
        </div>
      )}

      {fiskalData && !isLoading && !error && (
        <>
          {/* Ringkasan Kinerja APBN */}
          <h3 className="text-lg font-bold mb-4">Kinerja APBN</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <CardKinerja
              title="Pendapatan APBN"
              value={formatLargeNumber(fiskalData.apbn.totalPendapatan, 2)}
              unit=""
              change={fiskalData.apbn.pendapatanYoYChange}
              changeType={fiskalData.apbn.pendapatanYoYChange >= 0 ? 'positive' : 'negative'}
              description="YoY"
              icon={ArrowUpRight}
            />
            <CardKinerja
              title="Belanja APBN"
              value={formatLargeNumber(fiskalData.apbn.totalBelanja, 2)}
              unit=""
              change={fiskalData.apbn.belanjaYoYChange}
              changeType={fiskalData.apbn.belanjaYoYChange >= 0 ? 'positive' : 'negative'}
              description="YoY"
              icon={ArrowDownRight}
            />
            <CardKinerja
              title="Surplus/Defisit APBN"
              value={formatLargeNumber(fiskalData.apbn.surplusDefisit, 2)}
              unit=""
              change={null}
              description=""
              icon={Info}
            />
          </div>

          {/* Ringkasan Kinerja APBD */}
          <h3 className="text-lg font-bold mb-4">Kinerja APBD</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <CardKinerja
              title="Pendapatan APBD"
              value={formatLargeNumber(fiskalData.apbd.totalPendapatan, 2)}
              unit=""
              change={fiskalData.apbd.pendapatanYoYChange}
              changeType={fiskalData.apbd.pendapatanYoYChange >= 0 ? 'positive' : 'negative'}
              description="YoY"
              icon={ArrowUpRight}
            />
            <CardKinerja
              title="Belanja APBD"
              value={formatLargeNumber(fiskalData.apbd.totalBelanja, 2)}
              unit=""
              change={fiskalData.apbd.belanjaYoYChange}
              changeType={fiskalData.apbd.belanjaYoYChange >= 0 ? 'positive' : 'negative'}
              description="YoY"
              icon={ArrowDownRight}
            />
            <CardKinerja
              title="Pembiayaan APBD"
              value={formatLargeNumber(fiskalData.apbd.totalPembiayaan, 2)}
              unit=""
              change={fiskalData.apbd.pembiayaanYoYChange}
              changeType={fiskalData.apbd.pembiayaanYoYChange >= 0 ? 'positive' : 'negative'}
              description="YoY"
              icon={Info}
            />
          </div>

          {/* Grafik Tren Pendapatan - BAR CHART */}
          <section className="bg-white p-4 rounded-lg shadow-md mb-6">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Tren Pendapatan (APBN & APBD)</h2>
            <ResponsiveContainer width="100%" height={400} className={`text-xs`}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} /> {/* Smaller font for X-axis ticks */}
                <YAxis tickFormatter={formatCurrencyAxis} tick={{ fontSize: 10 }} /> {/* Smaller font for Y-axis ticks */}
                <Tooltip formatter={(value) => 'Rp' + formatLargeNumber(value, 2)} />
                <Legend wrapperStyle={{ fontSize: '12px' }} /> {/* Smaller font for legend */}
                <Bar dataKey="APBN_Pendapatan" fill="#8884d8" name="APBN Pendapatan" />
                <Bar dataKey="APBD_Pendapatan" fill="#82ca9d" name="APBD Pendapatan" />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* Grafik Tren Belanja - BAR CHART */}
          <section className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Tren Belanja (APBN & APBD)</h2>
            <ResponsiveContainer width="100%" height={400} className={`text-xs`}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} /> {/* Smaller font for X-axis ticks */}
                <YAxis tickFormatter={formatCurrencyAxis} tick={{ fontSize: 10 }} /> {/* Smaller font for Y-axis ticks */}
                <Tooltip formatter={(value) => 'Rp' + formatLargeNumber(value, 2)} />
                <Legend wrapperStyle={{ fontSize: '12px' }} /> {/* Smaller font for legend */}
                <Bar dataKey="APBN_Belanja" fill="#ffc658" name="APBN Belanja" />
                <Bar dataKey="APBD_Belanja" fill="#ff7300" name="APBD Belanja" />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </>
      )}

      {/* Modal Filter */}
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