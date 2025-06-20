'use client'
import React, { useState, useEffect } from 'react'
import Sidebar from "./Sidebar"
import Header from "./Header"
import Footer from './Footer'

export default function Layout({children}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [activePLink, setActivePLink] = useState('beranda')
    const toggleSidebar = () => {
      setIsSidebarOpen(!isSidebarOpen)
    }
  
    return (
        <div className="flex h-screen w-screen bg-base-100 font-inter">
            <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} activePLink={activePLink} setActivePLink={setActivePLink}/>
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Header */}
                <Header toggleSidebar={toggleSidebar} />

                {/* Overlay for mobile sidebar */}
                {isSidebarOpen && (
                    <div className="fixed inset-0 bg-black opacity-50 z-30 lg:hidden" onClick={toggleSidebar}></div>
                )}

                {/* Dashboard Content */}
                {children}

                <Footer />
            </div>
        </div>
    )
}