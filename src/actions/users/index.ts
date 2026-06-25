'use server';

import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { type Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// password lives in Supabase Auth, not in the DB — intersect it in for create only
export type CreateProfileInput = Omit<
  Prisma.ProfileCreateInput,
  'id' | 'auth_id' | 'created_at' | 'updated_at'
> & { password: string };

export type UpdateProfileInput = Omit<
  Prisma.ProfileUpdateInput,
  'id' | 'auth_id' | 'created_at' | 'updated_at'
>;

export async function getProfiles(query?: string) {
  return prisma.profile.findMany({
    where: query
      ? {
          OR: [
            { full_name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { created_at: 'desc' },
  });
}

export async function getProfile(id: string) {
  return prisma.profile.findUnique({ where: { id } });
}

export async function getProfileByAuthId(authId: string) {
  return prisma.profile.findUnique({ where: { auth_id: authId } });
}

export async function createProfile(data: CreateProfileInput) {
  const { password, ...profileData } = data;

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: profileData.email,
    password,
    email_confirm: true,
  });

  if (authError) throw new Error(authError.message);

  const auth_id = authData.user.id;

  try {
    const profile = await prisma.profile.create({
      data: { ...profileData, auth_id },
    });
    revalidatePath('/users');
    return profile;
  } catch (err) {
    await supabaseAdmin.auth.admin.deleteUser(auth_id);
    throw err;
  }
}

export async function updateProfile(id: string, data: UpdateProfileInput) {
  const profile = await prisma.profile.update({ where: { id }, data });
  revalidatePath('/users');
  return profile;
}

export async function toggleProfileStatus(id: string, current: boolean) {
  const profile = await prisma.profile.update({
    where: { id },
    data: { is_active: !current },
  });
  revalidatePath('/users');
  return profile;
}

export async function deleteProfile(id: string) {
  const profile = await prisma.profile.findUnique({
    where: { id },
    select: { auth_id: true },
  });
  if (!profile) throw new Error('User not found');

  await prisma.profile.delete({ where: { id } });

  await supabaseAdmin.auth.admin.deleteUser(profile.auth_id);

  revalidatePath('/users');
}

export async function changeUserPassword(authId: string, newPassword: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(authId, {
    password: newPassword,
  });
  if (error) throw new Error(error.message);
}
