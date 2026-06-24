'use client';

import { useAuthStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spinner } from '../ui';

// Faculty users only have access to these routes; redirect everything else to /reservation
const FACULTY_ALLOWED_PATHS = ['/reservation', '/schedule'];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuthStore();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (loading || isRedirecting) return;

    if (!user) {
      const path = window.location.pathname + window.location.search;
      const from = path === '/' ? '/dashboard' : path;
      setIsRedirecting(true);
      router.push(`/signin?from=${encodeURIComponent(from)}`);
      return;
    }

    if (!userProfile) return;

    // Faculty users are locked to their own routes
    if (userProfile.role === 'faculty') {
      const current = window.location.pathname;
      const allowed = FACULTY_ALLOWED_PATHS.some((p) => current.startsWith(p));
      if (!allowed) {
        setIsRedirecting(true);
        router.replace('/reservation');
      }
    }
  }, [loading, user, userProfile, router, isRedirecting]);

  if (loading || isRedirecting || (user && !userProfile)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
