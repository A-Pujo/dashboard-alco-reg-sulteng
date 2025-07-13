'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { LogOut, Plus, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'

export default function AdminPanelAddDataInflasi() {
  const [loginInfo, setLoginInfo] = useState(null)
  const [formData, setFormData] = useState({
    daerah: '', // Initialize with empty string for select placeholder
    waktu: '',
    inflasi_bulanan: '',
    inflasi_tahunan: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false) // New state for submission loading

  // Options for the 'Daerah' select input
  const daerahOption = [
    { value: '', label: 'Pilih Daerah' }, // Added a default placeholder option
    { value: 'Sulawesi Tengah', label: 'Provinsi Sulawesi Tengah' },
    { value: 'Palu', label: 'Palu' },
    { value: 'Luwuk', label: 'Luwuk' },
    { value: 'Morowali', label: 'Morowali' },
    { value: 'Tolitoli', label: 'Tolitoli' },
    { value: 'Nasional', label: 'Nasional' },
  ];

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

    // Basic validation
    if (!formData.daerah || !formData.waktu || formData.inflasi_bulanan === '' || formData.inflasi_tahunan === '') {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Validasi Gagal' description='Semua bidang wajib diisi!' />
      ))
      return
    }

    setIsSubmitting(true); // Set loading to true before submission

    try {
      // Convert numerical fields to numbers
      const dataToInsert = {
        ...formData,
        inflasi_bulanan: parseFloat(formData.inflasi_bulanan),
        inflasi_tahunan: parseFloat(formData.inflasi_tahunan),
      }

      const { data, error } = await supabase
        .from('inflasi')
        .insert([dataToInsert])
        .select()

      if (error) {
        throw error
      }

      toast.custom((t) => (
        <ToastTemplate t={t} type='success' title='Data Inflasi Berhasil Ditambahkan!' description={`Record untuk ${data[0].daerah} (${data[0].waktu}) telah ditambahkan.`} />
      ))

      // Clear form after successful submission
      setFormData({
        daerah: '', // Reset to empty string for select
        waktu: '',
        inflasi_bulanan: '',
        inflasi_tahunan: '',
      })

    } catch (error) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Gagal Menambah Data' description={error.message || 'Terjadi kesalahan saat menyimpan data.'} />
      ))
      console.error('Error inserting inflasi data:', error)
    } finally {
      setIsSubmitting(false); // Always set loading to false after submission (success or failure)
    }
  }

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
          <li><Link href="/admin/panel/kelola-data/inflasi">Inflasi</Link></li>
          <li><Link href="#">Tambah</Link></li>
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Tambah Data Inflasi</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      {/* Manual Input Form */}
      <div className="card bg-base-100 py-1 mx-auto">
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className='text-sm'>
            <label className="label mb-2">
              <span className="label-text">Daerah</span>
            </label>
            <select
              className='select select-bordered w-full'
              name="daerah"
              value={formData.daerah}
              onChange={handleFormChange}
              required
              disabled={isSubmitting} // Disable select during submission
            >
              {daerahOption.map((item, i) => {
                return <option key={i} value={item.value} disabled={item.value === ''}>{item.label}</option>
              })}
            </select>
          </div>
          <div className='text-sm'>
            <label className="label mb-2">
              <span className="label-text">Waktu</span>
            </label>
            <input
              type="date"
              name="waktu"
              value={formData.waktu}
              onChange={handleFormChange}
              className="input input-bordered w-full"
              required
              disabled={isSubmitting} // Disable input during submission
            />
          </div>
          <div className='text-sm'>
            <label className="label mb-2">
              <span className="label-text">Inflasi Bulanan (%)</span>
            </label>
            <input
              type="number"
              name="inflasi_bulanan"
              value={formData.inflasi_bulanan}
              onChange={handleFormChange}
              placeholder="Ex: 0.2"
              step="0.01"
              className="input input-bordered w-full"
              required
              disabled={isSubmitting} // Disable input during submission
            />
          </div>
          <div className='text-sm'>
            <label className="label mb-2">
              <span className="label-text">Inflasi Tahunan (%)</span>
            </label>
            <input
              type="number"
              name="inflasi_tahunan"
              value={formData.inflasi_tahunan}
              onChange={handleFormChange}
              placeholder="Ex: 2.5"
              step="0.01"
              className="input input-bordered w-full"
              required
              disabled={isSubmitting} // Disable input during submission
            />
          </div>
          <button
            type="submit"
            className={`btn btn-primary w-full mt-4`}
            disabled={isSubmitting} // Disable button when submitting
          >
            {isSubmitting ? <span className="loading loading-spinner loading-sm"></span>: <><Save className="w-5 h-5 mr-2"/> Simpan Data</>}
          </button>
        </form>
      </div>
    </main>
  )
}