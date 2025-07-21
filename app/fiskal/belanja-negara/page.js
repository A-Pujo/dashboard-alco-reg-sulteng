'use client'

import React, { useState, useEffect, useCallback } from 'react'
import ModalFilter from '../../components/ModalFilter' // Adjust path if different
import { CalendarDays, Filter, Info } from 'lucide-react'
import { formatLargeNumber } from '../../lib/formatLargeNumber' // Assuming this utility is correctly implemented
import { supabase } from '@/app/lib/supabaseClient' // Import Supabase client

export default function RincianBelanjaNegara() {
  const now = new Date()
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState({
    waktu_awal: `${now.getFullYear()}-01-01`,
    waktu_akhir: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`, // Default to end of current month
  })
  const [rincianBelanjaData, setRincianBelanjaData] = useState(null)
  const [uniqueNMKPPN, setUniqueNMKPPN] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Configuration for filter modal
  const filterFields = [
    { label: 'Waktu Awal', name: 'waktu_awal', type: 'input', inputType: 'date' },
    { label: 'Waktu Akhir', name: 'waktu_akhir', type: 'input', inputType: 'date' },
  ]

  const handleOpenFilterModal = useCallback(() => {
    setIsFilterModalOpen(true)
  }, [])

  const handleCloseFilterModal = useCallback(() => {
    setIsFilterModalOpen(false)
  }, [])

  const handleApplyFilter = useCallback((filters) => {
    setAppliedFilters(filters)
    handleCloseFilterModal() // Close modal after applying filters
  }, [handleCloseFilterModal])

  /**
   * Processes raw data from rincian_belanja_negara to aggregate for display.
   * Groups data by NMKPPN, then categorizes and sums for JENBEL '5x' and '6x'.
   * For '6x' JENBEL, it further aggregates by NMKABKOTA, then lists JENBELs under it.
   *
   * @param {Array} rawData - The raw data fetched from Supabase.
   * @returns {Object} Structured data for rendering the tables.
   */
  const processRincianBelanjaData = useCallback((rawData) => {
    const processedData = {};
    const kppnSet = new Set();

    // Group by NMKPPN first, and find the latest tgl_cutoff for each KPPN
    const latestDatePerKPPN = new Map(); // Map<NMKPPN, latest_tgl_cutoff_date_object>
    rawData.forEach(item => {
      const kppn = item.NMKPPN;
      const currentDate = new Date(item.waktu); // Use 'waktu' for cutoff
      if (!latestDatePerKPPN.has(kppn) || currentDate > latestDatePerKPPN.get(kppn)) {
        latestDatePerKPPN.set(kppn, currentDate);
      }
    });

    // Filter rawData to only include records from the latest tgl_cutoff for each KPPN
    const filteredByLatestDate = rawData.filter(item => {
      const kppn = item.NMKPPN;
      const itemDate = new Date(item.waktu);
      return latestDatePerKPPN.has(kppn) && itemDate.getTime() === latestDatePerKPPN.get(kppn).getTime();
    });

    filteredByLatestDate.forEach(item => {
      const kppn = item.NMKPPN;
      const jenbel = item.JENBEL;
      const nmkabkota = item.NMKABKOTA;
      const paguDipa = item.PAGU_DIPA || 0;
      const realisasi = item.REALISASI || 0;
      const blokir = item.BLOKIR || 0;

      kppnSet.add(kppn); // Collect unique KPPN names

      if (!processedData[kppn]) {
        processedData[kppn] = {
          jenbel5: {}, // Key: JENBEL code, Value: { pagu_dipa, blokir, realisasi }
          jenbel6ByKabkota: {}, // NEW: Key: NMKABKOTA, Value: { [JENBEL_CODE]: { pagu_dipa, blokir, realisasi, displayName } }
        };
      }

      if (jenbel.startsWith('5')) {
        if (!processedData[kppn].jenbel5[jenbel]) {
          processedData[kppn].jenbel5[jenbel] = {
            jenbel: item.NMGBKPK, // Use NMGBKPK for display name
            pagu_dipa: 0,
            blokir: 0,
            realisasi: 0,
          };
        }
        processedData[kppn].jenbel5[jenbel].pagu_dipa += paguDipa;
        processedData[kppn].jenbel5[jenbel].blokir += blokir;
        processedData[kppn].jenbel5[jenbel].realisasi += realisasi;
      } else if (jenbel.startsWith('6')) {
        if (!processedData[kppn].jenbel6ByKabkota[nmkabkota]) {
          processedData[kppn].jenbel6ByKabkota[nmkabkota] = {};
        }
        if (!processedData[kppn].jenbel6ByKabkota[nmkabkota][jenbel]) {
          processedData[kppn].jenbel6ByKabkota[nmkabkota][jenbel] = {
            displayName: item.NMGBKPK, // Display name for this specific JENBEL 6x
            pagu_dipa: 0,
            blokir: 0,
            realisasi: 0,
          };
        }
        processedData[kppn].jenbel6ByKabkota[nmkabkota][jenbel].pagu_dipa += paguDipa;
        processedData[kppn].jenbel6ByKabkota[nmkabkota][jenbel].blokir += blokir;
        processedData[kppn].jenbel6ByKabkota[nmkabkota][jenbel].realisasi += realisasi;
      }
    });

    // Convert objects to sorted arrays for consistent rendering
    for (const kppn in processedData) {
      // Sort JENBEL 5x
      processedData[kppn].jenbel5 = Object.entries(processedData[kppn].jenbel5)
        .map(([code, data]) => ({ code, ...data }))
        .sort((a, b) => a.code.localeCompare(b.code));

      // Sort JENBEL 6x by Kabkota and then by JENBEL code within each Kabkota
      processedData[kppn].jenbel6ByKabkota = Object.entries(processedData[kppn].jenbel6ByKabkota)
        .map(([kabkotaName, jenbelData]) => ({
          nmkabkota: kabkotaName,
          jenbelItems: Object.entries(jenbelData)
            .map(([jenbelCode, data]) => ({ code: jenbelCode, ...data }))
            .sort((a, b) => a.code.localeCompare(b.code)) // Sort JENBELs within each Kabkota
        }))
        .sort((a, b) => a.nmkabkota.localeCompare(b.nmkabkota)); // Sort Kabkotas
    }

    return {
      data: processedData,
      uniqueKPPN: Array.from(kppnSet).sort(), // Sort KPPN names
    };
  }, []);


  // Function to fetch and process rincian belanja data
  const fetchRincianBelanjaData = useCallback(async (filters) => {
    setIsLoading(true)
    setError(null)

    const { waktu_awal, waktu_akhir } = filters

    try {
      // Ensure column names match your database casing (e.g., "PAGU_DIPA", "REALISASI", "BLOKIR", "waktu")
      const { data, error } = await supabase
        .from('rincian_belanja_negara')
        .select('"ID", "THANG", "BULAN", "KDKABKOTA", "NMKABKOTA", "KDKPPN", "NMKPPN", "KDFUNGSI", "NMFUNGSI", "KDSFUNG", "NMSFUNG", "JENBEL", "NMGBKPK", "PAGU_DIPA", "REALISASI", "BLOKIR", "waktu"')
        .gte('waktu', waktu_awal)
        .lte('waktu', waktu_akhir)
        .order('waktu', { ascending: true }); // Order by waktu for latest cutoff logic

      if (error) throw error

      const { data: processedBelanja, uniqueKPPN } = processRincianBelanjaData(data);
      setRincianBelanjaData(processedBelanja);
      setUniqueNMKPPN(uniqueKPPN);

    } catch (err) {
      console.error('Error fetching rincian belanja data:', err)
      setError('Gagal memuat data rincian belanja. Silakan coba lagi.')
      setRincianBelanjaData(null);
      setUniqueNMKPPN([]);
    } finally {
      setIsLoading(false)
    }
  }, [processRincianBelanjaData]);

  // Call fetch data when component mounts or filter changes
  useEffect(() => {
    fetchRincianBelanjaData(appliedFilters)
  }, [appliedFilters, fetchRincianBelanjaData])

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Rincian Belanja Negara</h2>
        <button className='flex-none btn btn-sm btn-ghost' onClick={handleOpenFilterModal}><Filter className='w-4 h-4 text-gray-600' /></button>
      </div>

      {/* Filter and Date Info Section */}
      <div className="flex text-xs items-center mb-4 text-gray-600">
        <CalendarDays className="w-5 h-5 mr-2" />
        <p>Cut off data: {appliedFilters.waktu_awal} s.d. {appliedFilters.waktu_akhir}</p>
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-lg text-gray-600 mt-2">Memuat data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
          <button className="btn btn-sm btn-error mt-2" onClick={() => fetchRincianBelanjaData(appliedFilters)}>Coba Lagi</button>
        </div>
      )}

      {!isLoading && !error && rincianBelanjaData && (
        <>
          {uniqueNMKPPN.length > 0 ? (
            uniqueNMKPPN.map(kppnName => (
              <details key={kppnName} className="collapse collapse-plus bg-white shadow-md rounded-lg">
                <summary className="collapse-title text-md font-bold text-gray-800 border-b border-gray-200 py-4 px-6">
                  KPPN: {kppnName}
                </summary>
                <div className="collapse-content p-4">
                  {/* Table for JENBEL starting with '5' */}
                  {rincianBelanjaData[kppnName]?.jenbel5?.length > 0 && (
                    <div className="mb-6 overflow-x-auto">
                      <h4 className="text-lg font-semibold text-gray-700 mb-3">Belanja Pemerintah Pusat</h4>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis Belanja</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pagu DIPA</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Blokir</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Realisasi</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {rincianBelanjaData[kppnName].jenbel5.map(item => (
                            <tr key={item.code}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {item.jenbel} ({item.code})
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                {formatLargeNumber(item.pagu_dipa, 2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                {formatLargeNumber(item.blokir, 2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                {formatLargeNumber(item.realisasi, 2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Table for JENBEL starting with '6' - NEW STRUCTURE */}
                  {rincianBelanjaData[kppnName]?.jenbel6ByKabkota && rincianBelanjaData[kppnName].jenbel6ByKabkota.length > 0 && (
                    <div className="mb-6 overflow-x-auto">
                      <h4 className="text-lg font-semibold text-gray-700 mb-3">Belanja Transfer ke Daerah per Kab/Kota</h4>
                      {rincianBelanjaData[kppnName].jenbel6ByKabkota.map(kabkotaData => (
                        <div key={kabkotaData.nmkabkota} className="mb-4 border border-gray-100 rounded-md">
                          <div className="bg-gray-50 px-6 py-3 text-left text-sm font-semibold text-gray-600 border-b border-gray-200">
                            Kab/Kota: {kabkotaData.nmkabkota}
                          </div>
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis Belanja</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pagu DIPA</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Blokir</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Realisasi</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {kabkotaData.jenbelItems.map(jenbelItem => (
                                <tr key={jenbelItem.code}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {jenbelItem.displayName} ({jenbelItem.code})
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                    {formatLargeNumber(jenbelItem.pagu_dipa, 2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                    {formatLargeNumber(jenbelItem.blokir, 2)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right">
                                    {formatLargeNumber(jenbelItem.realisasi, 2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}

                  {(!rincianBelanjaData[kppnName]?.jenbel5?.length && (!rincianBelanjaData[kppnName]?.jenbel6ByKabkota || rincianBelanjaData[kppnName].jenbel6ByKabkota.length === 0)) && (
                      <div className="text-center text-gray-500 py-4">
                          Tidak ada data belanja untuk KPPN ini pada periode yang dipilih.
                      </div>
                  )}
                </div>
              </details>
            ))
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
              Tidak ada data rincian belanja negara yang tersedia untuk periode ini.
            </div>
          )}
        </>
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