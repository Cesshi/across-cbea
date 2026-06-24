'use server';

import { prisma } from '@/lib/prisma';

export async function provisionGoogleUser(
  authId: string,
  email: string,
  fullName: string | null
): Promise<{ role: string }> {
  // Return early if profile already exists (idempotent — handles returning users)
  const existing = await prisma.profile.findUnique({ where: { auth_id: authId } });
  if (existing) return { role: existing.role };

  try {
    const profile = await prisma.profile.create({
      data: {
        auth_id: authId,
        email,
        full_name: fullName ?? '',
        role: 'faculty',
        is_active: true,
      },
    });
    return { role: profile.role };
  } catch (err: unknown) {
    // P2002 = unique constraint — email already exists from a password-based account
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in (err as Record<string, unknown>) &&
      (err as Record<string, unknown>).code === 'P2002'
    ) {
      const byEmail = await prisma.profile.findFirst({ where: { email } });
      if (byEmail) return { role: byEmail.role };
    }
    throw err;
  }
}
