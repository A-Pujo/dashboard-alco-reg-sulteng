'use client'

import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart
} from 'recharts'
import { Users, DollarSign, Activity, ShoppingCart, Menu, X, Home, BarChart2, Settings, LogOut, InfoIcon, Coins, ShoppingBag } from 'lucide-react'
import { supabase } from './lib/supabaseClient'

export default function Dashboard() {
  const [PDRBData, setPDRBData] = useState([])
  const [inflasiData, setInflasiData] = useState([])
  const [inflasiUniqueDaerah, setInflasiUniqueDaerah] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const formatDateToQuarter = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      if (dateString.match(/^\d{4} Q[1-4]$/)) {
        return dateString
      }
      return null
    }
    const year = date.getFullYear()
    const month = date.getMonth()
    const quarter = Math.floor(month / 3) + 1
    return `${year} Q${quarter}`
  }

  const formatDateToMonth = (dateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      const matchMonth = dateString.match(/^(\d{4})-(\d{1,2})$/)
      if (matchMonth) {
        const year = parseInt(matchMonth[1])
        const monthNum = parseInt(matchMonth[2])
        const formattedMonth = (monthNum + 1).toString().padStart(2, '0')
        return `${year}-${formattedMonth}`
      }
      return null
    }
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return `${year}-${month}`
  }

  const getLineColor = (index) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#f55d3e', '#00bcd4', '#9c27b0', '#a4d8c2', '#d8a4c2', '#c2d8a4', '#d8c2a4'
    ];
    return colors[index % colors.length];
  };
  

  const fetchPDRBData = async ( waktuFilter = ['2024-01-01', '2024-12-31'] ) => {
    setIsLoading(true)
    try {
      let { data, error } = await supabase.from('pdrb_sulteng_agg')
      .select('*')
      .gte('waktu', waktuFilter[0])
      .lte('waktu', waktuFilter[1])
      .order('waktu', {ascending: true})

      if (error) {
        throw error
      }

      const transformedData = data.map(item => ({
        ...item,
        waktu: formatDateToQuarter(item.waktu)
      }))

      setPDRBData(transformedData)
      // console.log(transformedData)
    } catch (err) {
      console.warn(err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchInflasi = async ( waktuFilter = ['2024-01-01', '2024-12-31'] ) => {
    setIsLoading(true)
    try{
      let { data, error } = await supabase.from('inflasi')
      .select('*')
      .gte('waktu', waktuFilter[0])
      .lte('waktu', waktuFilter[1])
      .order('waktu', {ascending: true})
      
      if(error) {
        throw error
      }

      const uniqueDaerah = new Set()
      data.forEach(item => uniqueDaerah.add(item.daerah))
      setInflasiUniqueDaerah(Array.from(uniqueDaerah))

      const groupedByWaktu = new Map()
      data.forEach(item => {
        const waktuBulanan = formatDateToMonth(item.waktu)
        if(!groupedByWaktu.has(waktuBulanan)) {
          groupedByWaktu.set(waktuBulanan, {})
        }
        groupedByWaktu.get(waktuBulanan)[item.daerah] = item.inflasi_tahunan
      })

      const transformedData = []
      const sortedMonthKeys = Array.from(groupedByWaktu.keys()).sort((a, b) => a.localeCompare(b))
      sortedMonthKeys.forEach(key => {
        const entry = { waktu: key }
        const daerahDataForWaktu = groupedByWaktu.get(key)

        Array.from(uniqueDaerah).forEach(daerah => {
          entry[daerah] = daerahDataForWaktu[daerah] !== undefined ? daerahDataForWaktu[daerah] : null;
        });
        transformedData.push(entry);
      })
      
      setInflasiData(transformedData)
    } catch (err) {
      console.warn(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPDRBData()
    fetchInflasi()
  }, [])

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      <h2 className='text-xl font-bold border-b border-gray-300 py-2 mb-4'>Rangkuman Kinerja Fiskal</h2>

      {/* Key Metrics Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Metric Card 1: Total Users */}
        <div className="border-l-4 border-primary bg-white p-6 rounded-lg shadow-md flex items-center justify-between transition-transform transform hover:scale-101">
          <div>
            <p className="text-sm font-medium text-gray-500">Penerimaan Negara</p>
            <p className="text-3xl font-semibold text-gray-900">1,234</p>
          </div>
          <DollarSign className="w-10 h-10 text-yellow-500" />
        </div>

        {/* Metric Card 2: Total Revenue */}
        <div className="border-l-4 border-primary bg-white p-6 rounded-lg shadow-md flex items-center justify-between transition-transform transform hover:scale-101">
          <div>
            <p className="text-sm font-medium text-gray-500">Belanja Negara</p>
            <p className="text-3xl font-semibold text-gray-900">$89,000</p>
          </div>
          <ShoppingCart className="w-10 h-10 text-info" />
        </div>

        {/* Metric Card 3: Sales Today */}
        <div className="border-l-4 border-secondary bg-white p-6 rounded-lg shadow-md flex items-center justify-between transition-transform transform hover:scale-101">
          <div>
            <p className="text-sm font-medium text-gray-500">Pendapatan Daerah</p>
            <p className="text-3xl font-semibold text-gray-900">256</p>
          </div>
          <Coins className="w-10 h-10 text-yellow-500" />
        </div>

        {/* Metric Card 4: Active Now */}
        <div className="border-l-4 border-secondary bg-white p-6 rounded-lg shadow-md flex items-center justify-between transition-transform transform hover:scale-101">
          <div>
            <p className="text-sm font-medium text-gray-500">Belanja Daerah</p>
            <p className="text-3xl font-semibold text-gray-900">12</p>
          </div>
          <ShoppingBag className="w-10 h-10 text-info" />
        </div>
      </section>

      <h2 className='text-xl font-bold border-b border-gray-300 py-2 mb-4'><i>Overview</i> Ekonomi</h2>

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales and Revenue Chart */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">PDRB Nominal</h2>
          {(PDRBData.length > 0) ? (
            <ResponsiveContainer className={`text-xs`} width="100%" height={300}>
              <ComposedChart data={PDRBData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="waktu" axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId='left'
                  dataKey="adhb"
                  axisLine={false}
                  tickLine={false}
                  label={{ 
                    value: 'Miliar', 
                    style: { textAnchor: 'middle' }, 
                    angle: -90, 
                    position: 'left', 
                    offset: 0
                  }}
                />
                <YAxis
                  yAxisId='right'
                  dataKey="laju_tahunan"
                  axisLine={false}
                  tickLine={false}
                  orientation='right'
                  label={{ 
                    value: 'Persen (%)', 
                    style: { textAnchor: 'middle' }, 
                    angle: -90, 
                    position: 'right', 
                    offset: 0
                  }}
                />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar yAxisId='left' dataKey="adhb" fill="#8884d8" name="PDRB" barSize={30}/>
                <Line yAxisId="right" name='Laju Tahunan' dataKey="laju_tahunan" stroke="#82ca9d" strokeWidth={4} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center skeleton h-[300px] w-full">
              <span className="loading loading-spinner text-secondary loading-lg"></span>
            </div>
          )}
        </div>

        {/* Inflasi Chart */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Inflasi</h2>
          {(inflasiData.length > 0) ? (
            <ResponsiveContainer width="100%" height={300} className={`text-xs`}>
              <LineChart data={inflasiData} >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="waktu" 
                  axisLine={false}
                  tickLine={false}
                  label={{ 
                    style: { textAnchor: 'middle' }, 
                    angle: -90,
                    offset: 0
                  }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false} 
                  label={{ 
                    value: 'Persen (%)', 
                    style: { textAnchor: 'middle' }, 
                    angle: -90, 
                    position: 'left', 
                    offset: 0
                  }}
                />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                {inflasiUniqueDaerah.map((daerah, index) => (
                  <Line type="monotone" key={daerah} dataKey={daerah} stroke={getLineColor(index)} activeDot={{ r: 8 }} strokeWidth={3} name={`${daerah}`} />
                )
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center skeleton h-[300px] w-full">
              <span className="loading loading-spinner text-secondary loading-lg"></span>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
