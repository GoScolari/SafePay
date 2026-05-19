'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { clearToken } from '@/lib/auth';
import type { Dispute } from '@/lib/types';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    api.get<Dispute[]>('/admin/disputes')
      .then((r) => {
        const count = r.data.filter((d) => d.status !== 'resolved').length;
        setPendingCount(count);
      })
      .catch(() => {});
  }, [pathname]);

  const handleLogout = () => {
    clearToken();
    router.replace('/login');
  };

  const links = [
    { href: '/disputes',     label: 'Disputas',      icon: '⚖️',  badge: pendingCount },
    { href: '/transactions', label: 'Transacciones', icon: '📋',  badge: 0 },
    { href: '/users',        label: 'Usuarios',      icon: '👥',  badge: 0 },
  ];

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-100">
        <span className="text-lg font-bold text-indigo-600">SafePay</span>
        <span className="block text-xs text-gray-400 mt-0.5">Panel Admin</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span>{link.icon}</span>
                {link.label}
              </span>
              {link.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <span>🚪</span> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
