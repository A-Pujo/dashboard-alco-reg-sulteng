'use client'

import React from 'react'
import Link from 'next/link'
import { ExternalLink, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

// Dummy data for the table
// Struktur kolom: no, nama data, deskripsi data, tautan sumber, status, keterangan
const DATA_SOURCES = [
    {
        id: 1,
        nama_data: 'PDRB Provinsi',
        deskripsi: 'Data Produk Domestik Regional Bruto Sulawesi Tengah atas dasar harga berlaku dan konstan.',
        tautan: 'https://sulteng.bps.go.id',
        status: 'Tersedia',
        keterangan: 'Update triwulanan',
        pemilik_data: 'BPS Provinsi Sulawesi Tengah'
    },
    {
        id: 2,
        nama_data: 'Inflasi',
        deskripsi: 'Data inflasi bulanan dan tahunan gabungan kota-kota IHK di Sulawesi Tengah.',
        tautan: 'https://sulteng.bps.go.id',
        status: 'Tersedia',
        keterangan: 'Update bulanan',
        pemilik_data: 'BPS Provinsi Sulawesi Tengah'
    },
    {
        id: 3,
        nama_data: 'APBN Regional',
        deskripsi: 'Data realisasi pendapatan dan belanja negara di wilayah Sulawesi Tengah.',
        tautan: 'https://djpb.kemenkeu.go.id',
        status: 'Dalam Perbaikan',
        keterangan: 'Sedang maintenance API',
        pemilik_data: 'DJPb Provinsi Sulawesi Tengah'
    },
    {
        id: 4,
        nama_data: 'Indikator Pertanian',
        deskripsi: 'Nilai Tukar Petani (NTP) dan indeks harga yang diterima/dibayar petani.',
        tautan: 'https://sulteng.bps.go.id',
        status: 'Tersedia',
        keterangan: 'Update bulanan',
        pemilik_data: 'BPS Provinsi Sulawesi Tengah'
    }
]

export default function SumberDataPage() {
    const getStatusBadge = (status) => {
        switch (status) {
            case 'Tersedia':
                return <span className="badge badge-success gap-2 text-white"><CheckCircle className="w-3 h-3" /> Tersedia</span>
            case 'Dalam Perbaikan':
                return <span className="badge badge-warning gap-2 text-white"><AlertCircle className="w-3 h-3" /> Maintenance</span>
            case 'Tidak Tersedia':
                return <span className="badge badge-error gap-2 text-white"><XCircle className="w-3 h-3" /> Offline</span>
            default:
                return <span className="badge badge-ghost">{status}</span>
        }
    }

    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
            <div className='flex border-b border-gray-300 py-2 mb-6 items-center'>
                <h2 className='flex-1 text-xl font-bold'>Daftar Sumber Data</h2>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                <table className="table table-zebra">
                    {/* head */}
                    <thead className="bg-gray-100 uppercase text-xs font-semibold text-gray-700">
                        <tr>
                            <th className="w-16 text-center">No</th>
                            <th className="min-w-[200px]">Nama Data</th>
                            <th className="min-w-[200px]">Pemilik Data</th>
                            <th className="min-w-[300px]">Deskripsi Data</th>
                            <th className="min-w-[150px]">Tautan Sumber</th>
                            <th className="min-w-[150px]">Status</th>
                            <th className="min-w-[200px]">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {DATA_SOURCES.map((source, index) => (
                            <tr key={source.id} className="hover">
                                <th className="text-center">{index + 1}</th>
                                <td className="font-medium text-gray-900">{source.nama_data}</td>
                                <td className="text-gray-700">{source.pemilik_data}</td>
                                <td className="text-gray-600 text-sm whitespace-normal leading-relaxed">
                                    {source.deskripsi}
                                </td>
                                <td>
                                    <Link
                                        href={source.tautan}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-xs btn-outline btn-primary gap-1"
                                    >
                                        Buka Link <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </td>
                                <td>
                                    {getStatusBadge(source.status)}
                                </td>
                                <td className="text-sm text-gray-500 italic">
                                    {source.keterangan}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </main>
    )
}
