import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

export default function ETFPriceChart({ etfPrices }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 10, padding: "12px 16px", fontSize: 13 }}>
        <div style={{ color: "var(--muted2)", marginBottom: 6, fontSize: 11 }}>{label}</div>
        <div style={{ color: "var(--accent)" }}>ETF Price: <strong>${payload[0]?.value?.toFixed(4)}</strong></div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={etfPrices} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
        <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false}
          tickFormatter={(v) => v.slice(0, 7)} interval={Math.max(1, Math.floor(etfPrices.length / 6))} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false}
          tickFormatter={(v) => `$${v.toFixed(1)}`} width={64} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="price" stroke="var(--accent)" strokeWidth={2}
          dot={false} activeDot={{ r: 4, fill: "var(--accent)" }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
