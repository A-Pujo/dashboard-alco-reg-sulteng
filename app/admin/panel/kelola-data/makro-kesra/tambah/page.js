// /kelola-data/makro-kesra/tambah/page.js
'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { LogOut, Plus, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'

export default function AdminPanelAddDataMakroKesra() {
  const [loginInfo, setLoginInfo] = useState(null)
  const [formData, setFormData] = useState({
    waktu: '',
    indikator: '',
    value: '',
    unit: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Predefined options for indicators and units
  const indicatorOptions = [
    { value: '', label: 'Pilih Indikator' },
    { value: 'tingkat_kemiskinan', label: 'Tingkat Kemiskinan' },
    { value: 'tingkat_pengangguran', label: 'Tingkat Pengangguran Terbuka (TPT)' },
    { value: 'tpk_hotel', label: 'Tingkat Penghunian Kamar (TPK) Hotel' },
    { value: 'ntp', label: 'Nilai Tukar Petani (NTP)' },
    { value: 'ntn', label: 'Nilai Tukar Nelayan (NTN)' },
    { value: 'penumpang_laut', label: 'Penumpang Angkutan Laut' },
    { value: 'penumpang_udara', label: 'Penumpang Angkutan Udara' },
  ];

  const unitOptions = [
    { value: '', label: 'Pilih Unit' },
    { value: '%', label: '%' },
    { value: 'poin', label: 'poin' },
    { value: 'jiwa', label: 'jiwa' },
    { value: 'unit', label: 'unit' }, // Add other relevant units if needed
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
      redirect('/admin', RedirectType.replace);
    }, 500);
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()

    // Basic validation: Check if all fields are filled
    const requiredFields = ['waktu', 'indikator', 'value', 'unit'];

    for (const field of requiredFields) {
      if (formData[field] === '') {
        toast.custom((t) => (
          <ToastTemplate t={t} type='error' title='Validasi Gagal' description={`Bidang '${field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}' wajib diisi!`} />
        ));
        return;
      }
    }

    setIsSubmitting(true); // Set loading to true before submission

    try {
      const dataToInsert = {
        waktu: formData.waktu,
        indikator: formData.indikator,
        value: parseFloat(formData.value), // Ensure value is a number
        unit: formData.unit,
      };

      const { data, error } = await supabase
        .from('makro_kesra_indicators') // Target the 'makro_kesra_indicators' table
        .insert([dataToInsert])
        .select(); // Use .select() to get the inserted data back

      if (error) {
        // Handle unique constraint error specifically if needed
        if (error.code === '23505') { // PostgreSQL unique violation error code
            throw new Error(`Data untuk indikator '${formData.indikator}' pada tanggal '${formData.waktu}' sudah ada. Silakan edit data yang sudah ada atau pilih tanggal/indikator yang berbeda.`);
        }
        throw error;
      }

      toast.custom((t) => (
        <ToastTemplate t={t} type='success' title='Data Makro-Kesra Berhasil Ditambahkan!' description={`Indikator '${data[0].indikator}' (${data[0].value} ${data[0].unit}) pada tanggal ${data[0].waktu} telah ditambahkan.`} />
      ));

      // Clear form after successful submission
      setFormData({
        waktu: '',
        indikator: '',
        value: '',
        unit: '',
      });

    } catch (error) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Gagal Menambah Data' description={error.message || 'Terjadi kesalahan saat menyimpan data.'} />
      ));
      console.error('Error inserting Makro-Kesra data:', error);
    } finally {
      setIsSubmitting(false); // Always reset loading state
    }
  };

  // Conditional rendering for login check
  if (loginInfo === null) {
    return (
      <main className="flex-1 flex items-center justify-center min-h-screen bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <Toaster position="bottom-right" reverseOrder={false} />
      <div className="breadcrumbs text-sm">
        <ul>
          <li><Link href="/admin/panel">Beranda</Link></li>
          <li><Link href="/admin/panel/kelola-data">Pengelolaan Data</Link></li>
          <li><Link href="/admin/panel/kelola-data/makro-kesra">Makro-Kesra</Link></li>
          <li><Link href="#">Tambah</Link></li>
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Tambah Data Makro-Kesra</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      {/* Manual Input Form */}
      <div className="card bg-base-100 py-1 mx-auto w-full">
        <form onSubmit={handleManualSubmit} className="space-y-4 p-6">
          <div className='text-sm'>
            <label className="label mb-2">
              <span className="label-text">Waktu (Tanggal Cutoff)</span>
            </label>
            <input
              type="date"
              name="waktu"
              value={formData.waktu}
              onChange={handleFormChange}
              className="input input-bordered w-full"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className='text-sm'>
            <label className="label mb-2">
              <span className="label-text">Indikator</span>
            </label>
            <select
              className='select select-bordered w-full'
              name="indikator"
              value={formData.indikator}
              onChange={handleFormChange}
              required
              disabled={isSubmitting}
            >
              {indicatorOptions.map((option) => (
                <option key={option.value} value={option.value} disabled={option.value === ''}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className='text-sm'>
            <label className="label mb-2">
              <span className="label-text">Nilai</span>
            </label>
            <input
              type="number"
              name="value"
              value={formData.value}
              onChange={handleFormChange}
              placeholder="Ex: 7.50, 150000"
              step="any" // Allows decimal values
              className="input input-bordered w-full"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className='text-sm'>
            <label className="label mb-2">
              <span className="label-text">Unit</span>
            </label>
            <select
              className='select select-bordered w-full'
              name="unit"
              value={formData.unit}
              onChange={handleFormChange}
              required
              disabled={isSubmitting}
            >
              {unitOptions.map((option) => (
                <option key={option.value} value={option.value} disabled={option.value === ''}>
                  {option.label}
                </option>
              ))}
            </select>
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
  );
}