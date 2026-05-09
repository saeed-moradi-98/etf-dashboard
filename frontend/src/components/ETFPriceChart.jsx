import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from "recharts"
import { useMemo } from "react"

export default function ETFPriceChart({ etfPrices, etfPrices2, label1, label2 }) {
  const isCompare = !!etfPrices2

  const mergedData = useMemo(() => {
    if (!isCompare) return etfPrices
    const map = {}
    etfPrices.forEach(d => { map[d.date] = { date: d.date, price1: d.price } })
    etfPrices2.forEach(d => {
      if (map[d.date]) map[d.date].price2 = d.price
      else map[d.date] = { date: d.date, price2: d.price }
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [etfPrices, etfPrices2, isCompare])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: "var(--surface2)", border: "1px solid var(--border2)",
        borderRadius: 10, padding: "12px 16px", fontSize: 12, fontFamily: "var(--font-mono)"
      }}>
        <div style={{ color: "var(--muted2)", marginBottom: 8, fontSize: 11 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, marginBottom: 4 }}>
            {p.name}: <strong>${p.value?.toFixed(4)}</strong>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={mergedData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "DM Mono" }}
          tickLine={false} axisLine={false}
          tickFormatter={(v) => v.slice(0, 7)}
          interval={Math.floor(mergedData.length / 6)}
        />
        <YAxis
          tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "DM Mono" }}
          tickLine={false} axisLine={false}
          tickFormatter={(v) => `$${v.toFixed(1)}`}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        {isCompare && <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-mono)", paddingTop: 12 }} />}

        {isCompare ? (
          <>
            <Line type="monotone" dataKey="price1" name={label1 || "ETF 1"}
              stroke="var(--accent)" strokeWidth={2} dot={false}
              activeDot={{ r: 4, fill: "var(--accent)" }} />
            <Line type="monotone" dataKey="price2" name={label2 || "ETF 2"}
              stroke="var(--accent3)" strokeWidth={2} dot={false}
              strokeDasharray="6 3"
              activeDot={{ r: 4, fill: "var(--accent3)" }} />
          </>
        ) : (
          <Line type="monotone" dataKey="price" name="ETF Price"
            stroke="var(--accent)" strokeWidth={2} dot={false}
            activeDot={{ r: 4, fill: "var(--accent)" }} />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
