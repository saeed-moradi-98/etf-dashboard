import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

export default function TopHoldingsBar({ top5, color = "var(--accent)" }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: "var(--surface2)", border: "1px solid var(--border2)",
        borderRadius: 10, padding: "12px 16px", fontSize: 12, fontFamily: "var(--font-mono)"
      }}>
        <div style={{ color: color, marginBottom: 4, fontWeight: 600 }}>{label}</div>
        <div style={{ color: "var(--text)" }}>Holding Size: <strong>${payload[0].value?.toFixed(2)}</strong></div>
      </div>
    )
  }

  const baseColor = color.startsWith("var") ? undefined : color
  const colors = top5.map((_, i) => {
    if (i === 0) return color
    return `rgba(0,229,255,${0.55 - i * 0.08})`
  })

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={top5} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: "var(--muted2)", fontSize: 12, fontFamily: "DM Mono" }}
          tickLine={false} axisLine={false}
        />
        <YAxis
          tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "DM Mono" }}
          tickLine={false} axisLine={false}
          tickFormatter={(v) => `$${v.toFixed(1)}`}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--accent-dim)" }} />
        <Bar dataKey="holding_size" radius={[6, 6, 0, 0]}>
          {top5.map((_, i) => (
            <Cell key={i} fill={colors[i]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
