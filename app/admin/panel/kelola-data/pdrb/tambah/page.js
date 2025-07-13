'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { ArrowRight, Home, LogOut, Plus } from 'lucide-react'
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import Papa from 'papaparse'

ModuleRegistry.registerModules([AllCommunityModule])

export default function AdminPanelAddDataPDRB() {
  const [loginInfo, setLoginInfo] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [parsedCsvData, setParsedCsvData] = useState([])
  const [isUploadingCsv, setIsUploadingCsv] = useState(false)
  const daerahOption = ['Provinsi Sulawesi Tengah', "Kabupaten Banggai", "Kabupaten Banggai Kepulauan", "Kabupaten Banggai Laut", "Kabupaten Buol",
  "Kabupaten Donggala", "Kabupaten Morowali", "Kabupaten Morowali Utara", "Kabupaten Parigi Moutong", "Kabupaten Poso", "Kabupaten Sigi",
  "Kabupaten Tojo Una-Una", "Kabupaten Toli-Toli", "Kota Palu"]

  const [manualDaerah, setManualDaerah] = useState(daerahOption[0])
  const [manualWaktu, setManualWaktu] = useState('')
  const [manualAdhb, setManualAdhb] = useState('')
  const [manualAdhk, setManualAdhk] = useState('')
  const [manualLajuTahunan, setManualLajuTahunan] = useState('')
  const [manualLajuKuartal, setManualLajuKuartal] = useState('')
  const [manualInputError, setManualInputError] = useState('')

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

  const handleManualInsert = useCallback(async (e) => {
    e.preventDefault()
    setManualInputError('')
    setIsLoading(true)

    if (!manualDaerah || !manualWaktu || manualAdhb === '' || manualAdhk === '' || manualLajuTahunan === '' || manualLajuKuartal === '') {
      setManualInputError('Semua kolom manual harus diisi.')
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('pdrb_sulteng_agg')
        .insert([
          {
            daerah: manualDaerah,
            waktu: manualWaktu, // Ensure this is a valid date format for Supabase
            adhb: parseFloat(manualAdhb),
            adhk: parseFloat(manualAdhk),
            laju_tahunan: parseFloat(manualLajuTahunan),
            laju_kuartal: parseFloat(manualLajuKuartal),
          },
        ])
        .select()

      if (error) {
        toast.custom((t) => (
          <ToastTemplate t={t} type='error' title='Gagal tambah data manual' description={error.message} />
        ), { duration: 3000 })
        console.error('Supabase manual insert error:', error)
      } else {
        toast.custom((t) => (
          <ToastTemplate t={t} type='success' title='Data manual berhasil ditambahkan!' />
        ), { duration: 2000 })
        console.log('Manual data added:', data)
        setManualWaktu('')
        setManualAdhb('')
        setManualAdhk('')
        setManualLajuTahunan('')
        setManualLajuKuartal('')
        setManualDaerah(daerahOption[0])
      }
    } catch (err) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Terjadi kesalahan' description='Coba lagi atau hubungi admin.' />
      ), { duration: 3000 })
      console.error('Catch error during manual insert:', err)
    } finally {
      setIsLoading(false)
    }
  }, [manualDaerah, manualWaktu, manualAdhb, manualAdhk, manualLajuTahunan, manualLajuKuartal])

  const handleFileChange = useCallback((event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0]
      setSelectedFile(file)
      setParsedCsvData([])
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            toast.custom((t) => (
              <ToastTemplate t={t} type='error' title='Kesalahan Parsing CSV' description={`Baris ${results.errors[0].row}: ${results.errors[0].message}`} />
            ), { duration: 5000 })
            console.error('CSV parsing errors:', results.errors)
            setParsedCsvData([])
          } else {
            setParsedCsvData(results.data)
            toast.custom((t) => (
              <ToastTemplate t={t} type='info' title='CSV Berhasil Diparsing' description={`${results.data.length} baris data siap diupload.`} />
            ), { duration: 3000 })
            console.log('Parsed CSV Data:', results.data)
          }
        },
        error: (err) => {
          toast.custom((t) => (
            <ToastTemplate t={t} type='error' title='Kesalahan Membaca File' description={err.message} />
          ), { duration: 5000 })
          console.error('File reading error:', err)
        }
      })
    } else {
      setSelectedFile(null)
      setParsedCsvData([])
    }
  }, [])

  const handleUploadCsv = useCallback(async () => {
    if (!parsedCsvData || parsedCsvData.length === 0) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Tidak ada data CSV untuk diupload' description='Mohon pilih dan parsing file CSV terlebih dahulu.' />
      ), { duration: 3000 })
      return
    }

    setIsUploadingCsv(true)
    let successCount = 0
    let errorCount = 0
    const errors = []

    for (const row of parsedCsvData) {
      const { daerah, adhb, adhk, laju_tahunan, laju_kuartal, waktu } = row
      const dataToInsert = {
        daerah: daerah,
        adhb: parseFloat(adhb),
        adhk: parseFloat(adhk),
        laju_tahunan: parseFloat(laju_tahunan),
        laju_kuartal: parseFloat(laju_kuartal),
        waktu: waktu
      }

      if (!dataToInsert.daerah || isNaN(dataToInsert.adhb) || isNaN(dataToInsert.adhk) || !dataToInsert.waktu) {
        errors.push(`Baris tidak valid: ${JSON.stringify(row)}`)
        errorCount++
        continue
      }

      try {
        const { error } = await supabase.from('pdrb_sulteng_agg').insert([dataToInsert])
        if (error) {
          errors.push(`Gagal insert baris ${JSON.stringify(row)}: ${error.message}`)
          errorCount++
        } else {
          successCount++
        }
      } catch (err) {
        errors.push(`Kesalahan saat mengupload baris ${JSON.stringify(row)}: ${err.message}`)
        errorCount++
      }
    }

    setIsUploadingCsv(false)

    if (errorCount === 0) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='success' title='Upload CSV Berhasil!' description={`${successCount} baris data berhasil diupload.`} />
      ), { duration: 4000 })
      setSelectedFile(null)
      setParsedCsvData([])
    } else {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Upload CSV Selesai dengan Error' description={`${successCount} berhasil, ${errorCount} gagal. Cek konsol untuk detail.`} />
      ), { duration: 5000 })
      console.error('CSV Upload Errors:', errors)
    }
  }, [parsedCsvData])

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <Toaster position="bottom-right" reverseOrder={false} />
      <div className="breadcrumbs text-sm">
        <ul>
          <li><Link href="/admin/panel">Beranda</Link></li>
          <li><Link href="/admin/panel/kelola-data">Pengelolaan Data</Link></li>
          <li><Link href="/admin/panel/kelola-data/pdrb">PDRB</Link></li>
          <li><Link href="#">Tambah</Link></li>
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Tambah Data PDRB</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      <div className="collapse collapse-arrow bg-base-100 border border-base-300">
        <input type="radio" name="my-accordion-2" defaultChecked />
        <div className="collapse-title font-semibold">Insert data manual</div>
        <div className="collapse-content text-sm">
          <div className='grid grid-cols-1 w-full'>
          <form onSubmit={handleManualInsert}>
              <fieldset className="form-control mb-4">
                <label className="label mb-1">Daerah</label>
                <select
                  className='select select-bordered w-full'
                  value={manualDaerah}
                  onChange={(e) => setManualDaerah(e.target.value)}
                  required
                >
                  {daerahOption.map((item, i) => {
                    return <option key={i} value={item}>{item}</option>
                  })}
                </select>
              </fieldset>
              <fieldset className="form-control mb-4">
                <label className="label mb-1">Waktu</label>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={manualWaktu}
                  onChange={(e) => setManualWaktu(e.target.value)}
                  required
                />
              </fieldset>
              <fieldset className="fieldset rounded border border-gray-400 px-4 pb-4 mb-4">
                <legend className="fieldset-legend text-sm font-semibold px-2">Nilai</legend>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className="form-control">
                    <label className='label mb-1'>ADHB (Miliar Rp)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input input-bordered w-full"
                      value={manualAdhb}
                      onChange={(e) => setManualAdhb(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className='label mb-1'>ADHK (Miliar Rp)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input input-bordered w-full"
                      value={manualAdhk}
                      onChange={(e) => setManualAdhk(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className='label mb-1'>Laju Tahunan (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input input-bordered w-full"
                      value={manualLajuTahunan}
                      onChange={(e) => setManualLajuTahunan(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-control">
                    <label className='label mb-1'>Laju Kuartalan (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input input-bordered w-full"
                      value={manualLajuKuartal}
                      onChange={(e) => setManualLajuKuartal(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </fieldset>
              {manualInputError && (
                <div role="alert" className="alert alert-error text-sm rounded-lg mb-4">
                  <span>{manualInputError}</span>
                </div>
              )}
              <button type="submit" className='btn btn-sm btn-outline btn-primary mt-4' disabled={isLoading}>
                {isLoading ? <span className="loading loading-spinner loading-sm"></span> : 'Tambah'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="collapse collapse-arrow bg-base-100 border border-base-300">
        <input type="radio" name="my-accordion-2" />
        <div className="collapse-title font-semibold">Upload .csv</div>
        <div className="collapse-content text-sm">
          <input
            type="file"
            id="csv-upload"
            accept=".csv"
            onChange={handleFileChange}
            className="file-input file-input-bordered w-full"
          />
          {selectedFile && (
            <p className="text-sm text-gray-500 mt-2">File terpilih: {selectedFile.name}</p>
          )}

          {parsedCsvData.length > 0 && (
            <div className="mt-4 p-3 bg-base-200 rounded-lg">
              <p className="text-sm font-medium">Data siap diupload:</p>
              <ul className="list-disc list-inside text-xs text-gray-600">
                <li>Jumlah baris: {parsedCsvData.length}</li>
                <li>Header: {Object.keys(parsedCsvData[0] || {}).join(', ')}</li>
              </ul>
            </div>
          )}

          <button
            onClick={handleUploadCsv}
            className="btn btn-primary btn-outline btn-sm mt-4 w-full"
            disabled={!selectedFile || parsedCsvData.length === 0 || isUploadingCsv}
          >
            {isUploadingCsv ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <Plus className='w-4 h-4' /> Upload CSV
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  )
}