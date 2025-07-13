'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { ArrowRight, Download, Home, LogOut, Plus, Trash2 } from 'lucide-react' // Import Trash2 icon
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import Papa from 'papaparse'

ModuleRegistry.registerModules([AllCommunityModule])
const BPSKey = process.env.NEXT_PUBLIC_BPS_KEY

export default function AdminPanelKelolaDataPDRB() {
  const [loginInfo, setLoginInfo] = useState({})
  const [PDRBAgg, setPDRBAgg] = useState([])
  const [PDRBAggColDefs, setPDRBAggColDefs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPreparingDownload, setIsPreparingDownload] = useState(false)
  const [gridApi, setGridApi] = useState(null)

  const BPS_DOMAIN = '7200'
  const VAR_PDRB_ADHB = '287'
  const VAR_PDRB_ADHK = '288'

  useEffect(() => {
    let logInf = JSON.parse(sessionStorage.getItem('loginInfo'))
    if(!logInf) {
      redirect('/admin', RedirectType.replace)
    } else {
      setLoginInfo(logInf)
    }
  }, [])

  const logout = () => {
    sessionStorage.removeItem('loginInfo')
    redirect('/admin', RedirectType.replace)
  }

  const getPDRGAgg = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('pdrb_sulteng_agg').select().order('created_at', {ascending: false})
      if(error) {
        toast.custom((t) => {
          return <ToastTemplate t={t} type='error' title='Get PDRB error' description='Coba hubungi admin' />
        })
        console.warn(error)
      } else {
        toast.custom((t) => (
          <ToastTemplate t={t} type="success" title='Get PDRB data berhasil!' />
        ))
        setPDRBAgg(data)

        let dynamicColDefs = Object.keys(data[0]).map((key) => ({
          field: key,
          headerName: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          sortable: true,
          filter: true,
          resizable: true,
          hide: ['id', 'created_at', 'updated_at'].includes(key)
        }))

        // Add the new "Actions" column for delete button
        dynamicColDefs.push({
            headerName: 'Actions',
            field: 'actions',
            minWidth: 80,
            cellRenderer: (params) => {
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

        setPDRBAggColDefs(dynamicColDefs)
      }
    } catch (err) {
      toast.custom((t) => {
        return <ToastTemplate t={t} type='error' title='Get PDRB error' description='Coba hubungi admin' />
      })
      console.warn(err)
      setPDRBAgg([])
    } finally {
      setIsLoading(false)
    }
  }

  // Handler for deleting a row
  const handleDeleteRow = async (rowData) => {
      if (!confirm(`Are you sure you want to delete data for ${rowData.daerah} at ${rowData.waktu}?`)) {
          return
      }

      try {
          const { error } = await supabase
              .from('pdrb_sulteng_agg')
              .delete()
              .eq('id', rowData.id)

          if (error) {
              throw error
          }

          toast.custom((t) => (
              <ToastTemplate t={t} type="success" title='Data berhasil dihapus!' />
          ))

          // Update the grid data by refetching or filtering locally
          // Refetching is safer to ensure data consistency with the database
          getPDRGAgg()

      } catch (error) {
          toast.custom((t) => (
              <ToastTemplate t={t} type='error' title='Gagal menghapus data' description={error.message || 'Terjadi kesalahan tidak diketahui'} />
          ))
          console.error('Error deleting row:', error)
      }
  }


  const getQuarterEndDate = (yearLabel, quarterLabel) => {
    const yearMatch = yearLabel.match(/\d{4}/)
    if (!yearMatch) return null
    const yearNum = parseInt(yearMatch[0])

    let month = 0
    switch (quarterLabel) {
      case 'Triwulan I':
        month = 3
        break
      case 'Triwulan II':
        month = 6
        break
      case 'Triwulan III':
        month = 9
        break
      case 'Triwulan IV':
        month = 12
        break
      default: return null
    }
    const date = new Date(yearNum, month, 0)
    return date.toISOString().split('T')[0]
  }

  const fetchBPSYearsAndData = useCallback(async (selectedDomain, selectedVariable, BPSKey) => {
    let pageThCount = 1 // Default to 1, will be updated by first API call
    try {
      const initialFetch = await fetch(`https://webapi.bps.go.id/v1/api/list/model/th/domain/${selectedDomain}/var/${selectedVariable}/key/${BPSKey}`)
      if (!initialFetch.ok) {
        throw new Error(`HTTP error! status: ${initialFetch.status} fetching initial year count for variable ${selectedVariable}`)
      }
      const initialRes = await initialFetch.json()
      pageThCount = initialRes.data[0].pages // Get total pages for years

      let tahunList = []
      for (let page = 1; page <= pageThCount; page++) {
        const thOnPageFetch = await fetch(`https://webapi.bps.go.id/v1/api/list/model/th/domain/${selectedDomain}/var/${selectedVariable}/page/${page}/key/${BPSKey}`)
        if (!thOnPageFetch.ok) {
          throw new Error(`HTTP error! status: ${thOnPageFetch.status} fetching years on page ${page} for variable ${selectedVariable}`)
        }
        const thOnPageRes = await thOnPageFetch.json()
        if (thOnPageRes.data && thOnPageRes.data[1]) {
          tahunList = [...tahunList, ...thOnPageRes.data[1]]
        }
      }

      let combinedDataForVariable = {
        var: null,
        turvar: null,
        vervar: null,
        tahun: [], // This will store unique tahun objects
        turtahun: null,
        datacontent: {}
      }
      let allTahunObjects = new Map() // Use Map to ensure unique tahun objects by val (th_id)
      let uniqueTurtahun = new Set() // Use Set to store unique turtahun objects

      const fetchPromises = tahunList.map(async (yearInfo) => {
        const resultFetch = await fetch(`https://webapi.bps.go.id/v1/api/list/model/data/lang/ind/domain/${selectedDomain}/var/${selectedVariable}/th/${yearInfo.th_id}/key/${BPSKey}`)
        if (!resultFetch.ok) {
          console.warn(`HTTP error! status: ${resultFetch.status} fetching data for year ${yearInfo.th_name} and variable ${selectedVariable}`)
          return null
        }
        const result = await resultFetch.json()
        if (result.status === 'OK' && result.datacontent) {
          return result
        }
        console.warn(`No data or API error for year ${yearInfo.th_name} and variable ${selectedVariable}`)
        return null
      })

      const responsesForYears = await Promise.all(fetchPromises)

      responsesForYears.forEach(dataForYear => {
        if (dataForYear) {
          // Initialize common metadata if not already set (should be consistent across years)
          if (!combinedDataForVariable.var) combinedDataForVariable.var = dataForYear.var
          if (!combinedDataForVariable.turvar) combinedDataForVariable.turvar = dataForYear.turvar
          if (!combinedDataForVariable.vervar) combinedDataForVariable.vervar = dataForYear.vervar
          if (!combinedDataForVariable.turtahun) combinedDataForVariable.turtahun = dataForYear.turtahun

          // Merge datacontent
          combinedDataForVariable.datacontent = { ...combinedDataForVariable.datacontent, ...dataForYear.datacontent }

          // Collect unique tahun objects
          if (dataForYear.tahun) {
            dataForYear.tahun.forEach(t => allTahunObjects.set(t.val, t))
          }

          // Collect unique turtahun objects (if they can vary across years, though typically static)
          if (dataForYear.turtahun) {
            dataForYear.turtahun.forEach(tt => uniqueTurtahun.add(JSON.stringify(tt)))
          }
        }
      })

      combinedDataForVariable.tahun = Array.from(allTahunObjects.values()).sort((a, b) => parseInt(a.val) - parseInt(b.val))
      combinedDataForVariable.turtahun = Array.from(uniqueTurtahun).map(tt => JSON.parse(tt))
      return combinedDataForVariable

    } catch (error) {
      console.error(`Error fetching all years and data for variable ${selectedVariable}:`, error)
      throw error // Re-throw to be caught by the main download function
    }
  }, [BPSKey]) // Dependencies: BPSKey

  const processApiData = useCallback((adhbCombinedData, adhkCombinedData) => {
    const combinedFinalDataMap = new Map()

    const combinedDataContent = { ...adhbCombinedData.datacontent, ...adhkCombinedData.datacontent }

    // --- Create comprehensive lookup Maps for all metadata types ---
    // These maps will store ID -> Label
    const vervarMap = new Map([
      ...(adhbCombinedData.vervar || []).map((v) => [v.val.toString(), v.label]),
      ...(adhkCombinedData.vervar || []).map((v) => [v.val.toString(), v.label]),
    ])

    const varMap = new Map([
      ...(adhbCombinedData.var || []).map((v) => [v.val.toString(), v.label]),
      ...(adhkCombinedData.var || []).map((v) => [v.val.toString(), v.label]),
    ])

    const turvarMap = new Map([
      ...(adhbCombinedData.turvar || []).map((v) => [v.val.toString(), v.label]),
      ...(adhkCombinedData.turvar || []).map((v) => [v.val.toString(), v.label]),
    ])

    const tahunMap = new Map([
      ...(adhbCombinedData.tahun || []).map((t) => [t.val.toString(), t.label]),
      ...(adhkCombinedData.tahun || []).map((t) => [t.val.toString(), t.label]),
    ])

    const turtahunMap = new Map([
      ...(adhbCombinedData.turtahun || []).map((tt) => [tt.val.toString(), tt.label]),
      ...(adhkCombinedData.turtahun || []).map((tt) => [tt.val.toString(), tt.label]),
    ])

    // Determine the variable IDs for ADHB and ADHK (assuming these are constant from the main 'var' array)
    const adhbVarId = adhbCombinedData.var && adhbCombinedData.var.length > 0 ? adhbCombinedData.var[0].val.toString() : null
    const adhkVarId = adhkCombinedData.var && adhkCombinedData.var.length > 0 ? adhkCombinedData.var[0].val.toString() : null

    // --- Extract all possible ID values for each category to use in dynamic parsing ---
    // Sort them by length in descending order to handle cases where '1' could be part of '12'
    const allVervarIds = Array.from(vervarMap.keys()).sort((a, b) => b.length - a.length)
    const allVarIds = Array.from(varMap.keys()).sort((a, b) => b.length - a.length)
    const allTurvarIds = Array.from(turvarMap.keys()).sort((a, b) => b.length - a.length)
    const allTahunIds = Array.from(tahunMap.keys()).sort((a, b) => b.length - a.length)
    const allTurtahunIds = Array.from(turtahunMap.keys()).sort((a, b) => b.length - a.length)

    for (const key of Object.keys(combinedDataContent)) {
      const value = combinedDataContent[key]
      let remainingKey = key

      let vervarVal, varVal, turvarVal, tahunVal, turtahunVal

      // --- Step-by-step parsing based on known order (vervar var turvar tahun turtahun) ---

      // 1. Extract vervarVal
      for (const id of allVervarIds) {
        if (remainingKey.startsWith(id)) {
          vervarVal = id
          remainingKey = remainingKey.substring(id.length)
          break
        }
      }
      if (!vervarVal) {
        // console.warn(`Could not parse vervar from key: "${key}". Skipping.`)
        continue
      }

      // 2. Extract varVal
      for (const id of allVarIds) {
        if (remainingKey.startsWith(id)) {
          varVal = id
          remainingKey = remainingKey.substring(id.length)
          break
        }
      }
      if (!varVal) {
        // console.warn(`Could not parse var from key: "${key}". Skipping.`)
        continue
      }

      // 3. Extract turvarVal
      for (const id of allTurvarIds) {
        if (remainingKey.startsWith(id)) {
          turvarVal = id
          remainingKey = remainingKey.substring(id.length)
          break
        }
      }
      if (!turvarVal) {
        // console.warn(`Could not parse turvar from key: "${key}". Skipping.`)
        continue
      }

      // 4. Extract tahunVal
      for (const id of allTahunIds) {
        if (remainingKey.startsWith(id)) {
          tahunVal = id
          remainingKey = remainingKey.substring(id.length)
          break
        }
      }
      if (!tahunVal) {
        // console.warn(`Could not parse tahun from key: "${key}". Skipping.`)
        continue
      }

      // 5. Extract turtahunVal (should be the rest of the key)
      for (const id of allTurtahunIds) {
        if (remainingKey.startsWith(id) && remainingKey.length === id.length) { // Ensure it consumes the rest of the key
          turtahunVal = id
          remainingKey = '' // All parsed
          break
        }
      }
      if (!turtahunVal || remainingKey.length > 0) { // If not found or extra chars remain
        // console.warn(`Could not parse turtahun from key: "${key}" or extra characters remain. Skipping.`)
        continue
      }

      // Determine if this data point is ADHB or ADHK based on the extracted variable ID
      let valueType = null
      if (varVal === adhbVarId) {
        valueType = 'adhb'
      } else if (varVal === adhkVarId) {
        valueType = 'adhk'
      } else {
        // If the variable ID from the key doesn't match either ADHB or ADHK, skip.
        console.warn(`Unexpected variable ID "${varVal}" in key "${key}". Skipping.`)
        continue
      }

      const daerahLabel = vervarMap.get(vervarVal)
      const tahunLabel = tahunMap.get(tahunVal)
      const turtahunLabel = turtahunMap.get(turtahunVal)

      // Check if all necessary labels are found
      if (!daerahLabel || !tahunLabel || !turtahunLabel) {
        console.warn(`Missing mapping for key parts (daerah: ${vervarVal}, tahun: ${tahunVal}, turtahun: ${turtahunVal}). Skipping key: "${key}"`)
        continue
      }

      const waktu = getQuarterEndDate(tahunLabel, turtahunLabel)

      // Skip if waktu is null (e.g., if getQuarterEndDate couldn't parse or if turtahunLabel was 'Jumlah')
      // Also explicitly skip 'Jumlah' in turtahunLabel if it's not handled by getQuarterEndDate returning null
      if (!waktu || turtahunLabel === 'Jumlah') {
        continue
      }

      // Create a unique key for the final combined record (daerah_waktu)
      const uniqueRecordKey = `${daerahLabel.trim()}_${waktu}`

      // Initialize the record if it doesn't exist in the combinedFinalDataMap
      if (!combinedFinalDataMap.has(uniqueRecordKey)) {
        combinedFinalDataMap.set(uniqueRecordKey, {
          daerah: daerahLabel.trim(),
          waktu: waktu,
          adhb: null,
          adhk: null,
          laju_tahunan: null, // These are placeholders, user will fill these later
          laju_kuartal: null, // These are placeholders, user will fill these later
        })
      }

      // Get the record and populate the ADHB or ADHK value
      const record = combinedFinalDataMap.get(uniqueRecordKey)
      if (valueType === 'adhb') {
        record.adhb = parseFloat(value)
      } else if (valueType === 'adhk') {
        record.adhk = parseFloat(value)
      }
      // Update the map (important if you're modifying the object directly like this)
      combinedFinalDataMap.set(uniqueRecordKey, record)
    }

    const finalArray = Array.from(combinedFinalDataMap.values())
    console.log("Processed Data Count:", finalArray.length)
    return finalArray
  }, [getQuarterEndDate])

  const fetchAndPreparePDRBCSV = useCallback(async () => {
    setIsPreparingDownload(true)
    // Removed: setCsvDownloadUrl('')

    if (!BPSKey) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Kunci API BPS tidak ditemukan' description='Mohon periksa konfigurasi .env.local Anda.' />
      ), { duration: 5000 })
      setIsPreparingDownload(false)
      return
    }

    try {
      const adhbCombinedData = await fetchBPSYearsAndData(BPS_DOMAIN, VAR_PDRB_ADHB, BPSKey)
      const adhkCombinedData = await fetchBPSYearsAndData(BPS_DOMAIN, VAR_PDRB_ADHK, BPSKey)
      const processedData = processApiData(adhbCombinedData, adhkCombinedData)

      if (processedData.length === 0) {
        toast.custom((t) => (
          <ToastTemplate t={t} type='info' title='Tidak ada data PDRB dari API' description='Tidak ada data yang tersedia untuk diunduh.' />
        ), { duration: 3000 })
        setIsPreparingDownload(false)
        return
      }

      // Convert processed data to CSV string
      const csvString = Papa.unparse(processedData, {
        header: true, // Include headers in the CSV
        columns: ['daerah', 'waktu', 'adhb', 'adhk', 'laju_tahunan', 'laju_kuartal']
      })

      // Create a Blob from the CSV string
      const blob = new Blob([csvString], { type: 'text/csvcharset=utf-8' })
      const url = URL.createObjectURL(blob)

      // --- AUTOMATIC DOWNLOAD LOGIC ---
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `pdrb_data_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link) // Required for Firefox
      link.click() // Trigger the download
      document.body.removeChild(link) // Clean up the element
      URL.revokeObjectURL(url) // Release the Blob URL immediately after triggering download

      toast.custom((t) => (
        <ToastTemplate t={t} type='success' title='CSV berhasil diunduh!' description='File telah diunduh secara otomatis.' />
      ), { duration: 3000 })

    } catch (err) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Gagal menyiapkan CSV' description={err.message} />
      ), { duration: 5000 })
      console.error('Error preparing CSV:', err)
      // Removed: setCsvDownloadUrl('')
    } finally {
      setIsPreparingDownload(false)
    }
  }, [BPSKey, BPS_DOMAIN, VAR_PDRB_ADHB, VAR_PDRB_ADHK, fetchBPSYearsAndData, processApiData])

  useEffect(() => {
    if(loginInfo) {
      getPDRGAgg()
    }
  }, [loginInfo]) // Added loginInfo to dependency array

  // Callback to set the grid API when the grid is ready
  const onGridReady = useCallback((params) => {
    setGridApi(params.api)
  }, [])

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <Toaster position="bottom-right" reverseOrder={false} />
      <div className="breadcrumbs text-sm">
        <ul>
          <li><Link href="/admin/panel">Beranda</Link></li>
          <li><Link href="/admin/panel/kelola-data">Pengelolaan Data</Link></li>
          <li><Link href="#">PDRB</Link></li>
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Kelola PDRB</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      <div className='flex justify-end w-full text-xs text-gray-700 items-center mb-4'> {/* Added items-center and mb-4 */}
        {/* Download CSV Button */}
        <button
          onClick={fetchAndPreparePDRBCSV}
          className='btn btn-sm btn-outline btn-info rounded-full mr-2'
          disabled={isPreparingDownload}
        >
          {isPreparingDownload ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <>
              <Download className='w-4 h-4' /> Unduh Template Data
            </>
          )}
        </button>

        {/* Link to Add Data Page */}
        <Link href="/admin/panel/kelola-data/pdrb/tambah" className='btn btn-sm btn-primary rounded-full'>
          <Plus className='w-4 h-4'/> Tambah data
        </Link>
      </div>

      <div className='grid mt-4 grid-cols-1 w-full'>
        {isLoading ? (
          <div className="skeleton h-32 w-full flex justify-center items-center">
            Loading...
          </div>
        ) : PDRBAgg.length > 0 ? (
            <div className='text-xs w-full h-80 ag-theme-quartz'> {/* Added ag-theme-quartz for default theme */}
              <AgGridReact
                rowData={PDRBAgg}
                columnDefs={PDRBAggColDefs}
                animateRows={true}
                pagination={true}
                paginationPageSize={20}
                onGridReady={onGridReady} // Set the grid API
                />
            </div>
          ) : (
            <div className="flex justify-center items-center h-48 bg-base-200 rounded-lg">
              <p className="text-lg text-gray-600">Belum ada record PDRB.</p>
            </div>
        )}
      </div>

      <div className="join mt-4 w-full join-vertical bg-white">
        <div className="collapse collapse-arrow join-item border-base-300 border">
          <input type="radio" name="my-accordion-4" defaultChecked />
          <div className="collapse-title font-semibold">Periodisasi Data</div>
          <div className="collapse-content text-sm">
            Data PDRB di Tingkat Provinsi dirilis oleh BPS secara triwulanan. Unduh Template Data .csv merupakan tarikan dari data BPS. Penyesuaian diperlukan sebelum diupload/ditambah dalam database. Pastikan Waktu dan Daerah harus sesuai dengan data yang belum terinput.
          </div>
        </div>
      </div>
    </main>
  )
}