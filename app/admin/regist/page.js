'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Info, CalendarDays, Filter, RotateCcw, CircleCheckBig } from 'lucide-react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'
import ToastTemplate from '@/app/components/ToastTemplate'
import { supabase } from '@/app/lib/supabaseClient'
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

export default function RegistUser() {
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [unit, setUnit] = useState('Kanwil DJPb Provinsi Sulawesi Tengah')

  const [captchaText, setCaptchaText] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setCaptchaText(generateCaptchaText());
  }, [])

  // Fungsi untuk me-refresh CAPTCHA
  const refreshCaptcha = useCallback(() => {
    setCaptchaText(generateCaptchaText())
    setCaptchaInput('')
  }, [])

  const handleRegist = useCallback( async (e) => {
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
      const {data, error} = await supabase.from('users').insert([{
        'name': nama,
        'email': email,
        'password': password,
        'unit': unit,
        'active': 0
      }])

      if(error) {
        if (error.code === '23505' && error.message.includes('email')) {
          toast.custom((t) => (
            <ToastTemplate t={t} type="error" title='Email sudah terdaftar' description='Hubungi admin untuk info lebih lanjut' />
          ))
        } else {
          toast.custom((t) => (
            <ToastTemplate t={t} type="error" title='Registrasi gagal' description='Hubungi admin untuk info lebih lanjut' />
          ))
        }
        console.warn('Supabase insert error:', error)
        refreshCaptcha()
      } else {
        toast.custom((t) => (
          <ToastTemplate t={t} type="success" title='Registrasi Sukses!' description='Tunggu approval dari Admin ya' />
        ))

        setTimeout(() => {
          redirect('/admin', RedirectType.replace)
        }, 1000);
      }
    } catch (err) {
      console.warn(err)
    } finally {
      setIsLoading(false)
    }
  }, [captchaInput, captchaText, refreshCaptcha])

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <div>
        <Toaster position="bottom-right" reverseOrder={false} />
      </div>
      <div className="card w-full bg-white shadow-xl bg-base-100 text-base-content rounded-xl overflow-hidden flex flex-col md:flex-row">
        <figure className="hidden md:block md:w-2/5 h-auto">
          <img
            src="https://cdn.prod.website-files.com/5d5e2ff58f10c53dcffd8683/5d99f909e288d8f015a6756c_composition-20-p-1080.png"
            alt="Side Login Image"
            className="w-full h-full object-cover"
          />
        </figure>

        <div className="card-body w-full md:w-3/5 p-8 flex flex-col justify-center">
          <form onSubmit={handleRegist}>
            <fieldset className="fieldset w-full">
              <legend className="fieldset-legend text-xl font-bold">Register</legend>

              <label className="label">Nama</label>
              <input type="nama" className="input w-full" placeholder="pujo" required onChange={(e) => {
                setNama(e.target.value)
              }}/>

              <label className="label">Email</label>
              <input type="email" className="input w-full" placeholder="pujo@pujo.com" required onChange={(e) => {
                setEmail(e.target.value)
              }} />

              <label className="label">Password</label>
              <input type="password" className="input w-full" placeholder="Password" required onChange={(e) => {
                let hashedPassword = cryptedHash(e.target.value)
                setPassword(hashedPassword)
              }} />

              <label className="label">Unit</label>
              <select className='select w-full' defaultValue={unit} onChange={(e) => {setUnit(e.target.value)}} required>
                <option value="Kanwil DJPb Provinsi Sulawesi Tengah">Kanwil DJPb Provinsi Sulawesi Tengah</option>
                <option value="KPPN Palu">KPPN Palu</option>
                <option value="KPPN Poso">KPPN Poso</option>
                <option value="KPPN Tolitoli">KPPN Tolitoli</option>
                <option value="KPPN Luwuk">KPPN Luwuk</option>
              </select>

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
                    <RotateCcw className='w-5 h-5'/>
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

              <button className="btn btn-neutral mt-4" disabled={isLoading}>{isLoading ? (<span className="loading loading-spinner loading-sm"></span>) : 'Register'}</button>
              <div className='text-center'>
                <Link href={'/admin'} className='text-xs text-secondary font-bold'>Sudah punya Akun? Login</Link>
              </div>
            </fieldset>
          </form>
        </div>
      </div>
    </main>
  )
}