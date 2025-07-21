'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { LogOut, Plus, Save, UploadCloud, ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useCallback, useEffect, useState, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import Papa from 'papaparse' // Import PapaParse for CSV parsing

export default function AdminPanelAddDataAPBD() {
  const [loginInfo, setLoginInfo] = useState(null)
  const [formData, setFormData] = useState({
    tgl_cutoff: '',
    nama_pemda: '', // For the select input
    pendapatan: '',
    belanja: '',
    pembiayaan: '',
    SILPA: '',
  })
  const [isSubmittingManual, setIsSubmittingManual] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploadingCSV, setIsUploadingCSV] = useState(false)
  const fileInputRef = useRef(null)

  // Options for the 'Nama Pemda' select input
  const namaPemdaOptions = [
    { value: '', label: 'Pilih Nama Pemerintah Daerah' },
    { value: 'Provinsi Sulawesi Tengah', label: 'Provinsi Sulawesi Tengah' },
    { value: 'Kabupaten Banggai', label: 'Kabupaten Banggai' },
    { value: 'Kabupaten Buol', label: 'Kabupaten Buol' },
    { value: 'Kabupaten Donggala', label: 'Kabupaten Donggala' },
    { value: 'Kabupaten Morowali', label: 'Kabupaten Morowali' },
    { value: 'Kabupaten Parigi Moutong', label: 'Kabupaten Parigi Moutong' },
    { value: 'Kabupaten Poso', label: 'Kabupaten Poso' },
    { value: 'Kabupaten Sigi', label: 'Kabupaten Sigi' },
    { value: 'Kabupaten Tojo Una-Una', label: 'Kabupaten Tojo Una-Una' },
    { value: 'Kabupaten Toli-Toli', label: 'Kabupaten Toli-Toli' },
    { value: 'Kabupaten Morowali Utara', label: 'Kabupaten Morowali Utara' },
    { value: 'Kabupaten Banggai Kepulauan', label: 'Kabupaten Banggai Kepulauan' },
    { value: 'Kabupaten Banggai Laut', label: 'Kabupaten Banggai Laut' },
    { value: 'Kota Palu', label: 'Kota Palu' },
  ]

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

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()

    // Basic validation: Check if all fields are filled
    const requiredFields = [
      'tgl_cutoff', 'nama_pemda', 'pendapatan', 'belanja', 'pembiayaan', 'SILPA'
    ]

    for (const field of requiredFields) {
      if (formData[field] === '') {
        toast.custom((t) => (
          <ToastTemplate t={t} type='error' title='Validasi Gagal' description={`Bidang '${field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}' wajib diisi!`} />
        ))
        return
      }
    }

    setIsSubmittingManual(true) // Set loading to true before submission

    try {
      // Convert numerical fields to numbers
      const dataToInsert = {
        tgl_cutoff: formData.tgl_cutoff, // Date string
        nama_pemda: formData.nama_pemda,
        pendapatan: parseFloat(formData.pendapatan),
        belanja: parseFloat(formData.belanja),
        pembiayaan: parseFloat(formData.pembiayaan),
        SILPA: parseFloat(formData.SILPA),
      }

      const { data, error } = await supabase
        .from('fiskal_pemda') // Target the 'fiskal_pemda' table
        .insert([dataToInsert])
        .select() // Use .select() to get the inserted data back

      if (error) {
        throw error
      }

      toast.custom((t) => (
        <ToastTemplate t={t} type='success' title='Data APBD Berhasil Ditambahkan!' description={`Record untuk ${data[0].nama_pemda} (${data[0].tgl_cutoff}) telah ditambahkan.`} />
      ))

      // Clear form after successful submission
      setFormData({
        tgl_cutoff: '',
        nama_pemda: '', // Reset to empty string for select
        pendapatan: '',
        belanja: '',
        pembiayaan: '',
        SILPA: '',
      })

    } catch (error) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Gagal Menambah Data' description={error.message || 'Terjadi kesalahan saat menyimpan data.'} />
      ))
      console.error('Error inserting APBD data:', error)
    } finally {
      setIsSubmittingManual(false) // Always reset loading state
    }
  }

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0])
    } else {
      setSelectedFile(null)
    }
  }

  const handleUploadCSV = async () => {
    if (!selectedFile) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Pilih File' description='Mohon pilih file CSV terlebih dahulu.' />
      ))
      return
    }

    setIsUploadingCSV(true)
    let successfulUploads = 0
    let failedUploads = 0
    let totalRecords = 0

    try {
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
              setIsUploadingCSV(false)
              resolve()
              return
            }

            // Validate headers
            const expectedHeaders = [
              'tgl_cutoff', 'nama_pemda', 'pendapatan', 'belanja', 'pembiayaan', 'SILPA'
            ]
            const actualHeaders = results.meta.fields
            const missingHeaders = expectedHeaders.filter(header => !actualHeaders.includes(header))

            if (missingHeaders.length > 0) {
              toast.custom((t) => (
                <ToastTemplate t={t} type='error' title='Header CSV Tidak Lengkap' description={`Header yang hilang: ${missingHeaders.join(', ')}. Pastikan semua kolom ada.`} />
              ))
              setIsUploadingCSV(false)
              reject(new Error('Missing CSV headers'))
              return
            }

            // Batch inserts for performance
            const batchSize = 1000 // Adjust based on Supabase limits and performance needs
            for (let i = 0; i < totalRecords; i += batchSize) {
              const batch = dataToUpload.slice(i, i + batchSize)

              // Map CSV data to match Supabase table column names (case-sensitive)
              const formattedBatch = batch.map(row => ({
                tgl_cutoff: row.tgl_cutoff,
                nama_pemda: row.nama_pemda,
                pendapatan: parseFloat(row.pendapatan) || 0,
                belanja: parseFloat(row.belanja) || 0,
                pembiayaan: parseFloat(row.pembiayaan) || 0,
                SILPA: parseFloat(row.SILPA) || 0,
              }))

              // Upsert operation to prevent duplicates and update existing data
              const { error: upsertError } = await supabase
                .from('fiskal_pemda')
                .upsert(formattedBatch, {
                  onConflict: 'tgl_cutoff,nama_pemda', // Unique key for upsert
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
            setIsUploadingCSV(false)
            reject(err)
          },
        })
      })
    } catch (err) {
      console.error('Upload process error:', err)
      setIsUploadingCSV(false)
    } finally {
      setIsUploadingCSV(false)
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
          <li><Link href="/admin/panel/kelola-data/apbd">APBD</Link></li>
          <li><Link href="#">Tambah</Link></li>
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4 items-center'>
        <h2 className='flex-1 text-xl font-bold'>Tambah Data APBD</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      <div className="collapse collapse-arrow bg-base-100 border border-base-300">
        <input type="radio" name="my-accordion-2" defaultChecked />
        <div className="collapse-title font-semibold">Manual Entry</div>
        <div className="collapse-content text-sm">
          <form onSubmit={handleManualSubmit} className="space-y-4 p-4">
            <div className='text-sm'>
              <label className="label">
                <span className="label-text">Tanggal Cutoff</span>
              </label>
              <input
                type="date"
                name="tgl_cutoff"
                value={formData.tgl_cutoff}
                onChange={handleFormChange}
                className="input input-bordered w-full"
                required
                disabled={isSubmittingManual}
              />
            </div>

            <div className='text-sm'>
              <label className="label">
                <span className="label-text">Nama Pemerintah Daerah</span>
              </label>
              <select
                className='select select-bordered w-full'
                name="nama_pemda"
                value={formData.nama_pemda}
                onChange={handleFormChange}
                required
                disabled={isSubmittingManual}
              >
                {namaPemdaOptions.map((item, i) => (
                  <option key={i} value={item.value} disabled={item.value === ''}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className='text-sm'>
              <label className="label">
                <span className="label-text">Pendapatan (Rp)</span>
              </label>
              <input
                type="number"
                name="pendapatan"
                value={formData.pendapatan}
                onChange={handleFormChange}
                placeholder="Ex: 1234567890"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmittingManual}
              />
            </div>

            <div className='text-sm'>
              <label className="label">
                <span className="label-text">Belanja (Rp)</span>
              </label>
              <input
                type="number"
                name="belanja"
                value={formData.belanja}
                onChange={handleFormChange}
                placeholder="Ex: 9876543210"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmittingManual}
              />
            </div>

            <div className='text-sm'>
              <label className="label">
                <span className="label-text">Pembiayaan Netto (Rp)</span>
              </label>
              <input
                type="number"
                name="pembiayaan"
                value={formData.pembiayaan}
                onChange={handleFormChange}
                placeholder="Ex: 100000000"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmittingManual}
              />
            </div>

            <div className='text-sm'>
              <label className="label">
                <span className="label-text">SILPA (Rp)</span>
              </label>
              <input
                type="number"
                name="SILPA"
                value={formData.SILPA}
                onChange={handleFormChange}
                placeholder="Ex: 50000000"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmittingManual}
              />
            </div>

            <button
              type="submit"
              className={`btn btn-primary w-full mt-4`}
              disabled={isSubmittingManual}
            >
              {isSubmittingManual ? <span className="loading loading-spinner loading-sm"></span>: <><Save className="w-5 h-5 mr-2"/> Simpan Data Manual</>}
            </button>
          </form>
        </div>
      </div>
      <div className="collapse collapse-arrow bg-base-100 border border-base-300">
        <input type="radio" name="my-accordion-2" />
        <div className="collapse-title font-semibold">CSV Upload</div>
        <div className="collapse-content text-sm">
          <div className="p-4">
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Pilih File CSV APBD</span>
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileChange}
                className="file-input file-input-bordered w-full"
                disabled={isUploadingCSV}
                required
              />
              {selectedFile && (
                <div className="text-sm text-gray-500 mt-2">
                  File terpilih: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </div>
              )}
            </div>

            <button
              onClick={handleUploadCSV}
              className={`btn btn-secondary w-full`}
              disabled={isUploadingCSV || !selectedFile}
            >
              {isUploadingCSV ? <span className="loading loading-spinner loading-sm"></span> : <><UploadCloud className="w-5 h-5 mr-2"/> Unggah CSV</>}
            </button>

            <div className="mt-6 p-4 bg-base-200 rounded-lg text-sm text-gray-700">
              <h4 className="font-semibold mb-2 flex items-center"><FileText className="w-4 h-4 mr-2"/> Format CSV yang Diharapkan:</h4>
              <p className="mb-1">Pastikan file CSV Anda memiliki header berikut (case-sensitive):</p>
              <ul className="list-disc list-inside ml-4">
                <li>`tgl_cutoff` (Tanggal Cutoff, format YYYY-MM-DD, contoh: 2024-12-31)</li>
                <li>`nama_pemda` (Nama Pemerintah Daerah, sesuai dengan opsi di atas)</li>
                <li>`pendapatan` (Pendapatan, FLOAT)</li>
                <li>`belanja` (Belanja, FLOAT)</li>
                <li>`pembiayaan` (Pembiayaan Netto, FLOAT)</li>
                <li>`SILPA` (SILPA, FLOAT)</li>
              </ul>
              <p className="mt-2">Setiap baris di CSV akan menjadi satu record data APBD.</p>
              <p className="mt-2">Jika ada record dengan kombinasi `tgl_cutoff` dan `nama_pemda` yang sama, data yang ada akan diperbarui.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}