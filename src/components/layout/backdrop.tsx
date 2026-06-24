'use client';

import { useSidebarStore } from '@/store';

export function Backdrop() {
  const { isMobileOpen, closeMobile } = useSidebarStore();

  if (!isMobileOpen) return null;

  return <div className="fixed inset-0 z-1 bg-gray-900/50 lg:hidden" onClick={closeMobile} />;
}
