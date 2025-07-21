'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { LogOut, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { formatLargeNumber } from '@/app/lib/formatLargeNumber'

ModuleRegistry.registerModules([AllCommunityModule])

export default function AdminPanelKelolaBelanjaNegara() {
  const gridRef = useRef() // Ref for the AG Grid instance
  const [loginInfo, setLoginInfo] = useState(null)
  const [belanjaNegaraAggregatedData, setBelanjaNegaraAggregatedData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Authentication check
  useEffect(() => {
    const logInf = JSON.parse(sessionStorage.getItem('loginInfo'))
    if (!logInf) {
      redirect('/admin', RedirectType.replace)
    } else {
      setLoginInfo(logInf)
    }
  }, [])

  // Function to fetch raw data and then aggregate it
  const fetchAndAggregateBelanjaNegaraData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('rincian_belanja_negara')
        .select('THANG, BULAN, KDKPPN, NMKPPN, PAGU_DIPA, REALISASI, BLOKIR') // Select only necessary columns for aggregation
        .order('THANG', { ascending: false })
        .order('BULAN', { ascending: false })

      if (error) {
        throw error
      }

      // --- Aggregation Logic: Sum by Year, Month, and KPPN ---
      const aggregatedMap = new Map() // Key: `${THANG}-${BULAN}-${KDKPPN}`

      data.forEach(row => {
        const key = `${row.THANG}-${row.BULAN}-${row.KDKPPN}`
        if (!aggregatedMap.has(key)) {
          aggregatedMap.set(key, {
            THANG: row.THANG,
            BULAN: row.BULAN,
            KDKPPN: row.KDKPPN,
            NMKPPN: row.NMKPPN, // Assuming NMKPPN is consistent for a given KDKPPN
            PAGU_DIPA_SUM: 0,
            REALISASI_SUM: 0,
            BLOKIR_SUM: 0,
            // To allow deletion of underlying records, we need their IDs.
            // For a summary table, deleting a summary row should ideally delete all its constituent raw rows.
            // This is complex. For simplicity here, we'll just show the sum.
            // Deletion will apply to the *raw* data in the upload section.
            // If you need to delete summarized rows, consider a database view or function.
          })
        }
        const aggregatedRow = aggregatedMap.get(key)
        aggregatedRow.PAGU_DIPA_SUM += row.PAGU_DIPA || 0
        aggregatedRow.REALISASI_SUM += row.REALISASI || 0
        aggregatedRow.BLOKIR_SUM += row.BLOKIR || 0
      })

      const aggregatedArray = Array.from(aggregatedMap.values()).sort((a, b) => {
        if (b.THANG !== a.THANG) return b.THANG - a.THANG
        return b.BULAN - a.BULAN
      })

      setBelanjaNegaraAggregatedData(aggregatedArray)
    } catch (err) {
      console.error('Error fetching or aggregating Belanja Negara data:', err)
      setError('Gagal memuat atau mengagregasi data Belanja Negara. Silakan coba lagi.')
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Kesalahan Data' description={err.message || 'Gagal memuat data Belanja Negara.'} />
      ))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch data when loginInfo is available
  useEffect(() => {
    if (loginInfo) {
      fetchAndAggregateBelanjaNegaraData()
    }
  }, [loginInfo, fetchAndAggregateBelanjaNegaraData])

  // Logout function
  const logout = useCallback(() => {
    sessionStorage.removeItem('loginInfo')
    toast.custom((t) => (
      <ToastTemplate t={t} type='success' title='Logout Berhasil!' description='Anda telah keluar dari panel admin.' />
    ), { duration: 2000 })
    setTimeout(() => {
      redirect('/admin', RedirectType.replace)
    }, 500)
  }, [])

  // Helper to format month number to name
  const getMonthName = (monthNum) => {
    const date = new Date(2000, monthNum - 1, 1) // Use 2000 as a dummy year
    return new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(date)
  }

  // Helper to format currency values
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-'
    return `Rp ${formatLargeNumber(value, 2)}`
  }

  // Function to handle deletion of aggregated data using conventional confirm
  const handleDelete = useCallback(async (data) => {
    const isConfirmed = confirm(
      `Apakah Anda yakin ingin menghapus semua data Belanja Negara untuk Tahun: ${data.THANG}, Bulan: ${getMonthName(data.BULAN)}, KPPN: ${data.NMKPPN}? Tindakan ini tidak bisa dibatalkan.`
    )

    if (isConfirmed) {
      // Perform deletion logic
      try {
        // Delete all raw records matching THANG, BULAN, and KDKPPN
        const { error } = await supabase
          .from('rincian_belanja_negara')
          .delete()
          .eq('THANG', data.THANG)
          .eq('BULAN', data.BULAN)
          .eq('KDKPPN', data.KDKPPN)

        if (error) {
          throw error
        }

        toast.custom((t) => (
          <ToastTemplate t={t} type='success' title='Hapus Berhasil!' description='Data Belanja Negara berhasil dihapus.' />
        ))

        // Refresh the grid data after successful deletion
        fetchAndAggregateBelanjaNegaraData()
      } catch (err) {
        console.error('Error deleting data:', err)
        toast.custom((t) => (
          <ToastTemplate t={t} type='error' title='Hapus Gagal' description={`Gagal menghapus data: ${err.message}`} />
        ))
      }
    }
  }, [fetchAndAggregateBelanjaNegaraData, getMonthName])


  // Define column definitions for AG Grid
  const columnDefs = useMemo(() => [
    {
      headerName: 'No.',
      valueGetter: 'node.rowIndex + 1',
      width: 70,
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
    },
    {
      headerName: 'Tahun',
      field: 'THANG',
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      minWidth: 100,
    },
    {
      headerName: 'Bulan',
      field: 'BULAN',
      valueFormatter: params => getMonthName(params.value),
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 120,
    },
    {
      headerName: 'Kode KPPN',
      field: 'KDKPPN',
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 120,
    },
    {
      headerName: 'Nama KPPN',
      field: 'NMKPPN',
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1.5,
      minWidth: 180,
    },
    {
      headerName: 'Pagu DIPA (Sum)',
      field: 'PAGU_DIPA_SUM',
      valueFormatter: params => formatCurrency(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1,
      minWidth: 180,
    },
    {
      headerName: 'Realisasi (Sum)',
      field: 'REALISASI_SUM',
      valueFormatter: params => formatCurrency(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1,
      minWidth: 180,
    },
    {
      headerName: 'Blokir (Sum)',
      field: 'BLOKIR_SUM',
      valueFormatter: params => formatCurrency(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1,
      minWidth: 180,
    },
    {
      headerName: 'Aksi',
      width: 90,
      cellRenderer: (params) => (
        <button
          onClick={() => handleDelete(params.data)}
          className="btn btn-sm btn-error text-white"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
      cellClass: 'grid-cell-centered', // Optional: Center the button in the cell
    },
  ], [getMonthName, formatCurrency, handleDelete])

  // Default column properties
  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true, // Enable quick filter input for each column
  }), [])

  // Pagination and other grid options
  const gridOptions = useMemo(() => ({
    pagination: true,
    paginationPageSize: 20,
  }), [])

  // Conditional rendering for login check
  if (loginInfo === null) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-screen bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <Toaster position="bottom-right" reverseOrder={false} />
      <div className="breadcrumbs text-sm">
        <ul>
          <li><Link href="/admin/panel">Beranda</Link></li>
          <li><Link href="/admin/panel/kelola-data">Pengelolaan Data</Link></li>
          <li><Link href="/admin/panel/kelola-data/belanja-negara">Belanja Negara</Link></li>
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4 items-center'>
        <h2 className='flex-1 text-xl font-bold'>Kelola Belanja Negara (Agregat per KPPN Bulanan)</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      <div className='mb-6 flex justify-end'>
        <Link href="/admin/panel/kelola-data/belanja-negara/tambah" className="btn btn-primary btn-sm rounded-full">
            <Plus className='w-4 h-4' /> Unggah Data
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="ml-2">Memuat dan mengagregasi data Belanja Negara...</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
          <button className="btn btn-sm" onClick={fetchAndAggregateBelanjaNegaraData}>Coba Lagi</button>
        </div>
      )}

      {!isLoading && !error && belanjaNegaraAggregatedData.length === 0 && (
        <div className="alert alert-info">
          <span>Tidak ada data Belanja Negara tersedia untuk agregasi.</span>
        </div>
      )}

      {!isLoading && !error && belanjaNegaraAggregatedData.length > 0 && (
        <div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={belanjaNegaraAggregatedData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            gridOptions={gridOptions}
            onGridReady={(params) => {
              params.api.sizeColumnsToFit()
            }}
          />
        </div>
      )}

      <div className="collapse bg-base-100 bg-white border border-base-300 mt-4">
        <input type="radio" name="my-accordion-1" defaultChecked />
        <div className="collapse-title font-semibold">Informasi Rincian Belanja Negara</div>
        <div className="collapse-content text-sm">
          Data rincian belanja negara ini disajikan sebagai ringkasan bulanan per KPPN secara kumulatif sampai dengan periode bersangkutan.
          Untuk mengelola data, gunakan fitur Tambah Data dan unggah CSV dengan format yang sesuai. Data dapat diambil dari Aplikasi Sintesa.
        </div>
      </div>
    </main>
  )
}