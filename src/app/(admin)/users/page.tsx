'use client';

import { PageBreadcrumb } from '@/components/common';
import {
  useCreateProfile,
  useDeleteProfile,
  useProfiles,
  useToggleProfileStatus,
  useUpdateProfile,
} from '@/components/hooks/use-users';
import { Badge, Button, ConfirmDialog, DataTable, Input, Modal, Select } from '@/components/ui';
import {
  createUserSchema,
  profileSchema,
  type CreateUserFormData,
  type ProfileFormData,
} from '@/lib';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Profile } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Eye, EyeOff, Pencil, Plus, PowerOff, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = [
  { value: 'faculty', label: 'Faculty' },
  { value: 'admin', label: 'Admin' },
];

/* ─── Page ─── */
export default function UsersPage() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [deleteId, setDeleteId] = useState('');
  const [toggleTarget, setToggleTarget] = useState<Profile | null>(null);

  const { data: users = [], isPending, isFetching } = useProfiles(debounced);
  const deleteMutation = useDeleteProfile();
  const toggleMutation = useToggleProfileStatus();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const openAdd = () => {
    setEditUser(null);
    setModalOpen(true);
  };
  const openEdit = (user: Profile) => {
    setEditUser(user);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditUser(null);
  };

  const columns: ColumnDef<Profile, unknown>[] = [
    {
      accessorKey: 'full_name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {row.original.full_name || '—'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ getValue }) => {
        const role = getValue() as string;
        return (
          <Badge color={role === 'admin' ? 'primary' : 'info'} size="sm">
            {role === 'admin' ? 'Admin' : 'Faculty'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ getValue }) => (
        <Badge color={getValue() ? 'success' : 'error'} size="sm">
          {getValue() ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {format(new Date(getValue() as Date), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => openEdit(row.original)}
            className="text-gray-400 transition hover:text-brand-500"
            title="Edit user"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setToggleTarget(row.original)}
            className={`transition ${row.original.is_active ? 'text-gray-400 hover:text-amber-500' : 'text-amber-400 hover:text-green-500'}`}
            title={row.original.is_active ? 'Deactivate' : 'Activate'}
          >
            <PowerOff size={16} />
          </button>
          <button
            onClick={() => setDeleteId(row.original.id)}
            className="text-gray-400 transition hover:text-error-500"
            title="Delete user"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Users" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative min-w-2xs max-w-sm flex-1">
              <Search
                size={16}
                className="absolute top-1/2 left-3 z-1 -translate-y-1/2 text-gray-400"
              />
              <Input
                placeholder="Search by name or email..."
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{users.length ?? 0} total</p>
          </div>
          <Button onClick={openAdd} startIcon={<Plus size={16} />}>
            Add User
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={users as Profile[]}
          globalFilter={debounced}
          loading={isPending || isFetching}
          emptyMessage="No users found"
        />
      </div>

      <UserModal isOpen={modalOpen} onClose={closeModal} editUser={editUser} />

      {/* Toggle status confirm */}
      <ConfirmDialog
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => {
          if (!toggleTarget) return;
          toggleMutation.mutate(
            { id: toggleTarget.id, current: toggleTarget.is_active },
            {
              onSuccess: () => {
                toast.success(toggleTarget.is_active ? 'User deactivated' : 'User activated');
                setToggleTarget(null);
              },
              onError: () => toast.error('Failed to update status'),
            }
          );
        }}
        title={toggleTarget?.is_active ? 'Deactivate User' : 'Activate User'}
        message={
          toggleTarget?.is_active
            ? `Deactivate ${toggleTarget.full_name || toggleTarget.email}? They will no longer be able to sign in.`
            : `Activate ${toggleTarget?.full_name || toggleTarget?.email}? They will be able to sign in again.`
        }
        confirmLabel={toggleTarget?.is_active ? 'Deactivate' : 'Activate'}
        loadingText={toggleTarget?.is_active ? 'Deactivating...' : 'Activating...'}
        variant={toggleTarget?.is_active ? 'warning' : 'success'}
        isLoading={toggleMutation.isPending}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId('')}
        onConfirm={() =>
          deleteMutation.mutate(deleteId, {
            onSuccess: () => {
              toast.success('User deleted');
              setDeleteId('');
            },
            onError: () => toast.error('Failed to delete user'),
          })
        }
        title="Delete User"
        message="This will permanently delete the user account from both the database and authentication. This cannot be undone."
        confirmLabel="Delete User"
        loadingText="Deleting..."
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}

/* ─── User Modal ─── */
function UserModal({
  isOpen,
  onClose,
  editUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  editUser: Profile | null;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const createMutation = useCreateProfile();
  const updateMutation = useUpdateProfile();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData | ProfileFormData>({
    resolver: zodResolver(editUser ? profileSchema : createUserSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'faculty',
      is_active: true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        editUser
          ? {
              full_name: editUser.full_name,
              email: editUser.email,
              role: editUser.role as 'admin' | 'faculty',
              is_active: editUser.is_active,
            }
          : {
              full_name: '',
              email: '',
              password: '',
              confirmPassword: '',
              role: 'faculty',
              is_active: true,
            }
      );
    }
  }, [isOpen, editUser, reset]);

  const onSubmit = async (data: CreateUserFormData | ProfileFormData) => {
    try {
      if (editUser) {
        await updateMutation.mutateAsync({ id: editUser.id, data: data as ProfileFormData });
        toast.success('User updated');
      } else {
        // Strip confirmPassword — it's only for UI validation
        const { confirmPassword: _, ...createData } = data as CreateUserFormData;
        await createMutation.mutateAsync(createData);
        toast.success('User created');
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="sm:max-w-md">
      <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
        {editUser ? 'Edit User' : 'Add User'}
      </h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {editUser ? 'Update user details.' : 'Create a new user account.'}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name"
          required
          placeholder="e.g. Juan Dela Cruz"
          error={!!errors.full_name}
          hint={errors.full_name?.message}
          {...register('full_name')}
        />

        <Input
          label="Email"
          type="email"
          required
          placeholder="user@mmsu.edu.ph"
          disabled={!!editUser}
          error={!!errors.email}
          hint={errors.email?.message}
          {...register('email')}
        />

        {!editUser && (
          <>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password <span className="text-error-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  error={!!(errors as { password?: { message?: string } }).password}
                  hint={(errors as { password?: { message?: string } }).password?.message}
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-all duration-200 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm Password <span className="text-error-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-type your password"
                  error={!!(errors as { confirmPassword?: { message?: string } }).confirmPassword}
                  hint={
                    (errors as { confirmPassword?: { message?: string } }).confirmPassword?.message
                  }
                  className="pr-10"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-all duration-200 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </>
        )}

        <Select
          label="Role"
          required
          options={ROLE_OPTIONS}
          error={!!errors.role}
          hint={errors.role?.message}
          {...register('role')}
        />

        <div className="flex items-center gap-3 pt-1">
          <input
            id="is_active_user"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            {...register('is_active')}
          />
          <label htmlFor="is_active_user" className="text-sm text-gray-700 dark:text-gray-300">
            Active account
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending} loadingText="Saving...">
            {editUser ? 'Update' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
