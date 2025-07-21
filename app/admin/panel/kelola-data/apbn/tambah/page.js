// /admin/panel/kelola-data/apbn/tambah/page.js
'use client'

import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
import { LogOut, Plus, Save, ArrowLeft, UploadCloud, FileText, Trash2 } from 'lucide-react' // Added Trash2 for removing dynamic fields
import Link from 'next/link'
import { redirect, RedirectType } from 'next/navigation'
import React, { useCallback, useEffect, useState, useRef } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import Papa from 'papaparse'

export default function AdminPanelAddDataAPBN() {
  const [loginInfo, setLoginInfo] = useState(null)
  const [dateInfo, setDateInfo] = useState({
    thang: '',
    bulan: '',
    tgl_cutoff: '',
  });
  // State to hold multiple budget components
  const [budgetComponents, setBudgetComponents] = useState([
    { komp_ang: 'p_pajak_dn', pagu_target: '', realisasi: '' },
    { komp_ang: 'p_pajak_ln', pagu_target: '', realisasi: '' },
    { komp_ang: 'p_pnbp_lain', pagu_target: '', realisasi: '' },
    { komp_ang: 'p_blu', pagu_target: '', realisasi: '' },
    { komp_ang: 'b_pegawai', pagu_target: '', realisasi: '' },
    { komp_ang: 'b_barang', pagu_target: '', realisasi: '' },
    { komp_ang: 'b_modal', pagu_target: '', realisasi: '' },
    { komp_ang: 'b_bansos', pagu_target: '', realisasi: '' },
    { komp_ang: 'b_dbh', pagu_target: '', realisasi: '' },
    { komp_ang: 'b_dakfisik', pagu_target: '', realisasi: '' },
    { komp_ang: 'b_daknonfisik', pagu_target: '', realisasi: '' },
    { komp_ang: 'b_dau', pagu_target: '', realisasi: '' },
    { komp_ang: 'b_infis', pagu_target: '', realisasi: '' },
    { komp_ang: 'b_danadesa', pagu_target: '', realisasi: '' },
  ]);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploadingCSV, setIsUploadingCSV] = useState(false)
  const fileInputRef = useRef(null)

  // Map for display names (optional, but good for UX)
  const componentDisplayNames = {
    'p_pajak_dn': 'Pendapatan Pajak Dalam Negeri',
    'p_pajak_ln': 'Pajak Perdagangan Internasional',
    'p_pnbp_lain': 'PNBP Lain',
    'p_blu': 'BLU',
    'b_pegawai': 'Belanja Pegawai',
    'b_barang': 'Belanja Barang',
    'b_modal': 'Belanja Modal',
    'b_bansos': 'Belanja Bansos',
    'b_dbh': 'Dana Bagi Hasil (DBH)',
    'b_dakfisik': 'DAK Fisik',
    'b_daknonfisik': 'DAK Non-Fisik',
    'b_dau': 'DAU',
    'b_infis': 'Insentif Fiskal',
    'b_danadesa': 'Dana Desa',
  };

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

  // Handle changes for thang, bulan, tgl_cutoff
  const handleDateInfoChange = (e) => {
    const { name, value } = e.target;
    setDateInfo(prev => ({ ...prev, [name]: value }));

    // Automatically set tgl_cutoff if year and month are selected
    if (name === 'thang' || name === 'bulan') {
      const year = name === 'thang' ? value : dateInfo.thang;
      const month = name === 'bulan' ? value : dateInfo.bulan;

      if (year && month) {
        const lastDay = new Date(year, month, 0).getDate(); // Get last day of the month
        const cutoffDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        setDateInfo(prev => ({ ...prev, tgl_cutoff: cutoffDate }));
      }
    }
  };

  // Handle changes for dynamic budget components
  const handleBudgetComponentChange = (index, field, value) => {
    const newBudgetComponents = [...budgetComponents];
    newBudgetComponents[index][field] = value;
    setBudgetComponents(newBudgetComponents);
  };

  const addBudgetComponent = () => {
    setBudgetComponents(prev => [...prev, { komp_ang: '', pagu_target: '', realisasi: '' }]);
  };

  const removeBudgetComponent = (index) => {
    setBudgetComponents(prev => prev.filter((_, i) => i !== index));
  };


  const handleManualSubmit = async (e) => {
    e.preventDefault()

    // Basic validation for date info
    if (!dateInfo.thang || !dateInfo.bulan || !dateInfo.tgl_cutoff) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Validasi Gagal' description='Tahun, Bulan, dan Tanggal Cutoff wajib diisi!' />
      ));
      return;
    }

    // Validate if any budget component has komp_ang but missing pagu/realisasi
    const validData = budgetComponents.filter(comp => comp.komp_ang !== '');
    if (validData.length === 0) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Validasi Gagal' description='Setidaknya satu komponen anggaran harus diisi.' />
      ));
      return;
    }

    for (const comp of validData) {
      if (!comp.komp_ang || comp.pagu_target === '' || comp.realisasi === '') {
        toast.custom((t) => (
          <ToastTemplate t={t} type='error' title='Validasi Gagal' description={`Komponen Anggaran '${componentDisplayNames[comp.komp_ang] || comp.komp_ang}' memiliki data yang belum lengkap.`} />
        ));
        return;
      }
    }

    setIsSubmittingManual(true);

    try {
      const dataToInsert = validData.map(comp => ({
        thang: parseInt(dateInfo.thang),
        bulan: parseInt(dateInfo.bulan),
        tgl_cutoff: dateInfo.tgl_cutoff, // This should be a valid date string (YYYY-MM-DD)
        komp_ang: comp.komp_ang,
        pagu_target: parseFloat(comp.pagu_target),
        realisasi: parseFloat(comp.realisasi),
      }));

      const { data, error } = await supabase
        .from('fiskal_apbn')
        .upsert(dataToInsert, {
          onConflict: 'tgl_cutoff, komp_ang', // Unique constraint: (tgl_cutoff, komp_ang)
          ignoreDuplicates: false, // Update existing records
        })
        .select();

      if (error) {
        throw error;
      }

      toast.custom((t) => (
        <ToastTemplate t={t} type='success' title='Data APBN Berhasil Disimpan!' description={`${data.length} record telah ditambahkan/diperbarui untuk tanggal ${dateInfo.tgl_cutoff}.`} />
      ));

      // Clear form after successful submission
      setDateInfo({ thang: '', bulan: '', tgl_cutoff: '' });
      setBudgetComponents([
        { komp_ang: 'p_pajak_dn', pagu_target: '', realisasi: '' },
        { komp_ang: 'p_pajak_ln', pagu_target: '', realisasi: '' },
        { komp_ang: 'p_pnbp_lain', pagu_target: '', realisasi: '' },
        { komp_ang: 'p_blu', pagu_target: '', realisasi: '' },
        { komp_ang: 'b_pegawai', pagu_target: '', realisasi: '' },
        { komp_ang: 'b_barang', pagu_target: '', realisasi: '' },
        { komp_ang: 'b_modal', pagu_target: '', realisasi: '' },
        { komp_ang: 'b_bansos', pagu_target: '', realisasi: '' },
        { komp_ang: 'b_dbh', pagu_target: '', realisasi: '' },
        { komp_ang: 'b_dakfisik', pagu_target: '', realisasi: '' },
        { komp_ang: 'b_daknonfisik', pagu_target: '', realisasi: '' },
        { komp_ang: 'b_dau', pagu_target: '', realisasi: '' },
        { komp_ang: 'b_infis', pagu_target: '', realisasi: '' },
        { komp_ang: 'b_danadesa', pagu_target: '', realisasi: '' },
      ]);

    } catch (error) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Gagal Menyimpan Data' description={error.message || 'Terjadi kesalahan saat menyimpan data.'} />
      ));
      console.error('Error inserting/updating APBN data:', error);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUploadCSV = async () => {
    if (!selectedFile) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Pilih File' description='Mohon pilih file CSV terlebih dahulu.' />
      ));
      return;
    }

    setIsUploadingCSV(true);
    let successfulUploads = 0;
    let failedUploads = 0;
    let totalRecords = 0;

    try {
      await new Promise((resolve, reject) => {
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false, // Keep as string for explicit parsing
          complete: async (results) => {
            const dataToUpload = results.data;
            totalRecords = dataToUpload.length;

            if (totalRecords === 0) {
              toast.custom((t) => (
                <ToastTemplate t={t} type='info' title='File Kosong' description='File CSV yang diunggah tidak memiliki data.' />
              ));
              setIsUploadingCSV(false);
              resolve();
              return;
            }

            // Validate headers for new APBN CSV format
            const expectedHeaders = ['thang', 'bulan', 'tgl_cutoff', 'komp_ang', 'pagu_target', 'realisasi'];
            const actualHeaders = results.meta.fields;
            const missingHeaders = expectedHeaders.filter(header => !actualHeaders.includes(header));

            if (missingHeaders.length > 0) {
              toast.custom((t) => (
                <ToastTemplate t={t} type='error' title='Header CSV Tidak Lengkap' description={`Header yang hilang: ${missingHeaders.join(', ')}. Pastikan semua kolom ada.`} />
              ));
              setIsUploadingCSV(false);
              reject(new Error('Missing CSV headers'));
              return;
            }

            const batchSize = 1000;
            for (let i = 0; i < totalRecords; i += batchSize) {
              const batch = dataToUpload.slice(i, i + batchSize);

              const formattedBatch = batch.map(row => ({
                thang: parseInt(row.thang),
                bulan: parseInt(row.bulan),
                tgl_cutoff: row.tgl_cutoff, // Should be 'YYYY-MM-DD'
                komp_ang: row.komp_ang,
                pagu_target: parseFloat(row.pagu_target) || 0,
                realisasi: parseFloat(row.realisasi) || 0,
              }));

              const { error: upsertError } = await supabase
                .from('fiskal_apbn')
                .upsert(formattedBatch, {
                  onConflict: 'tgl_cutoff, komp_ang', // Conflict on both date and component
                  ignoreDuplicates: false,
                });

              if (upsertError) {
                console.error('Batch upsert error:', upsertError);
                failedUploads += batch.length;
                toast.custom((t) => (
                  <ToastTemplate t={t} type='error' title='Gagal Unggah Batch' description={`Batch gagal diunggah: ${upsertError.message}`} />
                ));
              } else {
                successfulUploads += batch.length;
              }
            }

            toast.custom((t) => (
              <ToastTemplate
                t={t}
                type='success'
                title='Unggah CSV Selesai!'
                description={`Total: ${totalRecords}, Berhasil: ${successfulUploads}, Gagal: ${failedUploads}`}
              />
            ), { duration: 5000 });

            setSelectedFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            resolve();
          },
          error: (err) => {
            console.error('CSV parsing error:', err);
            toast.custom((t) => (
              <ToastTemplate t={t} type='error' title='Kesalahan Parsing CSV' description={err.message} />
            ));
            setIsUploadingCSV(false);
            reject(err);
          },
        });
      });
    } catch (err) {
      console.error('Upload process error:', err);
      setIsUploadingCSV(false);
    } finally {
      setIsUploadingCSV(false);
    }
  };

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

      <div className="collapse collapse-arrow bg-base-100 border border-base-300">
        <input type="radio" name="data-entry-method" defaultChecked />
        <div className="collapse-title font-semibold">Manual Entry</div>
        <div className="collapse-content text-sm">
          <form onSubmit={handleManualSubmit} className="space-y-4 p-4">
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='text-sm'>
                <label className="label mb-2">
                  <span className="label-text">Tahun</span>
                </label>
                <input
                  type="number"
                  name="thang"
                  value={dateInfo.thang}
                  onChange={handleDateInfoChange}
                  placeholder="Contoh: 2024"
                  className="input input-bordered w-full"
                  required
                  disabled={isSubmittingManual}
                />
              </div>
              <div className='text-sm'>
                <label className="label mb-2">
                  <span className="label-text">Bulan</span>
                </label>
                <select
                  name="bulan"
                  value={dateInfo.bulan}
                  onChange={handleDateInfoChange}
                  className="select select-bordered w-full"
                  required
                  disabled={isSubmittingManual}
                >
                  <option value="">Pilih Bulan</option>
                  {[...Array(12).keys()].map(i => (
                    <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div className='text-sm'>
                <label className="label mb-2">
                  <span className="label-text">Tanggal Cutoff</span>
                </label>
                <input
                  type="date"
                  name="tgl_cutoff"
                  value={dateInfo.tgl_cutoff}
                  onChange={handleDateInfoChange} // Allow manual override if needed
                  className="input input-bordered w-full"
                  required
                  disabled={isSubmittingManual}
                />
              </div>
            </div>

            <h4 className="text-md font-semibold mt-6 mb-2">Data Komponen Anggaran</h4>

            {budgetComponents.map((component, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-b pb-4 mb-4">
                <div className='text-sm md:col-span-1'>
                  <label className="label mb-2">
                    <span className="label-text">Komponen Anggaran</span>
                  </label>
                  <select
                    name="komp_ang"
                    value={component.komp_ang}
                    onChange={(e) => handleBudgetComponentChange(index, 'komp_ang', e.target.value)}
                    className="select select-bordered w-full"
                    required
                    disabled={isSubmittingManual}
                  >
                    <option value="">Pilih Komponen</option>
                    {Object.entries(componentDisplayNames).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                </div>
                <div className='text-sm md:col-span-1'>
                  <label className="label mb-2">
                    <span className="label-text">Pagu Target (Rp)</span>
                  </label>
                  <input
                    type="number"
                    name="pagu_target"
                    value={component.pagu_target}
                    onChange={(e) => handleBudgetComponentChange(index, 'pagu_target', e.target.value)}
                    placeholder="Ex: 750000000000"
                    step="any"
                    className="input input-bordered w-full"
                    required
                    disabled={isSubmittingManual}
                  />
                </div>
                <div className='text-sm md:col-span-1'>
                  <label className="label mb-2">
                    <span className="label-text">Realisasi (Rp)</span>
                  </label>
                  <input
                    type="number"
                    name="realisasi"
                    value={component.realisasi}
                    onChange={(e) => handleBudgetComponentChange(index, 'realisasi', e.target.value)}
                    placeholder="Ex: 712091242719"
                    step="any"
                    className="input input-bordered w-full"
                    required
                    disabled={isSubmittingManual}
                  />
                </div>
                <div className="md:col-span-1 flex items-end justify-end">
                  {/* Only show remove button if there's more than one component */}
                  {budgetComponents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBudgetComponent(index)}
                      className="btn btn-error btn-square btn-sm"
                      disabled={isSubmittingManual}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addBudgetComponent}
              className="btn btn-outline btn-sm mb-4"
              disabled={isSubmittingManual}
            >
              <Plus className="w-4 h-4 mr-2" /> Tambah Komponen
            </button>

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
        <input type="radio" name="data-entry-method" />
        <div className="collapse-title font-semibold">CSV Upload</div>
        <div className="collapse-content text-sm">
          <div className="p-4">
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Pilih File CSV APBN</span>
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
              <p className="mb-1">Setiap baris di CSV harus merepresentasikan **satu komponen anggaran** untuk suatu tanggal.</p>
              <p className="mb-1">Pastikan file CSV Anda memiliki header berikut (case-sensitive) dan urutan kolom yang sesuai:</p>
              <ul className="list-disc list-inside ml-4">
                <li>`thang` (Tahun, INT, contoh: 2024)</li>
                <li>`bulan` (Bulan, INT, contoh: 1 untuk Januari)</li>
                <li>`tgl_cutoff` (Tanggal Cutoff, format YYYY-MM-DD, contoh: 2024-01-31)</li>
                <li>`komp_ang` (Nama Komponen Anggaran, STRING, harus sesuai dengan daftar yang ditentukan, contoh: `p_pajak_dn`, `b_pegawai`)</li>
                <li>`pagu_target` (Pagu/Target, FLOAT)</li>
                <li>`realisasi` (Realisasi, FLOAT)</li>
              </ul>
              <p className="mt-2">Contoh Baris CSV:</p>
              <pre className="bg-base-300 p-2 rounded-md overflow-x-auto">
                `thang,bulan,tgl_cutoff,komp_ang,pagu_target,realisasi`<br/>
                `2024,1,2024-01-31,p_pajak_dn,100000000000,95000000000`<br/>
                `2024,1,2024-01-31,b_pegawai,20000000000,19000000000`<br/>
                `2024,2,2024-02-29,p_pajak_dn,105000000000,100000000000`<br/>
                `2024,2,2024-02-29,b_barang,30000000000,28000000000`
              </pre>
              <p className="mt-2">Jika ada record dengan `thang`, `bulan`, `tgl_cutoff`, DAN `komp_ang` yang sama, data yang ada akan diperbarui.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}