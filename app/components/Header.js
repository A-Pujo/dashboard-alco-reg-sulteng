import { Menu } from "lucide-react";

export default function Header({toggleSidebar}) {
    return(
        <header className="bg-white shadow-md p-4 flex items-center justify-between z-30 fixed w-full">
          {/* Hamburger menu for mobile */}
          <button onClick={toggleSidebar} className="lg:hidden text-gray-600 hover:text-gray-900 focus:outline-none">
            <Menu className="w-7 h-7" />
          </button>
          <h1 className="text-xl font-bold text-base-content hidden md:block">Dashboard</h1>
          <div className="flex items-center md:hidden">
            <h1 className="text-xl font-bold text-base-content">Dashboard</h1>
            <img src='/assets/img/icon_title_alco_reg.png' className='w-8 ml-4' alt="ALCo Dashboard Icon" />
          </div>
        </header>
    )
}