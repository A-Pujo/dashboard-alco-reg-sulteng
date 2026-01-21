import React, { useState, useEffect } from "react";
import {
  Users,
  ShoppingCart,
  X,
  Home,
  BarChart2,
  Settings,
  InfoIcon,
  Wallet,
  LayoutDashboard,
  UserCog,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Sidebar({
  isSidebarOpen,
  toggleSidebar,
  activePLink,
  setActivePLink,
}) {
  const pathname = usePathname();

  // Keep activePLink in sync with the current pathname (covers back/forward and programmatic navigation)
  useEffect(() => {
    if (!setActivePLink) return;
    const seg = (pathname || "").split("/")[1];
    if (seg && seg.length > 0) setActivePLink(seg);
    else setActivePLink("beranda");
  }, [pathname, setActivePLink]);
  return (
    <aside
      className={`fixed inset-y-0 overflow-y-auto left-0 w-64 bg-base-300 text-black transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-40 lg:z-auto`}
    >
      <div className="p-6 flex items-center justify-between border-b border-gray-300">
        <div>
          <h2 className="text-2xl font-bold">DASHBOARD</h2>
          <div className="flex">
            {/* <LayoutDashboard className='flex-none text-accent w-8 h-8 self-center mr-4'/> */}
            <h3 className="flex-1 text-md">ALCo Regional Sulawesi Tengah</h3>
            <img
              src="/assets/img/icon_title_alco_reg.png"
              className="w-8 self-center ml-4"
            />
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          className="lg:hidden text-gray-500 focus:outline-none"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="mt-8 mb-2 h-3/4">
        <Link
          href="/"
          className={`flex items-center px-6 py-3 text-base-content ${activePLink == `beranda` && `bg-base-200`
            } hover:bg-base-200 hover:text-base-content rounded-l-full transition-colors duration-200`}
          onClick={() => {
            setActivePLink("beranda");
            toggleSidebar();
          }}
        >
          <Home className="w-5 h-5 mr-3" />
          Beranda
        </Link>
        <Link
          href="/fiskal"
          className={`flex items-center px-6 py-3 text-base-content ${activePLink == `fiskal` && `bg-base-200`
            } hover:bg-base-200 hover:text-base-content rounded-l-full transition-colors duration-200 mt-2`}
          onClick={() => {
            setActivePLink("fiskal");
            toggleSidebar();
          }}
        >
          <Wallet className="w-5 h-5 mr-3" />
          Kinerja Fiskal
        </Link>
        <Link
          href="/ekonomi"
          className={`flex items-center px-6 py-3 text-base-content ${activePLink == `ekonomi` && `bg-base-200`
            } hover:bg-base-200 hover:text-base-content rounded-l-full transition-colors duration-200 mt-2`}
          onClick={() => {
            setActivePLink("ekonomi");
            toggleSidebar();
          }}
        >
          <BarChart2 className="w-5 h-5 mr-3" />
          Kondisi Perekonomian
        </Link>
        <Link
          href="/makro"
          className={`flex items-center px-6 py-3 text-base-content ${activePLink == `makro` && `bg-base-200`
            } hover:bg-base-200 hover:text-base-content rounded-l-full transition-colors duration-200 mt-2`}
          onClick={() => {
            setActivePLink("makro");
            toggleSidebar();
          }}
        >
          <Users className="w-5 h-5 mr-3" />
          Data Makro
        </Link>
        <Link
          href="/analisis-tematik"
          className={`flex items-center px-6 py-3 text-base-content ${activePLink == `analisis-tematik` && `bg-base-200`
            } hover:bg-base-200 hover:text-base-content rounded-l-full transition-colors duration-200 mt-2`}
          onClick={() => {
            setActivePLink("analisis-tematik");
            toggleSidebar();
          }}
        >
          <Settings className="w-5 h-5 mr-3" />
          Analisis Tematik
        </Link>

        <Link
          href="/info"
          className={`flex items-center px-6 py-3 text-base-content  ${activePLink == `info` && `bg-base-200`
            } hover:bg-base-200 hover:text-base-content rounded-l-full transition-colors duration-200 mt-2`}
          onClick={() => {
            setActivePLink("info");
            toggleSidebar();
          }}
        >
          <InfoIcon className="w-5 h-5 mr-3" />
          Info
        </Link>
        <Link
          href="/admin"
          className={`flex items-center px-6 py-3 text-base-content  ${activePLink == `admin` && `bg-base-200`
            } hover:bg-base-200 hover:text-base-content rounded-l-full border-y border-gray-300 transition-colors duration-200 mt-2`}
          onClick={() => {
            setActivePLink("admin");
            toggleSidebar();
          }}
        >
          <UserCog className="w-5 h-5 mr-3" />
          Admin
        </Link>
      </nav>
    </aside>
  );
}
