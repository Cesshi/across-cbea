'use client';

import { cn } from '@/lib';
import { useSidebarStore } from '@/store';
import {
  BookOpen,
  Building2,
  ChevronDown,
  ClipboardList,
  Download,
  Eraser,
  KeyRound,
  LayoutDashboard,
  Upload,
  Users,
  Wrench,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { version } from '../../../package.json';

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  badge?: number;
  subItems?: { name: string; path: string; icon?: React.ReactNode }[];
};

const navItems: NavItem[] = [
  {
    icon: <LayoutDashboard size={20} />,
    name: 'Dashboard',
    path: '/dashboard',
  },
  {
    icon: <BookOpen size={20} />,
    name: 'Schedule',
    path: '/schedule',
  },
  {
    icon: <ClipboardList size={20} />,
    name: 'Reservations',
    path: '/reservations',
  },
  {
    icon: <ClipboardList size={20} />,
    name: 'Requests',
    path: '/requests',
  },
  {
    icon: <Users size={20} />,
    name: 'Users',
    path: '/users',
  },
  {
    icon: <Building2 size={20} />,
    name: 'Rooms',
    path: '/rooms',
  },
  {
    icon: <Wrench size={20} />,
    name: 'Tools',
    subItems: [
      { name: 'Import Schedule', path: '/tools/import', icon: <Upload size={14} /> },
      { name: 'Export Data', path: '/tools/export', icon: <Download size={14} /> },
      { name: 'Change Password', path: '/tools/change-password', icon: <KeyRound size={14} /> },
      { name: 'Clear Data', path: '/tools/clear', icon: <Eraser size={14} /> },
    ],
  },
];

export function AppSidebar() {
  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    openSubmenu,
    setIsHovered,
    toggleSubmenu,
    setOpenSubmenu,
  } = useSidebarStore();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const isVisible = isExpanded || isHovered || isMobileOpen;

  const isActive = useCallback(
    (path?: string) => {
      if (!path) return false;
      if (path === '/dashboard') return pathname === '/dashboard';
      return pathname.startsWith(path);
    },
    [pathname]
  );

  useEffect(() => {
    const activeParent = navItems.find((item) =>
      item.subItems?.some((sub) => pathname.startsWith(sub.path))
    );
    setOpenSubmenu(activeParent?.name ?? null);
  }, [pathname]);

  return (
    <aside
      ref={sidebarRef}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fixed top-0 left-0 z-2 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-gray-900',
        isVisible ? 'w-72.5' : 'w-20',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center border-b border-gray-200 py-4 dark:border-gray-800',
          isVisible ? 'justify-start px-6' : 'justify-center px-4',
          isMobileOpen && 'mt-16'
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/across-logo.png"
            alt="ACROSS Logo"
            width={48}
            height={48}
            sizes="48px"
            className="object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {isVisible && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">ACROSS</span>
              <span className="text-xs text-gray-500">MMSU-CBEA</span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.name}>
              {item.subItems ? (
                <>
                  <button
                    onClick={() => toggleSubmenu(item.name)}
                    className={cn(
                      'menu-item w-full',
                      openSubmenu === item.name ? 'menu-item-active' : 'menu-item-inactive',
                      !isVisible && 'lg:justify-center'
                    )}
                  >
                    <span
                      className={
                        openSubmenu === item.name
                          ? 'menu-item-icon-active'
                          : 'menu-item-icon-inactive'
                      }
                    >
                      {item.icon}
                    </span>
                    {isVisible && (
                      <>
                        <span className="menu-item-text flex-1 text-start">{item.name}</span>
                        <ChevronDown
                          size={16}
                          className={cn(
                            'transition-transform duration-200',
                            openSubmenu === item.name && 'rotate-180'
                          )}
                        />
                      </>
                    )}
                  </button>

                  {isVisible && openSubmenu === item.name && (
                    <ul className="mt-1 ml-9 flex flex-col gap-1">
                      {item.subItems.map((sub) => (
                        <li key={sub.name}>
                          <Link
                            href={sub.path}
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-4 py-2 text-xs transition',
                              isActive(sub.path)
                                ? 'text-brand-500 dark:text-brand-400 font-medium'
                                : 'text-gray-500 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white'
                            )}
                          >
                            {sub.icon && <span>{sub.icon}</span>}
                            {sub.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <Link
                  href={item.path!}
                  className={cn(
                    'menu-item',
                    isActive(item.path) ? 'menu-item-active' : 'menu-item-inactive',
                    !isVisible && 'lg:justify-center'
                  )}
                >
                  <span
                    className={
                      isActive(item.path) ? 'menu-item-icon-active' : 'menu-item-icon-inactive'
                    }
                  >
                    {item.icon}
                  </span>
                  {isVisible && <span className="menu-item-text flex-1">{item.name}</span>}
                  {isVisible && item.badge != null && item.badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-500 px-1 text-xs font-semibold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      {isVisible && (
        <div className="flex flex-col border-t border-gray-200 p-4 dark:border-gray-800">
          <p className="text-center text-xs text-gray-500">MMSU-CBEA © 2026</p>
          <p className="text-center text-xs text-gray-400 dark:text-gray-600">Version {version}</p>
        </div>
      )}
    </aside>
  );
}
