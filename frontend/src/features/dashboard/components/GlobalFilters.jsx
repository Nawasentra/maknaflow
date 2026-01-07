import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronDown, Filter } from 'lucide-react'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

const dateRanges = [
  { value: 'today', label: 'Hari Ini' },
  { value: '7days', label: '7 Hari Terakhir' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'custom', label: 'Pilih Rentang' }
]

const branches = [
  { value: 'all', label: 'Semua Cabang' },
  { value: 'laundry-antapani', label: 'Laundry Antapani' },
  { value: 'laundry-buahbatu', label: 'Laundry Buah Batu' },
  { value: 'carwash', label: 'Carwash' },
  { value: 'kos-kosan', label: 'Kos-kosan' }
]

export default function GlobalFilters({ onFilterChange, filters }) {
  const [openDate, setOpenDate] = useState(false)

  const getDateRange = () => {
    const now = new Date()
    switch (filters.dateRange) {
      case 'today': return { start: now, end: now }
      case '7days': return { start: new Date(now - 7 * 24 * 60 * 60 * 1000), end: now }
      case 'month': return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
      default: return filters.customRange || { start: now, end: now }
    }
  }

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Filter Data</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Range Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Rentang Tanggal</label>
          <Select value={filters.dateRange} onValueChange={(value) => onFilterChange('dateRange', value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Branch Filter */}
        <div>
          <label className="text-sm font-medium mb-2 block">Unit Bisnis / Cabang</label>
          <Select value={filters.branch} onValueChange={(value) => onFilterChange('branch', value)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branches.map((branch) => (
                <SelectItem key={branch.value} value={branch.value}>
                  {branch.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button className="mt-6 w-full" variant="outline" size="lg">
        Terapkan Filter
      </Button>
    </div>
  )
}
