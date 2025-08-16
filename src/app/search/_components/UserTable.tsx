import React from 'react'
import Link from 'next/link'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table'
import { User } from '@/types/api/ndex'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

interface UserTableProps {
  users: User[]
  isLoading: boolean
  hasMore: boolean
  loadMore: () => void
  totalCount: number
  error?: Error
}

export function UserTable({
  users,
  isLoading,
  error,
  hasMore,
  loadMore,
  totalCount,
}: UserTableProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = React.useMemo<ColumnDef<User, any>[]>(
    () => [
      {
        header: 'Username',
        accessorKey: 'externalId',
        cell: ({ row, getValue }) => {
          const id = getValue() as string
          const userName = row.original.userName
          return (
            <Link
              className="text-blue-500 hover:text-blue-700"
              href={`/users/${id}`}
            >
              {userName}
            </Link>
          )
        },
      },
      {
        header: 'First Name',
        accessorKey: 'firstName',
      },
      {
        header: 'Last Name',
        accessorKey: 'lastName',
      },
      {
        header: 'Display Name',
        accessorKey: 'displayName',
      },
      {
        header: 'Description',
        accessorKey: 'description',
      },
      {
        header: 'Joined on',
        accessorKey: 'creationTime',
        cell: ({ getValue }) =>
          getValue() ? new Date(getValue() as string).toLocaleDateString() : '',
      },
    ],
    [],
  )

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasMore && !isLoading && <button onClick={loadMore}>Load More</button>}
      <div>{totalCount} Users Total</div>
    </div>
  )
}
