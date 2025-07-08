'use client'

import { ArrowRight, Home, LogOut } from 'lucide-react';
import Link from 'next/link';
import { redirect, RedirectType } from 'next/navigation';
import React, { useEffect, useState } from 'react'

export default function AdminPanel() {
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
      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Beranda Admin</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        <div className='w-full flex bg-white rounded-lg p-4 border border-gray-300'>
          <div className='flex-1'>
            <h4 className='text-md font-bold mb-2'>Pengelolaan User</h4>
            <p className='text-xs'>
              Konfigurasi dan approval untuk pengguna Dashboard ALCo
            </p>
          </div>
          <div className='flex-none'>
            <Link href="/admin/panel/kelola-user"><ArrowRight className='text-secondary'/></Link>
          </div>
        </div>

        <div className='w-full flex bg-white rounded-lg p-4 border border-gray-300'>
          <div className='flex-1'>
            <h4 className='text-md font-bold mb-2'>Pengelolaan Data</h4>
            <p className='text-xs'>
              Kurasi, update, atau hapus data
            </p>
          </div>
          <div className='flex-none'>
            <Link href=""><ArrowRight className='text-secondary'/></Link>
          </div>
        </div>
      </div>
    </main>
  );
}