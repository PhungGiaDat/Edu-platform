import React from 'react';
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {
  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-white text-xl font-bold tracking-wide">
              📚 Edu Platform
            </h1>
          </div>
          
          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link 
                to="/" 
                className="text-white hover:bg-blue-700 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ease-in-out"
              >
                🃏 Flashcards
              </Link>
              <Link 
                to="/scan" 
                className="text-white hover:bg-blue-700 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ease-in-out"
              >
                📷 QR Scanner
              </Link>
              <Link 
                to="/ar" 
                className="text-white hover:bg-blue-700 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ease-in-out"
              >
                🔮 AR View
              </Link>
              <Link 
                to="/learn-ar" 
                className="text-white hover:bg-blue-700 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ease-in-out"
              >
                🎓 Learn AR
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-white hover:bg-blue-700 hover:text-white p-2 rounded-md">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <div className="md:hidden bg-blue-700">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link 
            to="/" 
            className="text-white hover:bg-blue-800 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
          >
            🃏 Flashcards
          </Link>
          <Link 
            to="/scan" 
            className="text-white hover:bg-blue-800 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
          >
            📷 QR Scanner
          </Link>
          <Link 
            to="/ar" 
            className="text-white hover:bg-blue-800 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
          >
            🔮 AR View
          </Link>
          <Link 
            to="/learn-ar" 
            className="text-white hover:bg-blue-800 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
          >
            🎓 Learn AR
          </Link>
          <Link 
            to="/test" 
            className="text-white hover:bg-blue-800 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
          >
            🧪 MindAR Test
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
