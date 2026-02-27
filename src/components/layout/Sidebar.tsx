'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { HiMenu } from 'react-icons/hi';

const navLinks = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Sales', href: '/sales' },
  { name: 'Inventory', href: '/inventory' },
  { name: 'Messages', href: '/messages' },
  { name: 'Analytics', href: '/analytics' },
  { name: '🔔 Notificaciones', href: '/notifications' },
  { name: 'Settings', href: '/settings' },
];


export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Hamburger */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          className="text-gray-800 bg-white p-2 rounded shadow"
          onClick={() => setIsOpen(!isOpen)}
        >
          <HiMenu className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white shadow-lg z-40 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="p-6 text-2xl font-bold border-b border-gray-200">
          WappBot
        </div>
        <nav className="flex flex-col gap-1 mt-4 px-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`p-2 rounded-md text-sm font-medium transition-colors ${pathname === link.href
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                }`}
              onClick={() => setIsOpen(false)} // Close on mobile nav
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}

