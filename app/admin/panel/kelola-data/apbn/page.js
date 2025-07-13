'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { LogOut, Plus, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'

ModuleRegistry.registerModules([AllCommunityModule])

export default function AdminPanelKelolaAPBN() {
  const gridRef = useRef() // Ref for the AG Grid instance
  const [loginInfo, setLoginInfo] = useState(null)
  const [apbnData, setApbnData] = useState([])
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

  const fetchAPBN = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('fiskal_apbn')
        .select('*')
        .order('tgl_cutoff', { ascending: false })

      if (error) {
        throw error
      }

      const processedData = data.map(item => ({
        ...item,
        // Calculate 'pendapatan' and 'belanja'
        pendapatan: (item.p_pajak || 0) + (item.p_beacukai || 0) + (item.p_pnbp_lain || 0) + (item.p_blu || 0),
        belanja: (item.b_pegawai || 0) + (item.b_barang || 0) + (item.b_modal || 0) + (item.b_bansos || 0) +
                 (item.b_dbh || 0) + (item.b_dakfisik || 0) + (item.b_daknonfisik || 0) + (item.b_dau || 0) +
                 (item.b_infis || 0) + (item.b_danadesa || 0)
      }))
      setApbnData(processedData)
    } catch (err) {
      console.error('Error fetching APBN data:', err)
      setError('Gagal memuat data APBN. Silakan coba lagi.')
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Kesalahan Data' description={err.message || 'Gagal memuat data APBN.'} />
      ))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (loginInfo) {
      fetchAPBN()
    }
  }, [loginInfo, fetchAPBN])

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
  const handleDeleteRow = useCallback(async (rowData) => {
    // IMPORTANT: In a production environment, replace `confirm()` with a custom modal UI.
    // Browsers often block native `confirm()` in iframes or for better UX.
    if (!confirm(`Apakah Anda yakin ingin menghapus data APBN untuk tanggal ${formatMonthYear(rowData.tgl_cutoff)}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('fiskal_apbn') // Target the 'fiskal_apbn' table
        .delete()
        .eq('id', rowData.id) // Assuming 'id' is your primary key

      if (error) {
        throw error
      }

      toast.custom((t) => (
        <ToastTemplate t={t} type="success" title='Data APBN berhasil dihapus!' />
      ))

      // Re-fetch data to update the grid after deletion
      fetchAPBN()

    } catch (error) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Gagal menghapus data APBN' description={error.message || 'Terjadi kesalahan tidak diketahui'} />
      ))
      console.error('Error deleting APBN row:', error)
    }
  }, [fetchAPBN]) // Dependency: fetchAPBN to re-load data

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
      headerName: 'Pendapatan',
      field: 'pendapatan',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      cellStyle: { fontWeight: 'bold' },
      flex: 2,
      minWidth: 200,
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
      minWidth: 200,
    },
    {
      headerName: 'Pajak',
      field: 'p_pajak',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'Bea Cukai',
      field: 'p_beacukai',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'PNBP Lain',
      field: 'p_pnbp_lain',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'BLU',
      field: 'p_blu',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'Belanja Pegawai',
      field: 'b_pegawai',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'Belanja Barang',
      field: 'b_barang',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'Belanja Modal',
      field: 'b_modal',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'Belanja Bansos',
      field: 'b_bansos',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'Dana Bagi Hasil',
      field: 'b_dbh',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'DAK Fisik',
      field: 'b_dakfisik',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'DAK Non-Fisik',
      field: 'b_daknonfisik',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'DAU',
      field: 'b_dau',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'Dana Transfer Lainnya',
      field: 'b_infis',
      valueFormatter: params => formatRupiah(params.value),
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'Dana Desa',
      field: 'b_danadesa',
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
          {/* Removed Edit button */}
          <button
            className="btn btn-ghost btn-xs btn-circle tooltip tooltip-top"
            data-tip="Hapus"
            onClick={() => handleDeleteRow(params.data)} // Call the delete handler
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      ),
      width: 80, // Adjusted width since only one button
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
    domLayout: 'autoHeight',
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
        <h2 className='flex-1 text-xl font-bold'>Kelola Data APBN</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      <div className='mb-6 flex justify-end'>
         <Link href="/admin/panel/kelola-data/apbn/tambah" className="btn btn-primary btn-sm">
            <Plus className='w-4 h-4' /> Tambah Data APBN
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
          <button className="btn btn-sm" onClick={fetchAPBN}>Coba Lagi</button>
        </div>
      )}

      {!isLoading && !error && apbnData.length === 0 && (
        <div className="alert alert-info">
          <span>Tidak ada data APBN tersedia.</span>  
        </div>
      )}

      {!isLoading && !error && apbnData.length > 0 && (
        <div style={{ height: 400, width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={apbnData}
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
