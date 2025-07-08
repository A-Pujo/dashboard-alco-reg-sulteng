'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Info, CalendarDays, Filter, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '../lib/supabaseClient'
import ToastTemplate from '../components/ToastTemplate'
import { redirect, RedirectType } from 'next/navigation'

const Hashes = require('jshashes')

const cryptedHash = (password) => {
  var hashed = new Hashes.MD5().hex(password)
  return hashed
}

const generateCaptchaText = (length = 6) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export default function DashboardAdminLogin() {
  useEffect(() => {
    let loginInfo = sessionStorage.getItem('loginInfo')
    if(loginInfo) {
      redirect('/admin/panel', RedirectType.replace)
    }
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaText, setCaptchaText] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setCaptchaText(generateCaptchaText())
  }, [])

  const refreshCaptcha = useCallback(() => {
    setCaptchaText(generateCaptchaText())
    setCaptchaInput('')
  }, []);

  const handleLogin = useCallback( async (e) => {
    e.preventDefault()
    setIsLoading(true)

    if (captchaInput !== captchaText) {
      toast.custom((t) => (
        <ToastTemplate t={t} type="error" title='CAPTCHA salah' description='Silakan coba lagi.' />
      ))
      refreshCaptcha()
      setIsLoading(false)
      return
    }

    try {
      const {data, error} = await supabase.from('users').select().eq('email', email)
      if(!data?.[0]) {
        toast.custom((t) => (
          <ToastTemplate t={t} type="error" title='Login gagal' description='Email belum pernah didaftarkan' />
        ))
        refreshCaptcha()
        return
      } else if (error) {
        toast.custom((t) => (
          <ToastTemplate t={t} type="error" title='Login gagal' description='Hubungi admin untuk info lebih lanjut' />
        ))
        console.warn('Supabase login error:', error)
        refreshCaptcha()
      } else {
        if(data[0].password != password) {
          toast.custom((t) => (
            <ToastTemplate t={t} type="error" title='Login gagal' description='Kombinasi email dan password tidak sesuai' />
          ))
          refreshCaptcha()
          return
        } if (data[0].active != 1) {
          toast.custom((t) => (
            <ToastTemplate t={t} type="error" title='Tidak dapat masuk' description='Akunmu belum diapprove oleh admin' />
          ))
          refreshCaptcha()
          return
        } else {
          toast.custom((t) => (
            <ToastTemplate t={t} type="success" title='Login Sukses!' description='Saatnya terbang lebih jauh!' />
          ))

          sessionStorage.setItem('loginInfo', JSON.stringify(data[0]))
  
          setTimeout(() => {
            redirect('/admin/panel', RedirectType.replace)
          }, 1000);
        }
      }

    } catch (err) {
      console.warn(err)
    } finally {
      setIsLoading(false)
    }

  }, [captchaInput, captchaText, refreshCaptcha]);

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
    <div>
      <Toaster position="bottom-right" reverseOrder={false} />
    </div>
    <div className="card w-full bg-white shadow-xl bg-base-100 text-base-content rounded-xl overflow-hidden flex flex-col md:flex-row">
      <figure className="hidden md:block md:w-2/5 h-auto">
        <img
          src="https://cdn.prod.website-files.com/5d5e2ff58f10c53dcffd8683/5d99f770574a7de99f266586_composition-10.svg"
          alt="Side Login Image"
          className="w-full h-full object-cover"
        />
      </figure>

      <div className="card-body w-full md:w-3/5 p-8 flex flex-col justify-center">
        <form onSubmit={handleLogin}>
          <fieldset className="fieldset w-full">
            <legend className="fieldset-legend text-xl font-bold">Admin Panel - Login</legend>

            <label className="label">Email</label>
            <input type="email" className="input w-full" placeholder="pujo@pujo.com" required onChange={(e) => {
              setEmail(e.target.value)
            }} />

            <label className="label">Password</label>
            <input type="password" className="input w-full" placeholder="Password" required onChange={(e) => {
              let hashedPassword = cryptedHash(e.target.value)
              setPassword(hashedPassword)
            }} />

            <div className="form-control">
              <label className="label">
                <span className="label-text">CAPTCHA</span>
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 input input-bordered flex items-center justify-center font-mono text-lg font-bold tracking-widest bg-base-300 text-primary rounded-lg select-none">
                  {captchaText}
                </div>
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  className="btn btn-ghost btn-sm"
                >
                  <RotateCcw className='w-5 h-5' />
                </button>
              </div>
              <input
                type="text"
                id="captcha"
                placeholder="Masukkan teks CAPTCHA"
                className="input input-bordered w-full mt-2 rounded-lg"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                required
              />
            </div>

            <button className="btn btn-neutral mt-4" disabled={isLoading}>{isLoading ? (<span className="loading loading-spinner loading-sm"></span>) : 'Login'}</button>
            <div className='text-center'>
              <Link href={'/admin/regist'} className='text-xs text-secondary font-bold'>Belum punya Akun? Register</Link>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  </main>
  )
}