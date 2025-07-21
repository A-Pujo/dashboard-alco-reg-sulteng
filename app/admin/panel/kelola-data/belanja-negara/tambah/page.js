'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { LogOut, UploadCloud, ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useCallback, useEffect, useState, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import Papa from 'papaparse' // Import PapaParse for CSV parsing

export default function AdminPanelUploadBelanjaNegara() {
  const [loginInfo, setLoginInfo] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [yearInput, setYearInput] = useState(new Date().getFullYear()) // Default to current year
  const [monthInput, setMonthInput] = useState(new Date().getMonth() + 1) // Default to current month (1-indexed)
  const fileInputRef = useRef(null)

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

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0])
    } else {
      setSelectedFile(null)
    }
  }

  const handleYearChange = (e) => {
    setYearInput(parseInt(e.target.value, 10))
  }

  const handleMonthChange = (e) => {
    setMonthInput(parseInt(e.target.value, 10))
  }

  // Helper function to get the last day of the month for a given year and month
  const getLastDayOfMonth = (year, month) => {
    // Month is 1-indexed for Date constructor
    // Setting day to 0 goes to the last day of the previous month
    return new Date(year, month, 0).toISOString() // Returns ISO 8601 string (e.g., "YYYY-MM-DDTHH:mm:ss.sssZ")
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Pilih File' description='Mohon pilih file CSV terlebih dahulu.' />
      ))
      return
    }

    if (!yearInput || !monthInput || isNaN(yearInput) || isNaN(monthInput) || monthInput < 1 || monthInput > 12) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Input Tidak Valid' description='Tahun dan Bulan harus diisi dengan angka yang benar.' />
      ))
      return
    }

    setIsUploading(true)
    let successfulUploads = 0
    let failedUploads = 0
    let totalRecords = 0

    try {
      // Calculate the 'waktu' date once for all records in this upload
      const waktuDate = getLastDayOfMonth(yearInput, monthInput)

      await new Promise((resolve, reject) => {
        Papa.parse(selectedFile, {
          header: true, // Assumes the first row contains headers
          skipEmptyLines: true,
          dynamicTyping: true, // Automatically convert numbers, booleans
          complete: async (results) => {
            const dataToUpload = results.data
            totalRecords = dataToUpload.length

            if (totalRecords === 0) {
              toast.custom((t) => (
                <ToastTemplate t={t} type='info' title='File Kosong' description='File CSV yang diunggah tidak memiliki data.' />
              ))
              setIsUploading(false)
              resolve()
              return
            }

            // Validate headers (THANG and BULAN are excluded from CSV headers now)
            const expectedHeaders = [
              'KDKABKOTA', 'NMKABKOTA', 'KDKPPN', 'NMKPPN', 'KDFUNGSI', 'NMFUNGSI',
              'KDSFUNG', 'NMSFUNG', 'JENBEL', 'NMGBKPK', 'PAGU_DIPA', 'REALISASI', 'BLOKIR'
            ]
            const actualHeaders = results.meta.fields
            const missingHeaders = expectedHeaders.filter(header => !actualHeaders.includes(header))

            if (missingHeaders.length > 0) {
              toast.custom((t) => (
                <ToastTemplate t={t} type='error' title='Header CSV Tidak Lengkap' description={`Header yang hilang: ${missingHeaders.join(', ')}. Pastikan semua kolom ada.`} />
              ))
              setIsUploading(false)
              reject(new Error('Missing CSV headers'))
              return
            }

            // Batch inserts for performance
            const batchSize = 1000 // Adjust based on Supabase limits and performance needs
            for (let i = 0; i < totalRecords; i += batchSize) {
              const batch = dataToUpload.slice(i, i + batchSize)

              // Map CSV data to match Supabase table column names (case-sensitive)
              // THANG, BULAN, and WAKTU are now taken from form inputs/calculated
              const formattedBatch = batch.map(row => ({
                THANG: yearInput, // From form input
                BULAN: monthInput, // From form input
                waktu: waktuDate, // New: Calculated last day of the month
                KDKABKOTA: row.KDKABKOTA,
                NMKABKOTA: row.NMKABKOTA,
                KDKPPN: row.KDKPPN,
                NMKPPN: row.NMKPPN,
                KDFUNGSI: row.KDFUNGSI,
                NMFUNGSI: row.NMFUNGSI,
                KDSFUNG: row.KDSFUNG,
                NMSFUNG: row.NMSFUNG,
                JENBEL: row.JENBEL,
                NMGBKPK: row.NMGBKPK,
                PAGU_DIPA: parseFloat(row.PAGU_DIPA) || 0, // Ensure float, default to 0
                REALISASI: parseFloat(row.REALISASI) || 0, // Ensure float, default to 0
                BLOKIR: parseFloat(row.BLOKIR) || 0,       // Ensure float, default to 0
              }))

              // Upsert operation
              const { error: upsertError } = await supabase
                .from('rincian_belanja_negara')
                .upsert(formattedBatch, {
                  // Ensure 'waktu' is NOT part of the onConflict key unless it's truly part of your unique identifier
                  // The unique key for rincian_belanja_negara table should define a unique transaction/record,
                  // not a point in time, as multiple transactions can occur on the same day.
                  // For now, keeping the original onConflict key. If 'waktu' is a unique identifier,
                  // it should be added to the Supabase table's UNIQUE constraint too.
                  onConflict: 'THANG,BULAN,KDKABKOTA,KDKPPN,KDFUNGSI,KDSFUNG,JENBEL', // Columns forming the unique key
                  ignoreDuplicates: false, // Set to false to update existing
                })

              if (upsertError) {
                console.error('Batch upsert error:', upsertError)
                failedUploads += batch.length // Count all in batch as failed if batch fails
                toast.custom((t) => (
                  <ToastTemplate t={t} type='error' title='Gagal Unggah Batch' description={`Batch gagal diunggah: ${upsertError.message}`} />
                ))
              } else {
                successfulUploads += batch.length
              }
            }

            toast.custom((t) => (
              <ToastTemplate
                t={t}
                type='success'
                title='Unggah CSV Selesai!'
                description={`Total: ${totalRecords}, Berhasil: ${successfulUploads}, Gagal: ${failedUploads}`}
              />
            ), { duration: 5000 })

            setSelectedFile(null) // Clear selected file
            if (fileInputRef.current) {
              fileInputRef.current.value = '' // Clear file input visually
            }
            resolve()
          },
          error: (err) => {
            console.error('CSV parsing error:', err)
            toast.custom((t) => (
              <ToastTemplate t={t} type='error' title='Kesalahan Parsing CSV' description={err.message} />
            ))
            setIsUploading(false)
            reject(err)
          },
        })
      })
    } catch (err) {
      console.error('Upload process error:', err)
      setIsUploading(false)
    } finally {
      setIsUploading(false)
    }
  }

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
          <li><Link href="#">Unggah CSV</Link></li>
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4 items-center'>
        <h2 className='flex-1 text-xl font-bold'>Unggah Data Belanja Negara (CSV)</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      <div className="card bg-base-100 mx-auto w-full">
        <div className="card-body">
          {/* Year and Month Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="form-control">
              <label className="label mb-1">
                <span className="label-text">Tahun Data (THANG) <span className="text-red-500">*</span></span>
              </label>
              <input
                type="number"
                value={yearInput}
                onChange={handleYearChange}
                min="2000" // Example min year
                max={new Date().getFullYear() + 5} // Example max year
                placeholder="e.g., 2024"
                className="input input-bordered w-full"
                disabled={isUploading}
                required
              />
            </div>
            <div className="form-control">
              <label className="label mb-1">
                <span className="label-text">Bulan Data (BULAN) <span className="text-red-500">*</span></span>
              </label>
              <input
                type="number"
                value={monthInput}
                onChange={handleMonthChange}
                min="1"
                max="12"
                placeholder="e.g., 7"
                className="input input-bordered w-full"
                disabled={isUploading}
                required
              />
            </div>
          </div>

          {/* CSV File Input */}
          <div className="form-control mb-4">
            <label className="label mb-1">
              <span className="label-text">Pilih File CSV Belanja Negara <span className="text-red-500">*</span></span>
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileChange}
              className="file-input file-input-bordered w-full"
              disabled={isUploading}
              required
            />
            {selectedFile && (
              <div className="text-sm text-gray-500 mt-2">
                File terpilih: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
              </div>
            )}
          </div>

          <button
            onClick={handleUpload}
            className={`btn btn-primary w-full`}
            disabled={isUploading || !selectedFile || !yearInput || !monthInput}
          >
            {isUploading ? <span className="loading loading-spinner loading-sm"></span> : <><UploadCloud className="w-5 h-5 mr-2"/> Unggah Data</>}
          </button>

          <div className="mt-6 p-4 bg-base-200 rounded-lg text-sm text-gray-700">
            <h4 className="font-semibold mb-2 flex items-center"><FileText className="w-4 h-4 mr-2"/> Format CSV yang Diharapkan:</h4>
            <ul className="list-disc list-inside ml-4">
              <li>`KDKABKOTA` (Kode Kab/Kota, TEXT)</li>
              <li>`NMKABKOTA` (Nama Kab/Kota, TEXT)</li>
              <li>`KDKPPN` (Kode KPPN, TEXT)</li>
              <li>`NMKPPN` (Nama KPPN, TEXT)</li>
              <li>`KDFUNGSI` (Kode Fungsi, TEXT)</li>
              <li>`NMFUNGSI` (Nama Fungsi, TEXT)</li>
              <li>`KDSFUNG` (Kode Sub-Fungsi, TEXT)</li>
              <li>`NMSFUNG` (Nama Sub-Fungsi, TEXT)</li>
              <li>`JENBEL` (Jenis Belanja, TEXT)</li>
              <li>`NMGBKPK` (Nama Gabungan Kode Belanja, TEXT)</li>
              <li>`PAGU_DIPA` (Pagu DIPA, FLOAT)</li>
              <li>`REALISASI` (Realisasi, FLOAT)</li>
              <li>`BLOKIR` (Blokir, FLOAT)</li>
            </ul>
            <p className="mt-2">Setiap baris di CSV akan dihubungkan dengan Tahun, Bulan, dan tanggal terakhir dari Bulan yang Anda masukkan di form ini (`waktu`).</p>
            <p className="mt-2">Jika ada record dengan kombinasi `THANG`, `BULAN`, `KDKABKOTA`, `KDKPPN`, `KDFUNGSI`, `KDSFUNG`, `JENBEL` yang sama, data yang ada akan diperbarui.</p>
          </div>
        </div>
      </div>
    </main>
  )
}