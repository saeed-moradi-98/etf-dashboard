import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

export default function TopHoldingsBar({ top5, color = "var(--accent)" }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 10, padding: "12px 16px", fontSize: 13 }}>
        <div style={{ color, marginBottom: 4, fontWeight: 600 }}>{label}</div>
        <div style={{ color: "var(--text)" }}>Holding Size: <strong>${payload[0].value?.toFixed(2)}</strong></div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={top5} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <XAxis dataKey="name" tick={{ fill: "var(--muted2)", fontSize: 13 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false}
          tickFormatter={(v) => `$${v.toFixed(1)}`} width={64} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--accent-dim)" }} />
        <Bar dataKey="holding_size" radius={[6, 6, 0, 0]}>
          {top5.map((_, i) => (
            <Cell key={i} fill={i === 0 ? "var(--accent)" : `rgba(167,139,250,${0.55 - i * 0.08})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
