'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { LogOut, Plus, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'

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
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Options for the 'Nama Pemda' select input
  // You can customize this list based on the actual local governments in Central Sulawesi
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

    setIsSubmitting(true) // Set loading to true before submission

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
      setIsSubmitting(false) // Always reset loading state
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

      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Tambah Data APBD</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      {/* Manual Input Form */}
      <div className="card bg-base-100 mx-auto">
        <form onSubmit={handleManualSubmit} className="space-y-4 p-6">
          <div className='text-sm'>
            <label className="label mb-2">
              <span className="label-text">Tanggal Cutoff</span>
            </label>
            <input
              type="date"
              name="tgl_cutoff"
              value={formData.tgl_cutoff}
              onChange={handleFormChange}
              className="input input-bordered w-full"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className='text-sm'>
            <label className="label mb-2">
              <span className="label-text">Nama Pemerintah Daerah</span>
            </label>
            <select
              className='select select-bordered w-full'
              name="nama_pemda"
              value={formData.nama_pemda}
              onChange={handleFormChange}
              required
              disabled={isSubmitting}
            >
              {namaPemdaOptions.map((item, i) => (
                <option key={i} value={item.value} disabled={item.value === ''}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className='text-sm'>
            <label className="label mb-2">
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
              disabled={isSubmitting}
            />
          </div>

          <div className='text-sm'>
            <label className="label mb-2">
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
              disabled={isSubmitting}
            />
          </div>

          <div className='text-sm'>
            <label className="label mb-2">
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
              disabled={isSubmitting}
            />
          </div>

          <div className='text-sm'>
            <label className="label mb-2">
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
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className={`btn btn-primary w-full mt-4`}
            disabled={isSubmitting}
          >
            {isSubmitting ? <span className="loading loading-spinner loading-sm"></span>: <><Save className="w-5 h-5 mr-2"/> Simpan Data</>}
          </button>
        </form>
      </div>
    </main>
  )
}