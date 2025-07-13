// /kelola-data/makro-kesra/page.js
'use client'

import ToastTemplate from '@/app/components/ToastTemplate';
import { supabase } from '@/app/lib/supabaseClient';
import { LogOut, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { redirect, RedirectType } from 'next/navigation';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { formatLargeNumber } from '@/app/lib/formatLargeNumber';

ModuleRegistry.registerModules([AllCommunityModule])

export default function AdminPanelKelolaMakroKesra() {
  const gridRef = useRef(); // Ref for the AG Grid instance
  const [loginInfo, setLoginInfo] = useState(null);
  const [makroKesraData, setMakroKesraData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Authentication check
  useEffect(() => {
    const logInf = JSON.parse(sessionStorage.getItem('loginInfo'));
    if (!logInf) {
      redirect('/admin', RedirectType.replace);
    } else {
      setLoginInfo(logInf);
    }
  }, []);

  // Function to fetch data from the 'makro_kesra_indicators' table
  const fetchMakroKesraData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('makro_kesra_indicators')
        .select('*') // Select all columns: id, waktu, indikator, value, unit
        .order('waktu', { ascending: false }); // Order by date, latest first

      if (error) {
        throw error;
      }
      setMakroKesraData(data);
    } catch (err) {
      console.error('Error fetching Makro-Kesra data:', err);
      setError('Gagal memuat data Makro-Kesra. Silakan coba lagi.');
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Kesalahan Data' description={err.message || 'Gagal memuat data Makro-Kesra.'} />
      ));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch data when loginInfo is available
  useEffect(() => {
    if (loginInfo) {
      fetchMakroKesraData();
    }
  }, [loginInfo, fetchMakroKesraData]);

  // Logout function
  const logout = useCallback(() => {
    sessionStorage.removeItem('loginInfo');
    toast.custom((t) => (
      <ToastTemplate t={t} type='success' title='Logout Berhasil!' description='Anda telah keluar dari panel admin.' />
    ), { duration: 2000 });
    setTimeout(() => {
      redirect('/admin', RedirectType.replace);
    }, 500);
  }, []);

  // Helper to format date to a readable format
  const formatDate = (isoDateString) => {
    if (!isoDateString) return '-';
    const date = new Date(isoDateString);
    return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  };

  // Helper to format numerical values
  const formatValue = (number, unit) => {
    if (number === null || number === undefined) return '-';
    // Use formatLargeNumber for large values, otherwise just toFixed for decimals
    const num = typeof number === 'string' ? parseFloat(number) : number;
    if (Math.abs(num) >= 1000000) { // Arbitrary large number threshold
        return `${formatLargeNumber(num, 2)} ${unit || ''}`;
    }
    return `${num.toFixed(2)} ${unit || ''}`;
  };

  // --- DELETE ROW LOGIC ---
  const handleDeleteRow = useCallback(async (rowData) => {
    // IMPORTANT: In a production environment, replace `confirm()` with a custom modal UI.
    if (!confirm(`Apakah Anda yakin ingin menghapus data '${rowData.indikator}' pada tanggal ${formatDate(rowData.waktu)} dengan nilai ${rowData.value}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('makro_kesra_indicators') // Target the 'makro_kesra_indicators' table
        .delete()
        .eq('id', rowData.id); // Assuming 'id' is your primary key

      if (error) {
        throw error;
      }

      toast.custom((t) => (
        <ToastTemplate t={t} type="success" title='Data Makro-Kesra berhasil dihapus!' />
      ));

      // Re-fetch data to update the grid after deletion
      fetchMakroKesraData();

    } catch (error) {
      toast.custom((t) => (
        <ToastTemplate t={t} type='error' title='Gagal menghapus data Makro-Kesra' description={error.message || 'Terjadi kesalahan tidak diketahui'} />
      ));
      console.error('Error deleting Makro-Kesra row:', error);
    }
  }, [fetchMakroKesraData]); // Dependency: fetchMakroKesraData to re-load data

  // Define column definitions for AG Grid
  const columnDefs = useMemo(() => [
    {
      headerName: 'Waktu',
      field: 'waktu',
      valueFormatter: params => formatDate(params.value),
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1.2,
      minWidth: 150,
    },
    {
      headerName: 'Indikator',
      field: 'indikator',
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1.5,
      minWidth: 180,
    },
    {
      headerName: 'Nilai',
      field: 'value',
      valueFormatter: params => formatValue(params.value, params.data.unit), // Use unit from rowData
      sortable: true,
      filter: 'agNumberColumnFilter',
      resizable: true,
      cellStyle: { fontWeight: 'bold' },
      flex: 1.5,
      minWidth: 150,
    },
    {
      headerName: 'Unit',
      field: 'unit',
      sortable: true,
      filter: true,
      resizable: true,
      flex: 0.8,
      minWidth: 100,
    },
    {
      headerName: 'Aksi',
      cellRenderer: (params) => (
        <div className="flex items-center justify-center space-x-2 h-full">
          <button
            className="btn btn-ghost btn-xs btn-circle"
            onClick={() => handleDeleteRow(params.data)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      ),
      width: 80,
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
      cellClass: 'grid-action-buttons-cell',
    },
  ], [formatDate, formatValue, handleDeleteRow]); // Dependencies for useMemo

  // Default column properties
  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: true,
  }), []);

  // Pagination and other grid options
  const gridOptions = useMemo(() => ({
    pagination: true,
    paginationPageSize: 10,
    domLayout: 'autoHeight',
  }), []);

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
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4 items-center'>
        <h2 className='flex-1 text-xl font-bold'>Kelola Data Makro-Kesra</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      <div className='mb-6 flex justify-end'>
         <Link href="/admin/panel/kelola-data/makro-kesra/tambah" className="btn btn-primary btn-sm">
            <Plus className='w-4 h-4' /> Tambah Data Makro-Kesra
         </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="ml-2">Memuat data...</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
          <button className="btn btn-sm" onClick={fetchMakroKesraData}>Coba Lagi</button>
        </div>
      )}

      {!isLoading && !error && makroKesraData.length === 0 && (
        <div className="alert alert-info">
          <span>Tidak ada data Makro-Kesra tersedia.</span>
        </div>
      )}

      {!isLoading && !error && makroKesraData.length > 0 && (
        <div className="ag-theme-alpine" style={{ height: 500, width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={makroKesraData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            gridOptions={gridOptions}
            onGridReady={(params) => {
              params.api.sizeColumnsToFit();
            }}
          />
        </div>
      )}
    </main>
  );
}