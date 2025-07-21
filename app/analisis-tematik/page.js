'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient' // Adjust path if necessary
import ModalFilter from '../components/ModalFilter' // Adjust path if necessary
import { CalendarDays, Filter, BookOpen, User, Building, ExternalLink, ArrowRight } from 'lucide-react' // Icons from lucide-react
import Link from 'next/link'

export default function AnalisisTematikList() {
  const [analisisData, setAnalisisData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  // Initial filter range (e.g., current year)
  const waktuSekarang = new Date()
  const [appliedFilters, setAppliedFilters] = useState({
    waktu_awal: `${waktuSekarang.getFullYear()}-01-01`,
    waktu_akhir: `${waktuSekarang.getFullYear()}-12-31`,
  })

  // Filter fields for the ModalFilter
  const filterFields = [
    { label: 'Tanggal Publish Awal', name: 'waktu_awal', type: 'input', inputType: 'date', placeholder: 'Pilih tanggal awal' },
    { label: 'Tanggal Publish Akhir', name: 'waktu_akhir', type: 'input', inputType: 'date', placeholder: 'Pilih tanggal akhir' },
  ]

  // --- Modal Filter Handlers ---
  const handleOpenFilterModal = useCallback(() => {
    setIsFilterModalOpen(true)
  }, [])

  const handleCloseFilterModal = useCallback(() => {
    setIsFilterModalOpen(false)
  }, [])

  const handleApplyFilter = useCallback((filters) => {
    setAppliedFilters(filters)
    handleCloseFilterModal()
  }, [handleCloseFilterModal])

  // --- Data Fetching Function ---
  const fetchAnalisisData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('analisis_tematik_data')
        .select('id, tgl_publish, judul, nama_publisher, unit_publisher') // Select only necessary columns for list view
        .gte('tgl_publish', appliedFilters.waktu_awal)
        .lte('tgl_publish', appliedFilters.waktu_akhir)
        .order('tgl_publish', { ascending: false }) // Latest first

      if (error) {
        throw error
      }
      setAnalisisData(data)
    } catch (err) {
      console.error("Error fetching analisis tematik data:", err)
      setError('Gagal memuat data analisis tematik. Silakan coba lagi.')
      setAnalisisData([])
    } finally {
      setIsLoading(false)
    }
  }, [appliedFilters])

  // Effect to fetch data when filters change
  useEffect(() => {
    fetchAnalisisData()
  }, [appliedFilters, fetchAnalisisData])

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <div className='flex border-b border-gray-300 py-2 mb-4 items-center'>
        <h2 className='flex-1 text-xl font-bold'>Daftar Analisis Tematik</h2>
        <button className='flex-none btn btn-sm btn-ghost' onClick={handleOpenFilterModal}>
          <Filter className='w-4 h-4 text-gray-600'/> Filter Data
        </button>
      </div>

      {/* Filter Info */}
      <div className="flex text-sm items-center mb-4 text-gray-600">
        <CalendarDays className="w-5 h-5 mr-2" />
        <p>Analisis Tematik: {appliedFilters.waktu_awal} s.d. {appliedFilters.waktu_akhir}</p>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-lg text-gray-600 mt-2">Memuat analisis tematik...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
          <button className="btn btn-sm btn-error mt-2" onClick={fetchAnalisisData}>Coba Lagi</button>
        </div>
      )}

      {!isLoading && !error && analisisData.length === 0 && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded relative mb-6" role="alert">
          <p>Tidak ada analisis tematik yang ditemukan untuk periode ini.</p>
        </div>
      )}

      {!isLoading && !error && analisisData.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analisisData.map((analisis) => (
            <div key={analisis.id} className="card bg-base-100 shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300 h-fit">
              <div className="card-body p-6">
                <div className='flex text-md items-center font-semibold text-gray-800 mb-2'>
                  <BookOpen className="w-6 h-6 mr-2 flex-none"/> 
                  <h3 className="card-title flex-1">
                    {analisis.judul}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-2 flex items-center">
                  <Building className="w-4 h-4 mr-1 text-gray-500"/> {analisis.unit_publisher || 'N/A'}
                </p>
                <p className="text-sm text-gray-500 flex items-center mb-4">
                  <CalendarDays className="w-4 h-4 mr-1 text-gray-500"/> {formatDate(analisis.tgl_publish)}
                </p>
                <div className="card-actions justify-end">
                  <Link href={`/analisis-tematik/${analisis.id}`} className="btn btn-outline btn-secondary btn-sm">
                    Lihat Detail <ArrowRight className="w-4 h-4 ml-1"/>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Modal Filter */}
      <ModalFilter
        isOpen={isFilterModalOpen}
        onClose={handleCloseFilterModal}
        onApplyFilter={handleApplyFilter}
        filterFields={filterFields}
        initialFilterValues={appliedFilters}
      />
    </main>
  )
}