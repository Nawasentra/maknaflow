import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const formatCurrency = (value) => `Rp ${value.toLocaleString('id-ID')}`

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

export default function BreakdownCharts({ incomeData, expenseData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Income Sources - Donut Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Sumber Pendapatan
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={incomeData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                nameKey="name"
              >
                {incomeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={formatCurrency} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Expense Categories - Horizontal Bar */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Kategori Pengeluaran Teratas
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] p-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={expenseData} layout="vertical" margin={{ right: 30 }}>
              <XAxis 
                type="number" 
                hide 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                dataKey="name" 
                type="category"
                tickLine={false}
                axisLine={false}
                width={150}
              />
              <Tooltip formatter={formatCurrency} />
              <Bar dataKey="value" fill="#EF4444" radius={[4, 0, 0, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
