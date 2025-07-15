// /analisis-tematik/[id]/page.js
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient' // Adjust path relative to this file
import { useParams, useRouter } from 'next/navigation' // For accessing URL params and navigation
import { ArrowLeft, CalendarDays, BookOpen, User, Building, FileText, ExternalLink } from 'lucide-react' // Icons
import Link from 'next/link'

export default function AnalisisTematikDetail() {
  const params = useParams()
  const router = useRouter()
  const analisisId = params.id // Get the ID from the URL
  
  const [analisisDetail, setAnalisisDetail] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date)
  }

  const fetchAnalisisDetail = useCallback(async () => {
    if (!analisisId) {
      setError('ID Analisis tidak ditemukan.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('analisis_tematik_data')
        .select('*') // Select all columns for detail view
        .eq('id', analisisId)
        .single() // Expecting a single row

      if (error) {
        throw error
      }

      if (!data) {
        setError('Analisis tidak ditemukan.')
      }
      setAnalisisDetail(data)
    } catch (err) {
      console.error("Error fetching analisis tematik detail:", err)
      setError('Gagal memuat detail analisis. Silakan coba lagi atau ID tidak valid.')
      setAnalisisDetail(null)
    } finally {
      setIsLoading(false)
    }
  }, [analisisId])

  useEffect(() => {
    fetchAnalisisDetail()
  }, [fetchAnalisisDetail])

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <div className='flex border-b border-gray-300 py-2 mb-4 items-center'>
        <h2 className='flex-1 text-xl font-bold'>Detail Analisis Tematik</h2>
        {/* <button className='flex-none btn btn-sm btn-ghost' onClick={() => router.back()}>
          <ArrowLeft className='w-4 h-4 text-gray-600'/> Kembali
        </button> */}
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-lg text-gray-600 mt-2">Memuat detail analisis...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
          <button className="btn btn-sm btn-error mt-2" onClick={fetchAnalisisDetail}>Coba Lagi</button>
        </div>
      )}

      {!isLoading && !error && analisisDetail ? (
        <div className="card bg-base-100 shadow-xl border border-gray-200 p-6 md:p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <BookOpen className="w-6 h-6 mr-3"/> {analisisDetail.judul}
          </h1>

          <div className="grid grid-cols-1 text-xs md:grid-cols-2 gap-4 mb-6 text-gray-700">
            <div className="flex items-center">
              <User className="w-5 h-5 mr-2 text-gray-500"/>
              <p><span className="font-semibold">Publisher:</span> {analisisDetail.nama_publisher || 'N/A'}</p>
            </div>
            <div className="flex items-center">
              <Building className="w-5 h-5 mr-2 text-gray-500"/>
              <p><span className="font-semibold">Unit:</span> {analisisDetail.unit_publisher || 'N/A'}</p>
            </div>
            <div className="flex items-center">
              <CalendarDays className="w-5 h-5 mr-2 text-gray-500"/>
              <p><span className="font-semibold">Tanggal Publish:</span> {formatDate(analisisDetail.tgl_publish)}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2"/> Deskripsi
            </h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {analisisDetail.deskripsi || 'Tidak ada deskripsi tersedia.'}
            </p>
          </div>

          {analisisDetail.file_url && (
            <div className="pt-6">
              <Link
                href={analisisDetail.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-info text-white btn-md flex items-center justify-center w-full md:w-auto"
              >
                <ExternalLink className="w-5 h-5 mr-2"/> Unduh File Analisis
              </Link>
            </div>
          )}
        </div>
      ) : !isLoading && !analisisDetail && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <p>Analisis dengan ID ini tidak ditemukan.</p>
        </div>
      )}
    </main>
  )
}