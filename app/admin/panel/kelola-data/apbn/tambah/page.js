'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { LogOut, Plus, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'

export default function AdminPanelAddDataAPBN() {
  const [loginInfo, setLoginInfo] = useState(null)
  const [formData, setFormData] = useState({
    tgl_cutoff: '',
    p_pajak: '',
    p_beacukai: '',
    p_pnbp_lain: '',
    p_blu: '',
    b_pegawai: '',
    b_barang: '',
    b_modal: '',
    b_bansos: '',
    b_dbh: '',
    b_dakfisik: '',
    b_daknonfisik: '',
    b_dau: '',
    b_infis: '',
    b_danadesa: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      'tgl_cutoff', 'p_pajak', 'p_beacukai', 'p_pnbp_lain', 'p_blu',
      'b_pegawai', 'b_barang', 'b_modal', 'b_bansos', 'b_dbh',
      'b_dakfisik', 'b_daknonfisik', 'b_dau', 'b_infis', 'b_danadesa'
    ];

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
      // Convert all numerical fields to numbers
      const dataToInsert = {
        tgl_cutoff: formData.tgl_cutoff, // Date string
        p_pajak: parseFloat(formData.p_pajak),
        p_beacukai: parseFloat(formData.p_beacukai),
        p_pnbp_lain: parseFloat(formData.p_pnbp_lain),
        p_blu: parseFloat(formData.p_blu),
        b_pegawai: parseFloat(formData.b_pegawai),
        b_barang: parseFloat(formData.b_barang),
        b_modal: parseFloat(formData.b_modal),
        b_bansos: parseFloat(formData.b_bansos),
        b_dbh: parseFloat(formData.b_dbh),
        b_dakfisik: parseFloat(formData.b_dakfisik),
        b_daknonfisik: parseFloat(formData.b_daknonfisik),
        b_dau: parseFloat(formData.b_dau),
        b_infis: parseFloat(formData.b_infis),
        b_danadesa: parseFloat(formData.b_danadesa),
        // 'pendapatan' and 'belanja' are calculated on the client-side for display,
        // not directly inserted here unless your DB schema requires it.
        // If your database calculates them automatically or they are not required on insert,
        // you don't need to send them.
      };

      const { data, error } = await supabase
        .from('fiskal_apbn')
        .insert([dataToInsert])
        .select(); // Use .select() to get the inserted data back

      if (error) {
        throw error;
      }

      toast.custom((t) => (
        <ToastTemplate t={t} type='success' title='Data APBN Berhasil Ditambahkan!' description={`Record untuk tanggal ${data[0].tgl_cutoff} telah ditambahkan.`} />
      ));

      // Clear form after successful submission
      setFormData({
        tgl_cutoff: '',
        p_pajak: '',
        p_beacukai: '',
        p_pnbp_lain: '',
        p_blu: '',
        b_pegawai: '',
        b_barang: '',
        b_modal: '',
        b_bansos: '',
        b_dbh: '',
        b_dakfisik: '',
        b_daknonfisik: '',
        b_dau: '',
        b_infis: '',
        b_danadesa: '',
      });

    } catch (error) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Gagal Menambah Data' description={error.message || 'Terjadi kesalahan saat menyimpan data.'} />
      ));
      console.error('Error inserting APBN data:', error);
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
          <li><Link href="/admin/panel/kelola-data/apbn">APBN</Link></li>
          <li><Link href="#">Tambah</Link></li>
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Tambah Data APBN</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      {/* Manual Input Form */}
      <div className="card bg-base-100 mx-auto w-full"> {/* Increased max-width for better layout of many fields */}
        <form onSubmit={handleManualSubmit} className="space-y-4 p-6"> {/* Added padding to form */}
          <div className='text-sm'>
            <label className="label mb-2">
              <span className="label-text">Tanggal Cutoff</span>
            </label>
            <input
              type="date" // Use type="date" for full date picker
              name="tgl_cutoff"
              value={formData.tgl_cutoff}
              onChange={handleFormChange}
              className="input input-bordered w-full"
              required
              disabled={isSubmitting}
            />
          </div>

          <h4 className="text-md font-semibold mt-6 mb-2">Pendapatan Negara</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className='text-sm'>
              <label className="label mb-2">
                <span className="label-text">Pajak (Rp)</span>
              </label>
              <input
                type="number"
                name="p_pajak"
                value={formData.p_pajak}
                onChange={handleFormChange}
                placeholder="Ex: 712091242719"
                step="any" // Allows decimal if needed, though usually integers for large sums
                className="input input-bordered w-full"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className='text-sm'>
              <label className="label mb-2">
                <span className="label-text">Bea Cukai (Rp)</span>
              </label>
              <input
                type="number"
                name="p_beacukai"
                value={formData.p_beacukai}
                onChange={handleFormChange}
                placeholder="Ex: 65476096000"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className='text-sm'>
              <label className="label mb-2">
                <span className="label-text">PNBP Lain (Rp)</span>
              </label>
              <input
                type="number"
                name="p_pnbp_lain"
                value={formData.p_pnbp_lain}
                onChange={handleFormChange}
                placeholder="Ex: 45167956288"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className='text-sm'>
              <label className="label mb-2">
                <span className="label-text">BLU (Rp)</span>
              </label>
              <input
                type="number"
                name="p_blu"
                value={formData.p_blu}
                onChange={handleFormChange}
                placeholder="Ex: 199860802"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <h4 className="text-md font-semibold mt-6 mb-2">Belanja Negara</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className='text-sm'>
              <label className="label mb-2">
                <span className="label-text">Belanja Pegawai (Rp)</span>
              </label>
              <input
                type="number"
                name="b_pegawai"
                value={formData.b_pegawai}
                onChange={handleFormChange}
                placeholder="Ex: 134237884179"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className='text-sm'>
              <label className="label mb-2">
                <span className="label-text">Belanja Barang (Rp)</span>
              </label>
              <input
                type="number"
                name="b_barang"
                value={formData.b_barang}
                onChange={handleFormChange}
                placeholder="Ex: 57671779166"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className='text-sm'>
              <label className="label mb-2">
                <span className="label-text">Belanja Modal (Rp)</span>
              </label>
              <input
                type="number"
                name="b_modal"
                value={formData.b_modal}
                onChange={handleFormChange}
                placeholder="Ex: 26952163161"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className='text-sm'>
              <label className="label mb-2">
                <span className="label-text">Belanja Bansos (Rp)</span>
              </label>
              <input
                type="number"
                name="b_bansos"
                value={formData.b_bansos}
                onChange={handleFormChange}
                placeholder="Ex: 0"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className='text-sm'>
              <label className="label mb-2">
                <span className="label-text">Dana Bagi Hasil (DBH) (Rp)</span>
              </label>
              <input
                type="number"
                name="b_dbh"
                value={formData.b_dbh}
                onChange={handleFormChange}
                placeholder="Ex: 230298491950"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className='text-sm'>
              <label className="label mb-2">
                <span className="label-text">DAK Fisik (Rp)</span>
              </label>
              <input
                type="number"
                name="b_dakfisik"
                value={formData.b_dakfisik}
                onChange={handleFormChange}
                placeholder="Ex: 0"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className='text-sm'>
              <label className="label mb-2">
                <span className="label-text">DAK Non-Fisik (Rp)</span>
              </label>
              <input
                type="number"
                name="b_daknonfisik"
                value={formData.b_daknonfisik}
                onChange={handleFormChange}
                placeholder="Ex: 0"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className='text-sm'>
              <label className="label mb-2">
                <span className="label-text">DAU (Rp)</span>
              </label>
              <input
                type="number"
                name="b_dau"
                value={formData.b_dau}
                onChange={handleFormChange}
                placeholder="Ex: 1000462110000"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className='text-sm'>
              <label className="label mb-2">
                <span className="label-text">Dana Transfer Lainnya (Rp)</span>
              </label>
              <input
                type="number"
                name="b_infis"
                value={formData.b_infis}
                onChange={handleFormChange}
                placeholder="Ex: 0"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className='text-sm'>
              <label className="label mb-2">
                <span className="label-text">Dana Desa (Rp)</span>
              </label>
              <input
                type="number"
                name="b_danadesa"
                value={formData.b_danadesa}
                onChange={handleFormChange}
                placeholder="Ex: 0"
                step="any"
                className="input input-bordered w-full"
                required
                disabled={isSubmitting}
              />
            </div>
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