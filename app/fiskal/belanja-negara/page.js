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
    waktu_akhir: `${now.getFullYear()}-12-31`,
  })
  console.log(appliedFilters)
  const [rincianBelanjaData, setRincianBelanjaData] = useState(null)
  const [uniqueNMKPPN, setUniqueNMKPPN] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [latestCutoffDateDisplay, setLatestCutoffDateDisplay] = useState('Memuat...') // To display the actual latest date fetched

  // Configuration for filter modal
  const filterFields = [
    // Filter fields are retained for future flexibility if you want manual date filtering back
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
    // Note: Applying filters here will override the latest database date logic
    // if you intend for filters to *always* respect the latest DB date,
    // you might remove the filter modal or adjust this logic.
    // For now, if a user applies a filter, it will use that range.
    handleCloseFilterModal()
  }, [handleCloseFilterModal])

  /**
   * Processes raw data for display.
   * This function now assumes rawData already contains only records for the desired latest date.
   *
   * @param {Array} rawData - The raw data fetched from Supabase, already filtered by the latest date.
   * @returns {Object} Structured data for rendering the tables.
   */
  const processRincianBelanjaData = useCallback((rawData) => {
    const processedData = {};
    const kppnSet = new Set();

    // No need for latest date finding or filtering here, rawData is already filtered
    rawData.forEach(item => {
      const kppn = item.NMKPPN;
      const jenbel = item.JENBEL;
      const nmkabkota = item.NMKABKOTA ? item.NMKABKOTA.trim().toUpperCase() : '';
      const paguDipa = item.PAGU_DIPA || 0;
      const realisasi = item.REALISASI || 0;
      const blokir = item.BLOKIR || 0;

      kppnSet.add(kppn);

      if (!processedData[kppn]) {
        processedData[kppn] = {
          jenbel5: {},
          jenbel6ByKabkota: {},
        };
      }

      if (jenbel.startsWith('5')) {
        if (!processedData[kppn].jenbel5[jenbel]) {
          processedData[kppn].jenbel5[jenbel] = {
            jenbel: item.NMGBKPK,
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
            displayName: item.NMGBKPK,
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

    for (const kppn in processedData) {
      processedData[kppn].jenbel5 = Object.entries(processedData[kppn].jenbel5)
        .map(([code, data]) => ({ code, ...data }))
        .sort((a, b) => a.code.localeCompare(b.code));

      processedData[kppn].jenbel6ByKabkota = Object.entries(processedData[kppn].jenbel6ByKabkota)
        .map(([kabkotaName, jenbelData]) => ({
          nmkabkota: kabkotaName,
          jenbelItems: Object.entries(jenbelData)
            .map(([jenbelCode, data]) => ({ code: jenbelCode, ...data }))
            .sort((a, b) => a.code.localeCompare(b.code))
        }))
        .sort((a, b) => a.nmkabkota.localeCompare(b.nmkabkota));
    }

    return {
      data: processedData,
      uniqueKPPN: Array.from(kppnSet).sort(),
    };
  }, []);

  // Function to fetch and process rincian belanja data
  const fetchRincianBelanjaData = useCallback(async (filters) => {
    setIsLoading(true)
    setError(null)

    // --- Step 1: Find the latest 'waktu' in the entire table ---
    let latestWaktu = null;
    try {
      const { data, error } = await supabase
        .from('rincian_belanja_negara')
        .select('waktu')
        .gte('waktu', appliedFilters.waktu_awal)
        .lte('waktu', appliedFilters.waktu_akhir)
        .order('waktu', { ascending: false }) // Descending order
        .limit(1); // Get only the first (latest) record

      if (error) throw error;

      if (data && data.length > 0) {
        latestWaktu = data[0].waktu;
        setLatestCutoffDateDisplay(new Date(latestWaktu).toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }));
      } else {
        setLatestCutoffDateDisplay('Tidak ada data');
        setIsLoading(false);
        setRincianBelanjaData(null);
        setUniqueNMKPPN([]);
        return; // No data to fetch
      }
    } catch (err) {
      console.error('Error fetching latest waktu:', err);
      setError('Gagal menemukan tanggal terbaru data. Silakan coba lagi.');
      setIsLoading(false);
      return;
    }

    // --- Step 2: Fetch all records for that specific latest 'waktu' ---
    try {
      const { data, error } = await supabase
        .from('rincian_belanja_negara')
        .select('"ID", "THANG", "BULAN", "KDKABKOTA", "NMKABKOTA", "KDKPPN", "NMKPPN", "KDFUNGSI", "NMFUNGSI", "KDSFUNG", "NMSFUNG", "JENBEL", "NMGBKPK", "PAGU_DIPA", "REALISASI", "BLOKIR", "waktu"')
        .eq('waktu', latestWaktu); // Filter by the latest found waktu

      if (error) throw error;

      const { data: processedBelanja, uniqueKPPN } = processRincianBelanjaData(data);
      setRincianBelanjaData(processedBelanja);
      setUniqueNMKPPN(uniqueKPPN);

    } catch (err) {
      console.error('Error fetching rincian belanja data:', err)
      setError('Gagal memuat data rincian belanja untuk tanggal terbaru. Silakan coba lagi.')
      setRincianBelanjaData(null);
      setUniqueNMKPPN([]);
    } finally {
      setIsLoading(false)
    }
  }, [processRincianBelanjaData]); // Removed `filters` from dependencies as it's not directly used for the primary fetch anymore

  // Call fetch data when component mounts
  useEffect(() => {
    fetchRincianBelanjaData(appliedFilters) // Still pass appliedFilters, though its direct use is minimal here.
  }, [appliedFilters]) // Only re-run if fetchRincianBelanjaData changes (which it won't often)

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Rincian Belanja Negara</h2>
        <button className='flex-none btn btn-sm btn-ghost' onClick={handleOpenFilterModal}><Filter className='w-4 h-4 text-gray-600' /></button>
      </div>

      {/* Filter and Date Info Section */}
      <div className="flex text-xs items-center mb-4 text-gray-600">
        <CalendarDays className="w-5 h-5 mr-2" />
        <p>Cut off data: {latestCutoffDateDisplay}</p> {/* Display the actual latest date */}
        {/* The filter modal remains, but its "waktu_awal" and "waktu_akhir" might not be used directly for the primary display */}
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

                  {/* Table for JENBEL starting with '6' */}
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
              Tidak ada data rincian belanja negara yang tersedia untuk tanggal terbaru ini.
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