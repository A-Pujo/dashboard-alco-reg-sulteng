import { Menu } from "lucide-react";

export default function Header({toggleSidebar}) {
    return(
        <header className="bg-white shadow-md p-4 flex items-center justify-between z-30 fixed w-full">
          {/* Hamburger menu for mobile */}
          <button onClick={toggleSidebar} className="lg:hidden text-gray-600 hover:text-gray-900 focus:outline-none">
            <Menu className="w-7 h-7" />
          </button>
          <h1 className="text-xl font-bold text-base-content hidden md:block">Dashboard</h1>
        </header>
    )
}