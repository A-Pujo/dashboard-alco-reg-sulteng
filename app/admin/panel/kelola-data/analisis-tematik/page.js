'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { LogOut, Plus, Trash2, Edit, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
ModuleRegistry.registerModules([AllCommunityModule])

export default function AdminPanelKelolaAnalisisTematik() {
  const gridRef = useRef() // Ref for the AG Grid instance
  const [loginInfo, setLoginInfo] = useState(null)
  const [analisisData, setAnalisisData] = useState([])
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

  // Function to fetch data from the 'analisis_tematik_data' table
  const fetchAnalisisTematikData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('analisis_tematik_data')
        .select('*') // Select all columns
        .order('tgl_publish', { ascending: false }) // Order by publish date, latest first

      if (error) {
        throw error
      }
      setAnalisisData(data)
    } catch (err) {
      console.error('Error fetching Analisis Tematik data:', err)
      setError('Gagal memuat data Analisis Tematik. Silakan coba lagi.')
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Kesalahan Data' description={err.message || 'Gagal memuat data Analisis Tematik.'} />
      ))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch data when loginInfo is available
  useEffect(() => {
    if (loginInfo) {
      fetchAnalisisTematikData()
    }
  }, [loginInfo, fetchAnalisisTematikData])

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

  // Helper to format date to a readable format
  const formatDate = (isoDateString) => {
    if (!isoDateString) return '-'
    const date = new Date(isoDateString)
    return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
  }

  // --- DELETE ROW LOGIC ---
  const handleDeleteRow = useCallback(async (rowData) => {
    // IMPORTANT: In a production environment, replace `confirm()` with a custom modal UI.
    if (!confirm(`Apakah Anda yakin ingin menghapus analisis "${rowData.judul}" yang dipublikasikan pada ${formatDate(rowData.tgl_publish)}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('analisis_tematik_data')
        .delete()
        .eq('id', rowData.id) // Assuming 'id' is your primary key

      if (error) {
        throw error
      }

      toast.custom((t) => (
        <ToastTemplate t={t} type="success" title='Analisis Tematik berhasil dihapus!' />
      ))

      // Re-fetch data to update the grid after deletion
      fetchAnalisisTematikData()

    } catch (error) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Gagal menghapus Analisis Tematik' description={error.message || 'Terjadi kesalahan tidak diketahui'} />
      ))
      console.error('Error deleting Analisis Tematik row:', error)
    }
  }, [fetchAnalisisTematikData])

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
      headerName: 'Tanggal Publish',
      field: 'tgl_publish',
      valueFormatter: params => formatDate(params.value),
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 150,
      flex: 1,
    },
    {
      headerName: 'Judul',
      field: 'judul',
      sortable: true,
      filter: true,
      resizable: true,
      flex: 2,
      minWidth: 250,
    },
    {
      headerName: 'Nama Publisher',
      field: 'nama_publisher',
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1.2,
      minWidth: 150,
    },
    {
      headerName: 'Unit Publisher',
      field: 'unit_publisher',
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1.2,
      minWidth: 150,
    },
    {
      headerName: 'File',
      field: 'file_url',
      cellRenderer: (params) => {
        if (params.value) {
          return (
            <Link href={params.value} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs btn-circle">
              <ExternalLink className="w-4 h-4 text-blue-500" />
            </Link>
          )
        }
        return '-'
      },
      width: 80,
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
      cellClass: 'grid-action-buttons-cell',
    },
    {
      headerName: 'Aksi',
      cellRenderer: (params) => (
        <button
        className="btn btn-ghost btn-xs btn-circle"
        data-tip="Hapus"
        onClick={() => handleDeleteRow(params.data)}
        >
            <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      ),
      width: 120,
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
      cellClass: 'grid-action-buttons-cell',
    },
  ], [formatDate, handleDeleteRow])

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
          <li><Link href="#">Analisis Tematik</Link></li>
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4 items-center'>
        <h2 className='flex-1 text-xl font-bold'>Kelola Analisis Tematik</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      <div className='mb-6 flex justify-end'>
         <Link href="/admin/panel/kelola-data/analisis-tematik/tambah" className="btn btn-primary btn-sm">
            <Plus className='w-4 h-4' /> Tambah Analisis Tematik
         </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="ml-2">Memuat data Analisis Tematik...</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
          <button className="btn btn-sm" onClick={fetchAnalisisTematikData}>Coba Lagi</button>
        </div>
      )}

      {!isLoading && !error && analisisData.length === 0 && (
        <div className="alert alert-info">
          <span>Tidak ada data Analisis Tematik tersedia.</span>
        </div>
      )}

      {!isLoading && !error && analisisData.length > 0 && (
        <div style={{ height: 500, width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={analisisData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            gridOptions={gridOptions}
            onGridReady={(params) => {
              params.api.sizeColumnsToFit()
            }}
          />
        </div>
      )}
    </main>
  )
}