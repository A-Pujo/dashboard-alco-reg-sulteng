'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { LogOut, Plus, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'

export default function AdminPanelAddAnalisisTematik() {
    const [loginInfo, setLoginInfo] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Initialize formData with default values.
    // nama_publisher and unit_publisher will be updated by a useEffect once loginInfo is available.
    const [formData, setFormData] = useState({
        tgl_publish: '',
        judul: '',
        deskripsi: '',
        file_url: '',
        nama_publisher: '', // Will be set from loginInfo
        unit_publisher: '', // Will be set from loginInfo
    })

    // Authentication check and initial loginInfo setup
    useEffect(() => {
        const logInf = JSON.parse(sessionStorage.getItem('loginInfo'))
        if (!logInf) {
            redirect('/admin', RedirectType.replace)
        } else {
            setLoginInfo(logInf)
        }
    }, [])

    // Effect to set nama_publisher and unit_publisher from loginInfo
    useEffect(() => {
        if (loginInfo) {
            setFormData(prev => ({
                ...prev,
                nama_publisher: loginInfo.name || '', // Set from loginInfo.name
                unit_publisher: loginInfo.unit || '', // Set from loginInfo.unit
            }))
        }
    }, [loginInfo]) // Dependency on loginInfo

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

        // Basic validation: Check if required fields are filled
        // nama_publisher and unit_publisher are now pre-filled, but still required for submission
        const requiredFields = ['tgl_publish', 'judul', 'nama_publisher', 'unit_publisher']
        for (const field of requiredFields) {
            if (!formData[field]) {
                toast.custom((t) => (
                    <ToastTemplate t={t} type='error' title='Validasi Gagal' description={`Bidang '${field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}' wajib diisi!`} />
                ))
                return
            }
        }

        setIsSubmitting(true)

        try {
            const dataToInsert = {
                tgl_publish: formData.tgl_publish,
                judul: formData.judul,
                deskripsi: formData.deskripsi || null, // Allow null if empty
                file_url: formData.file_url || null,   // Allow null if empty
                nama_publisher: formData.nama_publisher,
                unit_publisher: formData.unit_publisher,
            }

            const { data, error } = await supabase
                .from('analisis_tematik_data')
                .insert([dataToInsert])
                .select() // Use .select() to get the inserted data back

            if (error) {
                throw error
            }

            toast.custom((t) => (
                <ToastTemplate t={t} type='success' title='Analisis Tematik Berhasil Ditambahkan!' description={`"${data[0].judul}" telah ditambahkan.`} />
            ))

            // Clear form after successful submission, but retain publisher info
            setFormData(prev => ({
                ...prev,
                tgl_publish: '',
                judul: '',
                deskripsi: '',
                file_url: '',
                // nama_publisher and unit_publisher retain their values from loginInfo
            }))
        } catch (error) {
            toast.custom((t) => (
                <ToastTemplate t={t} type='error' title='Gagal Menambah Data' description={error.message || 'Terjadi kesalahan saat menyimpan data.'} />
            ))
            console.error('Error inserting Analisis Tematik data:', error)
        } finally {
            setIsSubmitting(false)
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
                    <li><Link href="/admin/panel/kelola-data/analisis-tematik">Analisis Tematik</Link></li>
                    <li><Link href="#">Tambah</Link></li>
                </ul>
            </div>

            <div className='flex border-b border-gray-300 py-2 mb-4'>
                <h2 className='flex-1 text-xl font-bold'>Tambah Analisis Tematik</h2>
                <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
            </div>

            {/* Manual Input Form */}
            <div className="card bg-base-100 mx-auto w-full">
                <form onSubmit={handleManualSubmit} className="space-y-4 p-6">
                    <div className='text-sm'>
                        <label className="label mb-2">
                            <span className="label-text">Tanggal Publikasi <span className="text-red-500">*</span></span>
                        </label>
                        <input
                            type="date"
                            name="tgl_publish"
                            value={formData.tgl_publish}
                            onChange={handleFormChange}
                            className="input input-bordered w-full"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className='text-sm'>
                        <label className="label mb-2">
                            <span className="label-text">Judul <span className="text-red-500">*</span></span>
                        </label>
                        <input
                            type="text"
                            name="judul"
                            value={formData.judul}
                            onChange={handleFormChange}
                            placeholder="Judul Analisis"
                            className="input input-bordered w-full"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className='text-sm'>
                        <label className="label mb-2">
                            <span className="label-text">Deskripsi</span>
                        </label>
                        <textarea
                            name="deskripsi"
                            value={formData.deskripsi}
                            onChange={handleFormChange}
                            placeholder="Ringkasan atau deskripsi singkat analisis..."
                            className="textarea textarea-bordered w-full h-24"
                            disabled={isSubmitting}
                        ></textarea>
                    </div>

                    <div className='text-sm'>
                        <label className="label mb-2">
                            <span className="label-text">URL File (Opsional)</span>
                        </label>
                        <input
                            type="url"
                            name="file_url"
                            value={formData.file_url}
                            onChange={handleFormChange}
                            placeholder="https://example.com/file.pdf"
                            className="input input-bordered w-full"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className='text-sm'>
                        <label className="label mb-2">
                            <span className="label-text">Nama Publisher <span className="text-red-500">*</span></span>
                        </label>
                        <input
                            type="text"
                            name="nama_publisher"
                            value={formData.nama_publisher}
                            onChange={handleFormChange}
                            placeholder="Nama Penulis/Publisher"
                            className="input input-bordered w-full bg-gray-100 cursor-not-allowed" // Added styling for disabled
                            required
                            disabled={true} // Always disabled as it's pre-filled
                        />
                    </div>

                    <div className='text-sm'>
                        <label className="label mb-2">
                            <span className="label-text">Unit Publisher <span className="text-red-500">*</span></span>
                        </label>
                        <input
                            type="text"
                            name="unit_publisher"
                            value={formData.unit_publisher}
                            onChange={handleFormChange}
                            placeholder="Unit/Instansi Penerbit"
                            className="input input-bordered w-full bg-gray-100 cursor-not-allowed" // Added styling for disabled
                            required
                            disabled={true} // Always disabled as it's pre-filled
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