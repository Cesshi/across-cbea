'use client';

import { PageBreadcrumb } from '@/components/common';
import {
  useCreateRoom,
  useDeleteRoom,
  useRooms,
  useUpdateRoom,
} from '@/components/hooks/use-rooms';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Input,
  Modal,
  Select,
} from '@/components/ui';
import { ROOM_TYPES, roomSchema, type RoomFormData } from '@/lib';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

type Room = {
  id: string;
  name: string;
  type: string;
  capacity: number;
  floor: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

function RoomModal({
  isOpen,
  onClose,
  editRoom,
}: {
  isOpen: boolean;
  onClose: () => void;
  editRoom: Room | null;
}) {
  const createMutation = useCreateRoom();
  const updateMutation = useUpdateRoom();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: { name: '', type: 'Lecture Room', capacity: 40, floor: '', is_active: true },
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        editRoom
          ? {
              name: editRoom.name,
              type: editRoom.type as RoomFormData['type'],
              capacity: editRoom.capacity,
              floor: editRoom.floor ?? '',
              is_active: editRoom.is_active,
            }
          : { name: '', type: 'Lecture Room', capacity: 40, floor: '', is_active: true }
      );
    }
  }, [isOpen, editRoom, reset]);

  const onSubmit = async (data: RoomFormData) => {
    try {
      if (editRoom) {
        await updateMutation.mutateAsync({ id: editRoom.id, data });
        toast.success('Room updated');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Room added');
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="sm:max-w-md">
      <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
        {editRoom ? 'Edit Room' : 'Add Room'}
      </h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {editRoom ? 'Update room details.' : 'Add a new room to the system.'}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Room Name"
          required
          placeholder="e.g. CBEA 201"
          error={!!errors.name}
          hint={errors.name?.message}
          {...register('name')}
        />

        <Select
          label="Type"
          required
          options={ROOM_TYPES.map((t) => ({ value: t, label: t }))}
          error={!!errors.type}
          hint={errors.type?.message}
          {...register('type')}
        />

        <Input
          label="Capacity"
          type="number"
          required
          min={0}
          placeholder="e.g. 40"
          error={!!errors.capacity}
          hint={errors.capacity?.message}
          {...register('capacity')}
        />

        <Input
          label="Floor / Location"
          placeholder="e.g. 2nd Floor"
          error={!!errors.floor}
          hint={errors.floor?.message}
          {...register('floor')}
        />

        <div className="flex items-center gap-3 pt-1">
          <input
            id="is_active"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            {...register('is_active')}
          />
          <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
            Active (visible to users)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending} loadingText="Saving...">
            {editRoom ? 'Update' : 'Add Room'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function RoomsPage() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [deleteId, setDeleteId] = useState('');

  const { data: rooms = [], isPending, isFetching } = useRooms(debounced);
  const deleteMutation = useDeleteRoom();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const openAdd = () => {
    setEditRoom(null);
    setModalOpen(true);
  };
  const openEdit = (room: Room) => {
    setEditRoom(room);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditRoom(null);
  };

  const columns: ColumnDef<Room, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Room Name',
      cell: ({ getValue }) => (
        <span className="font-medium text-gray-900 dark:text-white">{String(getValue())}</span>
      ),
    },
    { accessorKey: 'type', header: 'Type' },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
      cell: ({ getValue }) => `${getValue()} pax`,
    },
    {
      accessorKey: 'floor',
      header: 'Floor',
      cell: ({ getValue }) => (getValue() as string | null) || '—',
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
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => openEdit(row.original)}
            className="hover:text-brand-500 text-gray-400 transition"
            title="Edit room"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setDeleteId(row.original.id)}
            className="hover:text-error-500 text-gray-400 transition"
            disabled={deleteMutation.isPending}
            title="Delete room"
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
        <PageBreadcrumb pageTitle="Rooms" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-2xs max-w-sm flex-1">
            <Search
              size={16}
              className="absolute top-1/2 left-3 z-1 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder="Search rooms..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button onClick={openAdd} startIcon={<Plus size={16} />}>
            Add Room
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={rooms as Room[]}
          globalFilter={debounced}
          loading={isPending || isFetching}
          emptyMessage="No rooms found"
        />
      </div>

      <RoomModal isOpen={modalOpen} onClose={closeModal} editRoom={editRoom} />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId('')}
        onConfirm={() => deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId('') })}
        title="Delete Room"
        message="This will permanently delete the room and all its reservations. This cannot be undone."
        confirmLabel="Delete Room"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
