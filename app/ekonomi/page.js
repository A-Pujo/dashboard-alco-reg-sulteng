'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import { InfoIcon, CalendarDays, Filter, Plus } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import ModalFilter from '../components/ModalFilter'
import { formatLargeNumber } from '../lib/formatLargeNumber'
import { calculateGrowth } from '../lib/calculateGrowth'

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'

ModuleRegistry.registerModules([AllCommunityModule])

export default function EkonomiDashboard() {
  const pdrbGridRef = useRef() // Ref for PDRB AG Grid instance

  const [PDRBData, setPDRBData] = useState([])
  const [inflasiData, setInflasiData] = useState([])
  const [inflasiUniqueDaerah, setInflasiUniqueDaerah] = useState([])
  const [makroKesraDataForCharts, setMakroKesraDataForCharts] = useState([]) // Transformed for charts
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  // Initial filter range (e.g., current year)
  const waktuSekarang = new Date()
  const [appliedFilters, setAppliedFilters] = useState({
    waktu_awal: `${waktuSekarang.getFullYear()}-01-01`,
    waktu_akhir: `${waktuSekarang.getFullYear()}-12-31`,
  })

  // Mapping for Makro Kesra indicator display names and units
  const makroKesraIndicatorMeta = useMemo(() => ({
    'tingkat_kemiskinan': { title: "Tingkat Kemiskinan", unit: "%", tooltip: "Persentase penduduk miskin terhadap total penduduk." },
    'tingkat_pengangguran': { title: "Tingkat Pengangguran Terbuka (TPT)", unit: "%", tooltip: "Persentase angkatan kerja yang tidak memiliki pekerjaan." },
    'tpk_hotel': { title: "Tingkat Penghunian Kamar (TPK) Hotel", unit: "%", tooltip: "Persentase rata-rata kamar hotel yang dihuni dari total kamar tersedia." },
    'ntp': { title: "Nilai Tukar Petani (NTP)", unit: "poin", tooltip: "Indikator daya beli petani di pedesaan." },
    'ntn': { title: "Nilai Tukar Nelayan (NTN)", unit: "poin", tooltip: "Indikator daya beli nelayan di pedesaan." },
    'penumpang_laut': { title: "Penumpang Angkutan Laut", unit: "jiwa", tooltip: "Jumlah penumpang yang menggunakan transportasi laut." },
    'penumpang_udara': { title: "Penumpang Angkutan Udara", unit: "jiwa", tooltip: "Jumlah penumpang yang menggunakan transportasi udara." },
  }), [])

  // --- Helper Functions for Data Formatting ---
  const formatDateToQuarter = useCallback((dateString) => {
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
  }, [])

  const formatDateToMonth = useCallback((dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      const matchMonth = dateString.match(/^(\d{4})-(\d{1,2})$/)
      if (matchMonth) {
        const year = parseInt(matchMonth[1])
        const monthNum = parseInt(matchMonth[2])
        const formattedMonth = monthNum.toString().padStart(2, '0')
        return `${year}-${formattedMonth}`
      }
      return null
    }
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return `${year}-${month}`
  }, [])

  const getLineColor = useCallback((index) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#f55d3e', '#00bcd4', '#9c27b0', '#a4d8c2', '#d8a4c2', '#c2d8a4', '#d8c2a4'
    ]
    return colors[index % colors.length]
  }, [])

  const formatCurrencyAxis = useCallback((tickItem) => {
    return formatLargeNumber(tickItem, 0) // Format without decimals for axis
  }, [])

  // --- Modal Filter Handlers ---
  const filterFields = useMemo(() => [
    { label: 'Waktu Awal', name: 'waktu_awal', type: 'input', inputType: 'date', placeholder: 'Pilih tanggal awal' },
    { label: 'Waktu Akhir', name: 'waktu_akhir', type: 'input', inputType: 'date', placeholder: 'Pilih tanggal akhir' },
  ], [])

  const handleOpenFilterModal = useCallback(() => {
    setIsFilterModalOpen(true)
  }, [])

  const handleCloseFilterModal = useCallback(() => {
    setIsFilterModalOpen(false)
  }, [])

  const handleApplyFilter = useCallback((filters) => {
    setAppliedFilters(filters)
    handleCloseFilterModal()
  }, [handleCloseFilterModal])

  // --- Data Fetching Functions ---

  const fetchPDRBData = useCallback(async () => {
    try {
      let { data, error } = await supabase.from('pdrb_sulteng_agg')
        .select('daerah, waktu, adhb, adhk, laju_tahunan, laju_kuartal')
        .gte('waktu', appliedFilters.waktu_awal)
        .lte('waktu', appliedFilters.waktu_akhir)
        .order('waktu', { ascending: true })

      if (error) {
        throw error
      }

      const transformedData = data.map(item => ({
        ...item,
        // Ensure waktu is formatted consistently for display in table
        waktu: formatDateToQuarter(item.waktu) || item.waktu,
        adhb: item.adhb, // Keep as number for sorting/filtering
        adhk: item.adhk, // Keep as number for sorting/filtering
      }))

      setPDRBData(transformedData)
    } catch (err) {
      console.warn("Error fetching PDRB data:", err)
      setError('Gagal memuat data PDRB.')
      setPDRBData([])
    }
  }, [appliedFilters, formatDateToQuarter])

  const fetchInflasi = useCallback(async () => {
    try {
      let { data, error } = await supabase.from('inflasi')
        .select('daerah, waktu, inflasi_bulanan, inflasi_tahunan')
        .gte('waktu', appliedFilters.waktu_awal)
        .lte('waktu', appliedFilters.waktu_akhir)
        .order('waktu', { ascending: true })

      if (error) {
        throw error
      }

      const uniqueDaerah = new Set()
      data.forEach(item => uniqueDaerah.add(item.daerah))
      setInflasiUniqueDaerah(Array.from(uniqueDaerah))

      const groupedByWaktu = new Map()
      data.forEach(item => {
        const waktuBulanan = formatDateToMonth(item.waktu)
        if (!groupedByWaktu.has(waktuBulanan)) {
          groupedByWaktu.set(waktuBulanan, {})
        }
        groupedByWaktu.get(waktuBulanan)[item.daerah] = item.inflasi_tahunan // Using annual inflation for chart
      })

      const transformedData = []
      const sortedMonthKeys = Array.from(groupedByWaktu.keys()).sort((a, b) => a.localeCompare(b))
      sortedMonthKeys.forEach(key => {
        const entry = { waktu: key }
        const daerahDataForWaktu = groupedByWaktu.get(key)

        Array.from(uniqueDaerah).forEach(daerah => {
          entry[daerah] = daerahDataForWaktu[daerah] !== undefined ? daerahDataForWaktu[daerah] : null
        })
        transformedData.push(entry)
      })

      setInflasiData(transformedData)
    } catch (err) {
      console.warn("Error fetching Inflasi data:", err)
      setError('Gagal memuat data Inflasi.')
      setInflasiData([])
    }
  }, [appliedFilters, formatDateToMonth])

  const fetchMakroKesra = useCallback(async () => {
    try {
      let { data, error } = await supabase
        .from('makro_kesra_indicators')
        .select('waktu, indikator, value, unit')
        .gte('waktu', appliedFilters.waktu_awal)
        .lte('waktu', appliedFilters.waktu_akhir)
        .order('waktu', { ascending: true })

      if (error) {
        throw error
      }

      // Group data by indicator for individual charts
      const groupedByIndicator = new Map()
      data.forEach(item => {
        if (!groupedByIndicator.has(item.indikator)) {
          groupedByIndicator.set(item.indikator, [])
        }
        groupedByIndicator.get(item.indikator).push({
          waktu: formatDateToMonth(item.waktu) || item.waktu, // Prioritize quarter, then month, then raw
          value: item.value,
          unit: item.unit
        })
      })

      const chartsData = []
      for (const [indikatorName, values] of groupedByIndicator.entries()) {
        const meta = makroKesraIndicatorMeta[indikatorName] || { title: indikatorName, unit: '', tooltip: '' }
        chartsData.push({
          indikator: indikatorName,
          title: meta.title,
          unit: meta.unit,
          tooltip: meta.tooltip,
          data: values.sort((a, b) => new Date(a.waktu).getTime() - new Date(b.waktu).getTime()),
        })
      }
      setMakroKesraDataForCharts(chartsData)

    } catch (err) {
      console.warn("Error fetching Makro Kesra data:", err)
      setError('Gagal memuat data Makro-Kesra.')
      setMakroKesraDataForCharts([])
    }
  }, [appliedFilters, formatDateToQuarter, formatDateToMonth, makroKesraIndicatorMeta])

  // --- Overall Data Fetching Effect ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        await Promise.all([
          fetchPDRBData(),
          fetchInflasi(),
          fetchMakroKesra()
        ])
      } catch (err) {
        console.error("An unexpected error occurred during data fetching:", err)
        setError("Terjadi kesalahan saat memuat semua data. Silakan coba lagi.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [appliedFilters, fetchPDRBData, fetchInflasi, fetchMakroKesra])

  // --- AG Grid Column Definitions for PDRB ---
  const pdrbColumnDefs = useMemo(() => [
    {
      headerName: 'Daerah', // Added Daerah column
      field: 'daerah',
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 150,
    },
    {
      headerName: 'Waktu',
      field: 'waktu',
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 120,
    },
    {
      headerName: 'PDRB ADHB (Miliar Rp)',
      field: 'adhb',
      valueFormatter: params => params.value ? params.value : '-',
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1,
      minWidth: 180,
    },
    {
      headerName: 'PDRB ADHK (Miliar Rp)',
      field: 'adhk',
      valueFormatter: params => params.value ? params.value : '-',
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1,
      minWidth: 180,
    },
    {
      headerName: 'Laju Tahunan (%)',
      field: 'laju_tahunan',
      valueFormatter: params => params.value !== null ? `${params.value.toFixed(2)}%` : '-',
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      minWidth: 150,
    },
    {
      headerName: 'Laju Kuartalan (%)',
      field: 'laju_kuartal',
      valueFormatter: params => params.value !== null ? `${params.value.toFixed(2)}%` : '-',
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      minWidth: 150,
    },
  ], [])

  const pdrbDefaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true, // Enable quick filter input for each column
  }), [])

  const pdrbGridOptions = useMemo(() => ({
    pagination: true,
    paginationPageSize: 20,
  }), [])


  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <div className='flex border-b border-gray-300 py-2 mb-4 items-center'>
        <h2 className='flex-1 text-xl font-bold'>Kondisi Ekonomi Sulawesi Tengah</h2>
        <button className='flex-none btn btn-sm btn-ghost' onClick={handleOpenFilterModal}><Filter className='w-4 h-4 text-gray-600'/> Filter Data</button>
      </div>

      {/* Bagian Filter dan Info Tanggal */}
      <div className="flex text-sm items-center mb-4 text-gray-600">
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
          <button className="btn btn-sm btn-error mt-2" onClick={() => {
            fetchPDRBData()
            fetchInflasi()
            fetchMakroKesra()
          }}>Coba Lagi</button>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* PDRB Section (AG Grid Table) */}
          <h2 className='text-md font-bold border-b border-gray-300 py-2 mb-4'>Data Produk Domestik Regional Bruto (PDRB) Sulawesi Tengah</h2>
          <section className="rounded-lg shadow-md mb-6">
            {(PDRBData.length > 0) ? (
              <div className="text-xs ag-theme-quartz" style={{ height: 400, width: '100%' }}>
                <AgGridReact
                  ref={pdrbGridRef}
                  rowData={PDRBData}
                  columnDefs={pdrbColumnDefs}
                  defaultColDef={pdrbDefaultColDef}
                  gridOptions={pdrbGridOptions}
                  onGridReady={(params) => {
                    params.api.sizeColumnsToFit()
                  }}
                />
              </div>
            ) : (
              <div className="flex justify-center items-center skeleton h-[200px] w-full">
                <span className="loading loading-spinner text-secondary loading-lg"></span>
                <p className='ml-2 text-gray-500'>Tidak ada data PDRB untuk periode ini.</p>
              </div>
            )}
          </section>

          <h2 className='text-md font-bold border-b border-gray-300 py-2 mb-4'>Tren Inflasi (%)</h2>
          <section className="bg-white p-4 rounded-lg shadow-md mb-6">
            {(inflasiData.length > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={inflasiData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="waktu" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                    tick={{ fontSize: 10 }}
                    label={{
                      value: 'Persen (%)',
                      style: { textAnchor: 'middle', fontSize: 12 },
                      angle: -90,
                      position: 'left',
                      offset: 0
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value) => `${value.toFixed(2)}%`}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: 12 }} />
                  {inflasiUniqueDaerah.map((daerah, index) => (
                    <Line
                      type="monotone"
                      key={daerah}
                      dataKey={daerah}
                      stroke={getLineColor(index)}
                      activeDot={{ r: 8 }}
                      strokeWidth={3}
                      name={`${daerah}`}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center skeleton h-[200px] w-full">
                <span className="loading loading-spinner text-secondary loading-lg"></span>
                <p className='ml-2 text-gray-500'>Tidak ada data Inflasi untuk periode ini.</p>
              </div>
            )}
          </section>

          {/* Makro-Kesra Indicators Section (Individual Line Charts) */}
          <h2 className='text-md font-bold border-b border-gray-300 py-2 mb-4'>Tren Indikator Makro-Kesra</h2>
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {makroKesraDataForCharts.length > 0 ? (
              makroKesraDataForCharts.map((indicatorChart, index) => (
                <div key={indicatorChart.indikator} className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-sm font-bold mb-2 flex items-center">
                    <InfoIcon className="w-5 h-5 mr-2 text-blue-500" title={indicatorChart.tooltip} />
                    {indicatorChart.title}
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={indicatorChart.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="waktu" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => {
                          if (indicatorChart.unit === '%' || indicatorChart.unit === 'poin') {
                            return value.toFixed(1)
                          }
                          return formatLargeNumber(value)
                        }}
                        tick={{ fontSize: 10 }}
                        label={{
                          value: indicatorChart.unit,
                          style: { textAnchor: 'middle', fontSize: 12 },
                          angle: -90,
                          position: 'left',
                          offset: 0
                        }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value) => {
                          if (indicatorChart.unit === '%' || indicatorChart.unit === 'poin') {
                            return `${value.toFixed(2)}${indicatorChart.unit}`
                          }
                          return `${formatLargeNumber(value, 2)} ${indicatorChart.unit}`
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={getLineColor(index)}
                        activeDot={{ r: 6 }}
                        strokeWidth={2}
                        name={indicatorChart.title}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))
            ) : (
              <div className="flex justify-center items-center skeleton h-[200px] w-full col-span-full">
                <span className="loading loading-spinner text-secondary loading-lg"></span>
                <p className='ml-2 text-gray-500'>Tidak ada data Makro-Kesra untuk periode ini.</p>
              </div>
            )}
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