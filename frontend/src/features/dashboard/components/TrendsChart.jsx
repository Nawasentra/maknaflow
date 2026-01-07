import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const formatCurrency = (value) => `Rp ${value.toLocaleString('id-ID')}`

export default function TrendsChart({ data }) {
  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm h-[400px]">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Tren Pendapatan vs Pengeluaran</h3>
        <p className="text-muted-foreground text-sm">Melihat profitabilitas harian</p>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="date" 
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            tickFormatter={(date) => new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          />
          <YAxis 
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            tickFormatter={formatCurrency}
            width={80}
          />
          <Tooltip 
            formatter={(value, name) => [formatCurrency(value), name === 'income' ? 'Pendapatan' : 'Pengeluaran']}
            labelFormatter={(label) => `Tanggal: ${new Date(label).toLocaleDateString('id-ID')}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="income" 
            stroke="#10B981" 
            strokeWidth={3}
            name="Pendapatan"
            dot={{ fill: '#10B981', strokeWidth: 2 }}
          />
          <Line 
            type="monotone" 
            dataKey="expense" 
            stroke="#EF4444" 
            strokeWidth={3}
            name="Pengeluaran"
            dot={{ fill: '#EF4444', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
