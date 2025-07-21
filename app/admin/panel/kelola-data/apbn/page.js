// /admin/panel/kelola-data/apbn/page.js
'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { LogOut, Plus, Trash2, Download } from 'lucide-react' // Removed Edit as it's not applicable to summary rows
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { formatLargeNumber } from '@/app/lib/formatLargeNumber' // Assuming this utility is available

ModuleRegistry.registerModules([AllCommunityModule])

export default function AdminPanelKelolaAPBN() {
  const gridRef = useRef() // Ref for the AG Grid instance
  const [loginInfo, setLoginInfo] = useState(null)
  const [apbnSummaryData, setApbnSummaryData] = useState([]) // Renamed state to reflect summary data
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const logInf = JSON.parse(sessionStorage.getItem('loginInfo'))
    if (!logInf) {
      redirect('/admin', RedirectType.replace)
    } else {
      setLoginInfo(logInf)
    }
  }, [])

  const fetchAndAggregateAPBN = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch all relevant data from the normalized table
      const { data, error } = await supabase
        .from('fiskal_apbn')
        .select('thang, bulan, tgl_cutoff, komp_ang, pagu_target, realisasi')
        .order('tgl_cutoff', { ascending: false }) // Order by date for consistent aggregation

      if (error) {
        throw error
      }

      // --- Client-side Aggregation Logic ---
      const summaryMap = new Map() // Key: tgl_cutoff (or `${thang}-${bulan}`)

      data.forEach(item => {
        const key = item.tgl_cutoff; // Use tgl_cutoff as the primary aggregation key

        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            tgl_cutoff: item.tgl_cutoff,
            thang: item.thang,
            bulan: item.bulan,
            total_pendapatan_realisasi: 0,
            total_pendapatan_pagu: 0,
            total_belanja_realisasi: 0,
            total_belanja_pagu: 0,
          });
        }

        const currentSummary = summaryMap.get(key);

        // Check komp_ang prefix to categorize as pendapatan or belanja
        if (item.komp_ang.startsWith('p_')) { // Assuming 'p_' prefix for Pendapatan components
          currentSummary.total_pendapatan_realisasi += item.realisasi || 0;
          currentSummary.total_pendapatan_pagu += item.pagu_target || 0;
        } else if (item.komp_ang.startsWith('b_')) { // Assuming 'b_' prefix for Belanja components
          currentSummary.total_belanja_realisasi += item.realisasi || 0;
          currentSummary.total_belanja_pagu += item.pagu_target || 0;
        }
        // Add more categories if needed (e.g., pembiayaan)
      });

      // Convert map values to an array and sort again if necessary (map iteration order is insertion order)
      const aggregatedArray = Array.from(summaryMap.values()).sort((a, b) => {
        // Sort by year descending, then month descending
        if (b.thang !== a.thang) return b.thang - a.thang;
        return b.bulan - a.bulan;
      });

      setApbnSummaryData(aggregatedArray)
    } catch (err) {
      console.error('Error fetching or aggregating APBN data:', err)
      setError('Gagal memuat atau mengagregasi data APBN. Silakan coba lagi.')
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Kesalahan Data' description={err.message || 'Gagal memuat data APBN.'} />
      ))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (loginInfo) {
      fetchAndAggregateAPBN()
    }
  }, [loginInfo, fetchAndAggregateAPBN])

  const logout = useCallback(() => {
    sessionStorage.removeItem('loginInfo')
    toast.custom((t) => (
      <ToastTemplate t={t} type='success' title='Logout Berhasil!' description='Anda telah keluar dari panel admin.' />
    ), { duration: 2000 })
    setTimeout(() => {
      redirect('/admin', RedirectType.replace)
    }, 500)
  }, [])

  // Helper to format large numbers to Rupiah
  const formatRupiah = (number) => {
    if (number === null || number === undefined) return '-'
    const num = typeof number === 'string' ? parseFloat(number) : number
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  // Helper to format tgl_cutoff to a readable month/year
  const formatMonthYear = (isoDateString) => {
    if (!isoDateString) return '-'
    const date = new Date(isoDateString)
    return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long' }).format(date)
  }

  // --- DELETE ROW LOGIC ---
  // This will delete all records for a specific tgl_cutoff
  const handleDeleteRow = useCallback(async (rowData) => {
    const isConfirmed = confirm(
      `Apakah Anda yakin ingin menghapus semua data APBN untuk tanggal ${formatMonthYear(rowData.tgl_cutoff)}? Tindakan ini akan menghapus semua komponen anggaran untuk periode ini dan tidak bisa dibatalkan.`
    );

    if (isConfirmed) {
      try {
        const { error } = await supabase
          .from('fiskal_apbn')
          .delete()
          .eq('tgl_cutoff', rowData.tgl_cutoff); // Delete all records matching the tgl_cutoff

        if (error) {
          throw error;
        }

        toast.custom((t) => (
          <ToastTemplate t={t} type="success" title='Data APBN berhasil dihapus!' description={`Semua data untuk ${formatMonthYear(rowData.tgl_cutoff)} telah dihapus.`} />
        ));

        // Re-fetch data to update the grid after deletion
        fetchAndAggregateAPBN();

      } catch (error) {
        toast.custom((t) => (
          <ToastTemplate t={t} type='error' title='Gagal menghapus data APBN' description={error.message || 'Terjadi kesalahan tidak diketahui'} />
        ));
        console.error('Error deleting APBN row:', error);
      }
    }
  }, [fetchAndAggregateAPBN, formatMonthYear]);

  // Define column definitions for AG Grid
  const columnDefs = useMemo(() => [
    {
      headerName: 'Tgl Cutoff',
      field: 'tgl_cutoff',
      valueFormatter: params => formatMonthYear(params.value),
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1.2,
      minWidth: 150,
    },
    {
      headerName: 'Total Pendapatan (Realisasi)',
      field: 'total_pendapatan_realisasi',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      cellStyle: { fontWeight: 'bold' },
      flex: 2,
      minWidth: 200,
    },
    {
      headerName: 'Total Pendapatan (Target)',
      field: 'total_pendapatan_pagu',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      cellStyle: { fontWeight: 'bold', color: '#4CAF50' }, // Green for target
      flex: 2,
      minWidth: 200,
    },
    {
      headerName: 'Total Belanja (Realisasi)',
      field: 'total_belanja_realisasi',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      cellStyle: { fontWeight: 'bold' },
      flex: 2,
      minWidth: 200,
    },
    {
      headerName: 'Total Belanja (Target)',
      field: 'total_belanja_pagu',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      cellStyle: { fontWeight: 'bold', color: '#FFC107' }, // Amber for target
      flex: 2,
      minWidth: 200,
    },
    {
      headerName: 'Aksi',
      width: 90,
      cellRenderer: (params) => (
        <div className="flex items-center justify-center space-x-2 h-full">
          <button
            className="btn btn-sm btn-error text-white"
            onClick={() => handleDeleteRow(params.data)}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
      cellClass: 'grid-action-buttons-cell',
    },
  ], [formatRupiah, formatMonthYear, handleDeleteRow])

  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
  }), [])

  const gridOptions = useMemo(() => ({
    pagination: true,
    paginationPageSize: 20,
    // domLayout: 'autoHeight',
  }), [])

  if (loginInfo === null) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-screen bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12 mb-4">
      <Toaster position="bottom-right" reverseOrder={false} />
      <div className="breadcrumbs text-sm">
        <ul>
          <li><Link href="/admin/panel">Beranda</Link></li>
          <li><Link href="/admin/panel/kelola-data">Pengelolaan Data</Link></li>
          <li><Link href="/admin/panel/kelola-data/apbn">APBN</Link></li>
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4 items-center'>
        <h2 className='flex-1 text-xl font-bold'>Kelola Data APBN (Ringkasan Bulanan)</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      <div className='mb-6 flex justify-end'>
        <Link href="/assets/template-data/template-upload-apbn.xlsx" download className="btn btn-outline btn-info btn-sm rounded-full mr-1">
          <Download className='w-4 h-4' /> Download Template
        </Link>
        <Link href="/admin/panel/kelola-data/apbn/tambah" className="btn btn-primary btn-sm rounded-full">
          <Plus className='w-4 h-4' /> Tambah Data
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="ml-2">Memuat dan mengagregasi data...</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
          <button className="btn btn-sm" onClick={fetchAndAggregateAPBN}>Coba Lagi</button>
        </div>
      )}

      {!isLoading && !error && apbnSummaryData.length === 0 && (
        <div className="alert alert-info">
          <span>Tidak ada data APBN tersedia.</span>
        </div>
      )}

      {!isLoading && !error && apbnSummaryData.length > 0 && (
        <div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}> {/* Adjusted height for better visibility */}
          <AgGridReact
            ref={gridRef}
            rowData={apbnSummaryData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            gridOptions={gridOptions}
            onGridReady={(params) => {
              params.api.sizeColumnsToFit()
            }}
          />
        </div>
      )}

      <div className="collapse bg-white bg-base-100 border border-base-300 mt-4">
        <input type="radio" name="my-accordion-1" defaultChecked />
        <div className="collapse-title font-semibold">Informasi Data APBN</div>
        <div className="collapse-content text-sm">
          Data APBN ini disajikan sebagai ringkasan bulanan. Setiap baris mewakili total pendapatan dan belanja (realisasi dan target) untuk bulan tersebut.
          Untuk mengelola data per komponen anggaran, gunakan fitur Tambah Data dan unggah CSV dengan format yang sesuai.
        </div>
      </div>
    </main>
  )
}