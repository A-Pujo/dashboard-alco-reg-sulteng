'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { LogOut, Plus, Trash2 } from 'lucide-react' // Added Plus icon for 'Tambah data'
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useEffect, useState, useCallback, useMemo } from 'react' // Added useMemo, useCallback
import toast, { Toaster } from 'react-hot-toast'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'

ModuleRegistry.registerModules([AllCommunityModule])

export default function AdminPanelKelolaDataInflasi() {
  const [loginInfo, setLoginInfo] = useState(null)
  const [inflasiData, setInflasiData] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Handler for deleting a row
  const handleDeleteRow = useCallback(async (rowData) => {
    // IMPORTANT: Replace confirm() with a custom modal UI in a production environment
    // Browsers block confirm() in iframes or for better UX.
    if (!confirm(`Are you sure you want to delete data for ${rowData.daerah} at ${rowData.waktu}?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('inflasi') // Target the 'inflasi' table
        .delete()
        .eq('id', rowData.id) // Assuming 'id' is your primary key for the 'inflasi' table

      if (error) {
        throw error
      }

      toast.custom((t) => (
        <ToastTemplate t={t} type="success" title='Data Inflasi berhasil dihapus!' />
      ))

      getInflasiData()

    } catch (error) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Gagal menghapus data Inflasi' description={error.message || 'Terjadi kesalahan tidak diketahui'} />
      ))
      console.error('Error deleting inflasi row:', error)
    }
  }, []) // Dependencies: getInflasiData (defined below)

  const inflasiColDefs = useMemo(() => {
    // Base columns: These are the columns you explicitly want to show and their order.
    // Ensure all expected inflation-related fields are here.
    let baseColDefs = [
      { field: 'daerah', headerName: 'Daerah', filter: true, sortable: true, resizable: true, minWidth: 400 },
      { field: 'waktu', headerName: 'Waktu', filter: true, sortable: true, resizable: true },
      // Add any other standard/expected columns from your 'inflasi' table here.
    ]

    // This array will hold the final column definitions including dynamic and action columns.
    let finalColDefs = [...baseColDefs]

    // If inflasiData is available, check for any additional dynamic columns not in baseColDefs
    // and ensure internal IDs/timestamps are hidden.
    if (inflasiData.length > 0) {
      const firstRowKeys = Object.keys(inflasiData[0])
      const knownBaseKeys = baseColDefs.map(col => col.field)

      const dynamicKeys = firstRowKeys.filter(key =>
        !knownBaseKeys.includes(key) && // Not already in baseColDefs
        !['id', 'created_at', 'updated_at'].includes(key) // Not an internal field to hide
      )

      const dynamicAdditionalColDefs = dynamicKeys.map((key) => ({
        field: key,
        headerName: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        sortable: true,
        filter: true,
        resizable: true,
      }))

      finalColDefs = [...baseColDefs, ...dynamicAdditionalColDefs]
    }

    // Add the Actions column at the end
    finalColDefs.push({
      headerName: 'Actions',
      field: 'actions',
      minWidth: 80,
      cellRenderer: (params) => {
        // Ensure params.data.id exists before rendering the button
        if (!params.data || !params.data.id) {
          return null // Don't render button if there's no data or no ID
        }
        return (
          <button
            className="btn btn-xs btn-error text-white"
            onClick={() => handleDeleteRow(params.data)}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )
      },
      sortable: false,
      filter: false,
      resizable: false,
    })

    return finalColDefs
  }, [inflasiData, handleDeleteRow]) // Dependency on inflasiData and handleDeleteRow

  // Authentication check
  useEffect(() => {
    const logInf = JSON.parse(sessionStorage.getItem('loginInfo'))
    if (!logInf) {
      redirect('/admin', RedirectType.replace)
    } else {
      setLoginInfo(logInf)
    }
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('loginInfo')
    toast.custom((t) => (
      <ToastTemplate t={t} type='success' title='Logout Berhasil!' description='Anda telah keluar dari panel admin.' />
    ), { duration: 2000 })
    setTimeout(() => {
      redirect('/admin', RedirectType.replace)
    }, 500)
  }, [])

  const getInflasiData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('inflasi').select().order('created_at', { ascending: false })
      if (error) {
        toast.custom((t) => (
          <ToastTemplate t={t} type='error' title='Gagal mengambil data Inflasi' description='Coba hubungi admin.' />
        ), { duration: 3000 })
        console.error('Supabase fetch error:', error)
        setInflasiData([])
      } else {
        toast.custom((t) => (
          <ToastTemplate t={t} type='success' title='Data Inflasi berhasil dimuat!' />
        ), { duration: 2000 })
        setInflasiData(data)
      }
    } catch (err) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Terjadi kesalahan jaringan' description='Coba lagi atau hubungi admin.' />
      ), { duration: 3000 })
      console.error('Catch error during data fetch:', err)
      setInflasiData([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch data when loginInfo is available
  useEffect(() => {
    if (loginInfo) {
      getInflasiData()
    }
  }, [loginInfo, getInflasiData])

  // Conditional rendering based on loginInfo
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
          <li><Link href="#">Inflasi</Link></li>
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Kelola Inflasi</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      <div className='flex justify-end w-full text-xs text-gray-700 items-center mb-4'>
        <Link href="/admin/panel/kelola-data/inflasi/tambah" className='btn btn-sm btn-primary rounded-full ml-2 py-2 px-4'>
            <Plus className='w-4 h-4'/> Tambah data
        </Link>
      </div>

      <div className='grid mt-4 grid-cols-1 w-full'>
        {isLoading ? (
          <div className="flex justify-center items-center h-96 bg-base-200 rounded-lg">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="ml-2 text-lg text-gray-600">Memuat data Inflasi...</p>
          </div>
        ) : inflasiData.length > 0 ? (
          <div style={{ height: '400px', width: '100%' }}>
            <AgGridReact
              rowData={inflasiData}
              columnDefs={inflasiColDefs}
              animateRows={true}
              pagination={true}
              paginationPageSize={20}
            />
          </div>
        ) : (
          <div className="flex justify-center items-center h-96 bg-base-200 rounded-lg">
            <p className="text-lg text-gray-600">Belum ada record Inflasi.</p>
          </div>
        )}
      </div>

      <div className="join mt-4 w-full join-vertical bg-white">
        <div className="collapse collapse-arrow join-item border-base-300 border">
          <input type="radio" name="my-accordion-4" defaultChecked />
          <div className="collapse-title font-semibold">Periodisasi Data</div>
          <div className="collapse-content text-sm">
            Data Inflasi di Tingkat Provinsi dirilis oleh BPS secara bulanan.
          </div>
        </div>
      </div>
    </main>
  )
}