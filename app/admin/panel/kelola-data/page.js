'use client'

import ToastTemplate from '@/app/components/ToastTemplate';
import { supabase } from '@/app/lib/supabaseClient';
import { ArrowRight, Home, LogOut } from 'lucide-react';
import Link from 'next/link';
import { redirect, RedirectType } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast';

export default function AdminPanelKelolaData() {
  const [loginInfo, setLoginInfo] = useState({})

  useEffect(() => {
    let logInf = JSON.parse(sessionStorage.getItem('loginInfo'))
    if(!logInf) {
      redirect('/admin', RedirectType.replace)
    } else {
      setLoginInfo(logInf)
    }
  }, [])

  const logout = () => {
    sessionStorage.removeItem('loginInfo')
    redirect('/admin', RedirectType.replace)
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <Toaster position="bottom-right" reverseOrder={false} />
      <div className="breadcrumbs text-sm">
        <ul>
          <li><Link href="/admin/panel">Beranda</Link></li>
          <li><Link href="#">Pengelolaan Data</Link></li>
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Pengelolaan Data</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        <div className='w-full flex bg-white rounded-lg p-4 border border-gray-300'>
          <div className='flex-1'>
            <h4 className='text-md font-bold mb-2'>PDRB</h4>
            <p className='text-xs'>
              Data Produk Domestik Regional Bruto
            </p>
          </div>
          <div className='flex-none'>
            <Link href="/admin/panel/kelola-data/pdrb"><ArrowRight className='text-secondary'/></Link>
          </div>
        </div>

        <div className='w-full flex bg-white rounded-lg p-4 border border-gray-300'>
          <div className='flex-1'>
            <h4 className='text-md font-bold mb-2'>Inflasi</h4>
            <p className='text-xs'>
              Data Pergerakan Indeks Harga Konsumen IHK di Regional Sulawesi Tengah
            </p>
          </div>
          <div className='flex-none'>
            <Link href="/admin/panel/kelola-data/inflasi"><ArrowRight className='text-secondary'/></Link>
          </div>
        </div>
        
        <div className='w-full flex bg-white rounded-lg p-4 border border-gray-300'>
          <div className='flex-1'>
            <h4 className='text-md font-bold mb-2'>APBN</h4>
            <p className='text-xs'>
              Realisasi Pendapatan dan Belanja Negara Regional
            </p>
          </div>
          <div className='flex-none'>
            <Link href="/admin/panel/kelola-data/apbn"><ArrowRight className='text-secondary'/></Link>
          </div>
        </div>

        <div className='w-full flex bg-white rounded-lg p-4 border border-gray-300'>
          <div className='flex-1'>
            <h4 className='text-md font-bold mb-2'>Rincian Belanja Negara</h4>
            <p className='text-xs'>
              Rincian informasi Belanja Negara tingkat Regional
            </p>
          </div>
          <div className='flex-none'>
            <Link href="/admin/panel/kelola-data/belanja-negara"><ArrowRight className='text-secondary'/></Link>
          </div>
        </div>

        <div className='w-full flex bg-white rounded-lg p-4 border border-gray-300'>
          <div className='flex-1'>
            <h4 className='text-md font-bold mb-2'>APBD</h4>
            <p className='text-xs'>
              Realisasi Pendapatan dan Belanja Daerah se-Sulawesi Tengah
            </p>
          </div>
          <div className='flex-none'>
            <Link href="/admin/panel/kelola-data/apbd"><ArrowRight className='text-secondary'/></Link>
          </div>
        </div>

        <div className='w-full flex bg-white rounded-lg p-4 border border-gray-300'>
          <div className='flex-1'>
            <h4 className='text-md font-bold mb-2'>Makro Kesra</h4>
            <p className='text-xs'>
              Data indikator ekonomi makro dan kesejahteraan masyarakat
            </p>
          </div>
          <div className='flex-none'>
            <Link href="/admin/panel/kelola-data/makro-kesra"><ArrowRight className='text-secondary'/></Link>
          </div>
        </div>

        <div className='w-full flex bg-white rounded-lg p-4 border border-gray-300'>
          <div className='flex-1'>
            <h4 className='text-md font-bold mb-2'>Analisis Tematik</h4>
            <p className='text-xs'>
              Catatan kajian/analisis tematik dari unit vertikal DJPb wilayah Sulawesi Tengah
            </p>
          </div>
          <div className='flex-none'>
            <Link href="/admin/panel/kelola-data/analisis-tematik"><ArrowRight className='text-secondary'/></Link>
          </div>
        </div>
      </div>
    </main>
  );
}