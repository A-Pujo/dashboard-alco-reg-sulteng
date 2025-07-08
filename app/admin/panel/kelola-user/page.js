'use client'

import ToastTemplate from '@/app/components/ToastTemplate';
import { supabase } from '@/app/lib/supabaseClient';
import { ArrowRight, Home, LogOut } from 'lucide-react';
import Link from 'next/link';
import { redirect, RedirectType } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast';

export default function AdminPanelKelolaUser() {
  const [loginInfo, setLoginInfo] = useState({})
  const [userList, setUserList] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isEditLoading, setIsEditLoading] = useState(false)

  useEffect(() => {
    let logInf = JSON.parse(sessionStorage.getItem('loginInfo'))
    if(!logInf) {
      redirect('/admin', RedirectType.replace)
    } else {
      setLoginInfo(logInf)
    }
  }, [])

  const getUserList = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from('users').select().order('created_at', {ascending: false})
      if(error) {
        toast.custom((t) => (
          <ToastTemplate t={t} type="error" title='Get user gagal!' description='Silakan menghubungi admin' />
        ))
        console.warn(error)
      } else {
        toast.custom((t) => (
          <ToastTemplate t={t} type="success" title='Get user berhasil!' />
        ))
        setUserList(data)
      }
    } catch (err) {
      toast.custom((t) => (
        <ToastTemplate t={t} type="error" title='Get user gagal!' description='Silakan menghubungi admin' />
      ))
      console.warn(err)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    sessionStorage.removeItem('loginInfo')
    redirect('/admin', RedirectType.replace)
  }

  const editUserActiveStatus = async (id, val = 1) => {
    setIsEditLoading(true)
    try {
      const {data, error} = await supabase.from('users').update({ active: val }).eq('id', id).select()
      if(error) {
        toast.custom((t) => (
          <ToastTemplate t={t} type="error" title='Edit user gagal!' description='Silakan menghubungi admin' />
        ))
        console.warn(error)
      } else {
        toast.custom((t) => (
          <ToastTemplate t={t} type="success" title='Edit user berhasil' description={`${data[0].name} berhasil diubah`} />
        ))
        // console.log(data)
        setTimeout(() => {
          getUserList()
        }, 500)
      }
    } catch (err) {
      toast.custom((t) => (
        <ToastTemplate t={t} type="error" title='Edit user gagal!' description='Silakan menghubungi admin' />
      ))
      console.warn(err)
    } finally {
      setIsEditLoading(false)
    }
  }

  useEffect(() => {
    getUserList()
  }, [])

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <Toaster position="bottom-right" reverseOrder={false} />
      <div className="breadcrumbs text-sm">
        <ul>
          <li><Link href="/admin/panel">Beranda</Link></li>
          <li><Link href="#">Pengelolaan User</Link></li>
        </ul>
      </div>

      <div className='flex border-b border-gray-300 py-2 mb-4'>
        <h2 className='flex-1 text-xl font-bold'>Pengelolaan User</h2>
        <button className='flex-none btn btn-sm btn-ghost text-gray-600' onClick={logout}>Logout<LogOut className='w-4 h-4 text-gray-600'/></button>
      </div>

      <div className='grid grid-cols-1'>
        {isLoading ? (
          <div className="skeleton h-32 w-full flex justify-center items-center">
            Loading...
          </div>
        ) : (
          userList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Unit</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {userList.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td>{item.unit}</td>
                      <td>{item.email}</td>
                      <td>{item.active == 1 ? "Aktif" : "Tidak Aktif"}</td>
                      {item.name != 'Aln Pujo Priambodo' && (
                        <td className='join'>
                          {item.active == 0 ? (
                            <button className='join-item btn btn-xs btn-outline btn-primary' onClick={() => editUserActiveStatus(item.id, 1)} disabled={isEditLoading}>Approve</button>
                          ) : (
                            <button className='join-item btn btn-xs btn-outline btn-warning' onClick={() => editUserActiveStatus(item.id, 0)} disabled={isEditLoading}>Deactivate</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>Tidak ada data</div>
          )
        )}
      </div>
    </main>
  );
}