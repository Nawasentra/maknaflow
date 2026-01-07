import { TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

export default function KPICards({ data }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Income */}
      <Card className="border-primary/20 hover:shadow-lg transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-emerald-100">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Total Pendapatan</p>
              <CardTitle className="text-2xl font-bold text-emerald-600">
                {formatCurrency(data.income || 0)}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Total Expense */}
      <Card className="border-orange-200 hover:shadow-lg transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-orange-100">
              <DollarSign className="h-5 w-5 text-orange-600" />
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
              <CardTitle className="text-2xl font-bold text-orange-600">
                {formatCurrency(data.expense || 0)}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Net Income */}
      <Card className="border-blue-200 hover:shadow-lg transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-blue-100">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Pendapatan Bersih</p>
              <CardTitle className={`text-2xl font-bold ${data.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(data.netIncome || 0)}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Total Transactions */}
      <Card className="border-purple-200 hover:shadow-lg transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-purple-100">
              <Receipt className="h-5 w-5 text-purple-600" />
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Jumlah Transaksi</p>
              <CardTitle className="text-2xl font-bold text-purple-600">
                {data.transactionCount || 0}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}
