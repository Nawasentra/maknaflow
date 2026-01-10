import { useState } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
  getSortedRowModel,
  getFilteredRowModel
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Search, ArrowUpDown } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('tanggal', {
    header: ({ column }) => (
      <Button variant="ghost" onClick={column.getToggleSortingHandler()}>
        Tanggal
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => formatDate(row.getValue('tanggal')),
  }),
  columnHelper.accessor('cabang', {
    header: 'Cabang',
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue('cabang')}</Badge>
    ),
  }),
  columnHelper.accessor('tipe', {
    header: 'Tipe',
    cell: ({ row }) => {
      const tipe = row.getValue('tipe')
      return (
        <Badge variant={tipe === 'Income' ? 'default' : 'destructive'}>
          {tipe}
        </Badge>
      )
    },
  }),
  columnHelper.accessor('kategori', {
    header: 'Kategori',
  }),
  columnHelper.accessor('sub_kategori', {
    header: 'Sub-Kategori',
  }),
  columnHelper.accessor('jumlah', {
    header: 'Jumlah (Rp)',
    cell: ({ row }) => formatCurrency(row.getValue('jumlah')),
  }),
  columnHelper.display({
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(row.original.id)}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  }),
]

export default function TransactionTable({ data, onDelete, onAddTransaction }) {
  const [globalFilter, setGlobalFilter] = useState('')
  
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Cari transaksi..."
            className="pl-10"
            value={globalFilter ?? ''}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
          />
        </div>
        <Button onClick={onAddTransaction} className="gap-2">
          <Plus className="h-4 w-4" />
          Input Manual
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())
                    }
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Tidak ada data transaksi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
