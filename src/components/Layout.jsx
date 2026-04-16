import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 relative overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-indigo-900 text-white p-4 flex items-center shrink-0 shadow-md">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-indigo-800 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="ml-4 font-bold text-lg">HR FMS</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="container mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>

        <footer className="bg-white border-t border-gray-200 py-3 px-4 flex-shrink-0">
          <div className="container mx-auto text-center text-sm text-gray-600">
            Powered by{' '}
            <a 
              href="https://www.botivate.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Botivate
            </a>
          </div>
        </footer>
      </div>

    
    </div>
  );
};

export default Layout;