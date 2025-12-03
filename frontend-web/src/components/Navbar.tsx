import React, { useState } from 'react';
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Main Navbar */}
      <nav className="h-16 bg-gray-800 text-white flex items-center px-2 sm:px-4 shadow-md flex-shrink-0 relative z-50">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <Link to="/" className="flex items-center flex-shrink-0">
              <h1 className="text-white text-lg sm:text-xl font-bold tracking-wide">
                Edu Platform
              </h1>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
              <Link
                to="/"
                className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Flashcards
              </Link>
              <Link
                to="/scan"
                className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Scan
              </Link>
              <Link
                to="/learn-ar"
                className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                AR
              </Link>
              <Link
                to="/courses"
                className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Courses
              </Link>
              <Link
                to="/profile"
                className="text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Profile
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-white hover:bg-gray-700 p-2 rounded-md"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Menu - Conditional render */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-gray-700 shadow-lg z-40">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:bg-gray-600 block px-3 py-2 rounded-md text-base font-medium"
            >
              Flashcards
            </Link>
            <Link
              to="/scan"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:bg-gray-600 block px-3 py-2 rounded-md text-base font-medium"
            >
              QR Scanner
            </Link>
            <Link
              to="/learn-ar"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:bg-gray-600 block px-3 py-2 rounded-md text-base font-medium"
            >
              Learn AR
            </Link>
            <Link
              to="/courses"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:bg-gray-600 block px-3 py-2 rounded-md text-base font-medium"
            >
              Courses
            </Link>
            <Link
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-white hover:bg-gray-600 block px-3 py-2 rounded-md text-base font-medium"
            >
              Profile
            </Link>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
