import { useState } from 'react';
import { FileText, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const getLinkClassName = (path: string) => 
    `text-sm font-medium transition-colors hover:text-blue-600 ${
      location.pathname === path ? 'text-blue-600' : 'text-gray-600'
    }`;

  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo MAN IC */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-700 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-blue-900">PDF Tools</h1>
          </div>
        </Link>

        {/* Grup Kanan: Navigasi dan Tombol Hamburger */}
        <div className="flex items-center space-x-2">
          {/* Navigasi Desktop (tidak diubah) */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className={getLinkClassName('/')}>Beranda</Link>
            <Link to="/about" className={getLinkClassName('/about')}>Tentang</Link>
            <Link to="/faq" className={getLinkClassName('/faq')}>FAQ</Link>
            <Link to="/contact" className={getLinkClassName('/contact')}>Kontak</Link>
          </nav>

          {/* 3. Tombol Hamburger (hanya muncul di mobile) */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="h-9 w-9 p-0"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Menu Mobile Dropdown */}
      {isMenuOpen && (
        <nav className="md:hidden bg-white border-t border-blue-100 px-4 pt-2 pb-4 flex flex-col space-y-2">
          <Link to="/" onClick={() => setIsMenuOpen(false)} className={getLinkClassName('/')}>Beranda</Link>
          <Link to="/about" onClick={() => setIsMenuOpen(false)} className={getLinkClassName('/about')}>Tentang</Link>
          <Link to="/faq" onClick={() => setIsMenuOpen(false)} className={getLinkClassName('/faq')}>FAQ</Link>
          <Link to="/contact" onClick={() => setIsMenuOpen(false)} className={getLinkClassName('/contact')}>Kontak</Link>
        </nav>
      )}
    </header>
  );
}