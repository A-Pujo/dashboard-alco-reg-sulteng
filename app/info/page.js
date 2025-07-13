'use client'

import React from 'react';
import { Users, Code, Info, Server, Layers, Settings, GitBranch } from 'lucide-react'; // Contoh ikon dari lucide-react
import Link from 'next/link';

export default function InfoPage() {
  // Informasi dummy untuk Tim Pengembang
  const teamMembers = {
    pembina: [
      { name: 'Teddy Suhartadi Permadi', title: 'Kepala Kantor Wilayah', image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg' },
    ],
    pengarah: [
      { name: 'Andi Ahmad Rivai', title: 'Change Agent/Kepala Bidang PAPK', image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg' },
    ],
    developer: [
      { name: 'Aln Pujo Priambodo', title: 'Fullstack Developer + DB Administrator', image: '/assets/img/info/pujo.jpg' },
    ],
  }

  // Informasi dummy untuk Tech Stack
  const techStack = [
    { name: 'Frontend Framework', value: 'Next.js (React)' },
    { name: 'CSS Framework', value: 'Tailwind CSS' },
    { name: 'Database', value: 'PostgreSQL (via Supabase)' },
    { name: 'Backend-as-a-Service', value: 'Supabase' },
    { name: 'Charting Library', value: 'Recharts' },
    { name: 'Icon Library', value: 'Lucide React' },
    { name: 'Deployment Platform', value: 'Vercel' },
  ]

  const appVersion = "1.0.1"
  const lastUpdated = "14 Juli 2025"

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-12">
      {/* --- Seksi 1: Tentang Aplikasi ---*/}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-1 border-gray-300 flex items-center">
          <Info className="w-6 h-6 mr-3 text-gray-600" /> Tentang Aplikasi
        </h2>
        <section className="bg-white p-6 shadow-md border-l-4 border-secondary">
          <p className="text-gray-700 leading-relaxed">
            <b>Dashboard ALCo Regional Sulawesi Tengah</b> merupakan salah satu inovasi digital yang dikembangkan untuk mendorong peningkatan kualitas fungsi RCE Kanwil Ditjen Perbendaharaan Provinsi Sulawesi Tengah. Aplikasi ini bertujuan untuk menyajikan data kinerja fiskal dan indikator ekonomi makro secara interaktif dan mudah diakses, mendukung pengambilan keputusan yang lebih cepat dan tepat.
            <br/><br/>
            Dengan Dashboard ini, pengguna dapat memantau realisasi pendapatan dan belanja APBN, menganalisis tren inflasi dan PDRB, serta mendapatkan gambaran komprehensif terkait kondisi fiskal & indikator makro-kesra regional Sulawesi Tengah. Inovasi ini diharapkan dapat menjadi alat bantu strategis dalam optimalisasi pengelolaan keuangan negara di daerah.
          </p>
        </section>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-1 border-gray-300 flex items-center">
          <Users className="w-6 h-6 mr-3 text-gray-600" /> Tim Pengembang
        </h2>
        <section>
          {/* Mapping untuk setiap kategori jabatan */}
          {Object.keys(teamMembers).map((categoryKey, catIndex) => (
            <div key={categoryKey}>
              <div className="grid grid-cols-1 md:grid-cols-2 md:gap-4">
                {teamMembers[categoryKey].map((member, memberIndex) => (
                    // <div key={`${categoryKey}-${memberIndex}`} className={`flex items-center space-x-4 py-4 bg-white mb-8 border-l-4 border-primary rounded-lg shadow-sm ${(catIndex === 2 ? '' : 'col-span-3')}`}>
                    <div key={`${categoryKey}-${memberIndex}`} className={`flex items-center space-x-4 py-4 bg-white mb-8 border-l-4 border-primary rounded-lg shadow-sm col-span-3`}>
                        <h3 className="text-lg font-semibold rotate-90 text-center capitalize border-gray-100 border-r">{categoryKey}</h3>
                        <img
                            src={member.image || '/assets/team_photos/default.jpg'}
                            alt={member.name}
                            className="w-24 h-24 rounded-full object-cover shadow-sm" // Ukuran foto lebih kecil
                        />
                        <div>
                            <p className="font-semibold text-md text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-600">{member.title}</p>
                        </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* --- Seksi 3: Tech Stack & Informasi Versi --- */}
      <div>
        <h2 className="text-xl font-bold mb-4 pb-2 border-b-1 border-gray-300 flex items-center">
          <Code className="w-6 h-6 mr-3 text-gray-600" /> Tech Stack & Versi
        </h2>
        <section className="bg-white p-6 rounded-lg shadow-md border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
              <Server className="w-4 h-4 mr-2 text-gray-600" /> Teknologi Digunakan
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              {techStack.map((tech, index) => (
                <li key={`tech-${index}`}>
                  <span className="font-medium">{tech.name}:</span> {tech.value}
                </li>
              ))}
            </ul>
          </div>

          {/* Informasi Versi */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
              <Layers className="w-4 h-4 mr-2 text-gray-600" /> Informasi Versi
            </h3>
            <ul className="text-gray-700 space-y-2">
              <li className="flex items-center">
                <GitBranch className="w-4 h-4 mr-2 text-gray-600" />
                <span className="font-medium">Versi Aplikasi: {appVersion}</span>
              </li>
              <li className="flex items-center">
                <Settings className="w-4 h-4 mr-2 text-gray-600" />
                <span className="font-medium">Pembaruan Terakhir: {lastUpdated}</span>
              </li>
              <li className="items-center text-sm text-gray-500 mt-2">
                  <p>
                    Coding dapat dicek di <Link className='text-secondary' href="https://github.com/A-Pujo/dashboard-alco-reg-sulteng.git" target='_blank'>A-Pujo/dashboard-alco-reg-sulteng</Link>
                  </p>
                  <p>Cloning is permissible 😉</p> 
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}