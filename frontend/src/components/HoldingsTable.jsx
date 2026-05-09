import { useState, useMemo } from "react"

export default function HoldingsTable({ holdings }) {
  const [sortKey, setSortKey] = useState("holding_size")
  const [sortDir, setSortDir] = useState("desc")
  const [search, setSearch] = useState("")

  const filtered = useMemo(() =>
    holdings.filter(h => h.name.toLowerCase().includes(search.toLowerCase())),
    [holdings, search]
  )

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1
      return typeof a[sortKey] === "string"
        ? a[sortKey].localeCompare(b[sortKey]) * mul
        : (a[sortKey] - b[sortKey]) * mul
    }),
    [filtered, sortKey, sortDir]
  )

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("desc") }
  }

  const exportCSV = () => {
    const header = "Constituent,Weight,Latest Price,Holding Size"
    const rows = sorted.map(r => `${r.name},${r.weight},${r.latest_price},${r.holding_size}`)
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "holdings.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const cols = [
    { key: "name", label: "Constituent" },
    { key: "weight", label: "Weight" },
    { key: "latest_price", label: "Latest Price" },
    { key: "holding_size", label: "Holding Size" },
  ]

  const maxHolding = Math.max(...holdings.map(h => h.holding_size))

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: 13 }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter constituents..."
            style={{
              width: "100%", padding: "8px 12px 8px 32px",
              background: "var(--surface2)", border: "1px solid var(--border2)",
              borderRadius: 8, color: "var(--text)", fontSize: 12,
              fontFamily: "var(--font-mono)", outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = "var(--accent)"}
            onBlur={e => e.target.style.borderColor = "var(--border2)"}
          />
        </div>
        <span style={{ fontSize: 11, color: "var(--muted2)" }}>
          {sorted.length} / {holdings.length}
        </span>
        <button
          onClick={exportCSV}
          style={{
            fontSize: 11, padding: "8px 14px", background: "var(--surface2)",
            border: "1px solid var(--border2)", borderRadius: 8, color: "var(--muted2)",
            cursor: "pointer", fontFamily: "var(--font-mono)", transition: "all 0.2s",
            whiteSpace: "nowrap"
          }}
          onMouseEnter={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.color = "var(--accent)" }}
          onMouseLeave={e => { e.target.style.borderColor = "var(--border2)"; e.target.style.color = "var(--muted2)" }}
        >
          ↓ Export
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {cols.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  style={{
                    textAlign: "left", padding: "10px 14px", cursor: "pointer",
                    color: sortKey === col.key ? "var(--accent)" : "var(--muted2)",
                    borderBottom: "1px solid var(--border)", fontWeight: 500,
                    userSelect: "none", whiteSpace: "nowrap", fontSize: 11,
                    letterSpacing: 1, textTransform: "uppercase"
                  }}
                >
                  {col.label} {sortKey === col.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.name}
                style={{ transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--accent-dim)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={td}>
                  <span style={{ color: "var(--accent)", fontWeight: 500 }}>{row.name}</span>
                </td>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      height: 4, width: 60, background: "var(--border2)", borderRadius: 2, overflow: "hidden"
                    }}>
                      <div style={{
                        height: "100%", width: `${row.weight * 100 * 5}%`,
                        background: "var(--accent)", borderRadius: 2,
                        maxWidth: "100%"
                      }} />
                    </div>
                    {(row.weight * 100).toFixed(2)}%
                  </div>
                </td>
                <td style={td}>${row.latest_price.toFixed(2)}</td>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      height: 4, width: 80, background: "var(--border2)", borderRadius: 2, overflow: "hidden"
                    }}>
                      <div style={{
                        height: "100%", width: `${(row.holding_size / maxHolding) * 100}%`,
                        background: "var(--accent3)", borderRadius: 2
                      }} />
                    </div>
                    ${row.holding_size.toFixed(2)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px", color: "var(--muted2)", fontSize: 13 }}>
          No constituents match "{search}"
        </div>
      )}
    </div>
  )
}

const td = {
  padding: "10px 14px",
  borderBottom: "1px solid var(--border)",
  color: "var(--text)",
}
