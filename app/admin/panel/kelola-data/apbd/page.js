'use client'

import ToastTemplate from '@/app/components/ToastTemplate'

import { Download, LogOut, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '@/app/lib/supabaseClient'

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'

ModuleRegistry.registerModules([AllCommunityModule])

export default function AdminPanelKelolaAPBD() {
  const gridRef = useRef() // Ref for the AG Grid instance
  const [loginInfo, setLoginInfo] = useState(null)
  const [apbdData, setApbdData] = useState([])
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

  // Function to fetch data from the 'fiskal_pemda' table
  const fetchAPBDData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('fiskal_pemda')
        .select('*') // Select all columns
        .order('tgl_cutoff', { ascending: false }) // Order by date, latest first

      if (error) {
        throw error
      }
      setApbdData(data)
    } catch (err) {
      console.error('Error fetching APBD data:', err)
      setError('Gagal memuat data APBD. Silakan coba lagi.')
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Kesalahan Data' description={err.message || 'Gagal memuat data APBD.'} />
      ))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch data when loginInfo is available
  useEffect(() => {
    if (loginInfo) {
      fetchAPBDData()
    }
  }, [loginInfo, fetchAPBDData])

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

  // Helper to format date to a readable format
  const formatDate = (isoDateString) => {
    if (!isoDateString) return '-'
    const date = new Date(isoDateString)
    return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
  }

  // --- DELETE ROW LOGIC ---
  const handleDeleteRow = useCallback(async (rowData) => {
    // IMPORTANT: In a production environment, replace `confirm()` with a custom modal UI.
    if (!confirm(`Apakah Anda yakin ingin menghapus data APBD untuk ${rowData.nama_pemda} pada tanggal ${formatDate(rowData.tgl_cutoff)}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('fiskal_pemda') // Target the 'fiskal_pemda' table
        .delete()
        .eq('id', rowData.id) // Assuming 'id' is your primary key

      if (error) {
        throw error
      }

      toast.custom((t) => (
        <ToastTemplate t={t} type="success" title='Data APBD berhasil dihapus!' />
      ))

      // Re-fetch data to update the grid after deletion
      fetchAPBDData()

    } catch (error) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Gagal menghapus data APBD' description={error.message || 'Terjadi kesalahan tidak diketahui'} />
      ))
      console.error('Error deleting APBD row:', error)
    }
  }, [fetchAPBDData]) // Dependency: fetchAPBDData to re-load data

  // Define column definitions for AG Grid
  const columnDefs = useMemo(() => [
    {
      headerName: 'Tgl Cutoff',
      field: 'tgl_cutoff',
      valueFormatter: params => formatDate(params.value),
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1.2,
      minWidth: 150,
    },
    {
      headerName: 'Nama Pemda',
      field: 'nama_pemda',
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1.5,
      minWidth: 180,
    },
    {
      headerName: 'Pendapatan',
      field: 'pendapatan',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      cellStyle: { fontWeight: 'bold' },
      flex: 2,
      minWidth: 180,
    },
    {
      headerName: 'Belanja',
      field: 'belanja',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      cellStyle: { fontWeight: 'bold' },
      flex: 2,
      minWidth: 180,
    },
    {
      headerName: 'Pembiayaan',
      field: 'pembiayaan',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'SILPA',
      field: 'SILPA', // Use the exact field name from your table
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'Aksi',
      cellRenderer: (params) => (
        <div className="flex items-center justify-center space-x-2 h-full">
          <button
            className="btn btn-ghost btn-xs btn-circle"
            onClick={() => handleDeleteRow(params.data)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      ),
      width: 80,
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
      cellClass: 'grid-action-buttons-cell',
    },
  ], [formatRupiah, formatDate, handleDeleteRow]) // Dependencies for useMemo

  // Default column properties
  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
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
          <li><Link href="/admin/panel/kelola-data/apbd">APBD</Link></li>
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4 items-center'>
        <h2 className='flex-1 text-xl font-bold'>Kelola Data APBD</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      <div className='mb-6 flex justify-end'>
          <Link href="/assets/template-data/template-upload-apbd.xlsx" download className="btn btn-outline btn-info rounded-full btn-sm mr-1">
            <Download className='w-4 h-4' /> Download Template
          </Link>
          <Link href="/admin/panel/kelola-data/apbd/tambah" className="btn btn-primary btn-sm rounded-full">
            <Plus className='w-4 h-4' /> Tambah Data APBD
          </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="ml-2">Memuat data...</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
          <button className="btn btn-sm" onClick={fetchAPBDData}>Coba Lagi</button>
        </div>
      )}

      {!isLoading && !error && apbdData.length === 0 && (
        <div className="alert alert-info">
          <span>Tidak ada data APBD tersedia.</span>
        </div>
      )}

      {!isLoading && !error && apbdData.length > 0 && (
        <div className='mb-4' style={{ height: 400, width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={apbdData}
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
        <div className="collapse-title font-semibold">Informasi Data APBD</div>
        <div className="collapse-content text-sm">
          Data APBD ini disajikan sebagai ringkasan bulanan. Setiap baris mewakili realisasi pendapatan dan belanja untuk bulan tersebut (kumulatif).
          Untuk mengelola data per komponen anggaran, gunakan fitur Tambah Data dan unggah CSV dengan format yang sesuai. Data dapat diambil dari Aplikasi SIKRI.
        </div>
      </div>
    </main>
  )
}