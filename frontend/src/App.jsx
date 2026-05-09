import { useState, useEffect } from "react"
import UploadCSV from "./components/UploadCSV"
import HoldingsTable from "./components/HoldingsTable"
import ETFPriceChart from "./components/ETFPriceChart"
import TopHoldingsBar from "./components/TopHoldingsBar"
import Skeleton from "./components/Skeleton"
import "./index.css"

export default function App() {
  const [etf1, setEtf1] = useState(null)
  const [etf2, setEtf2] = useState(null)
  const [loading1, setLoading1] = useState(false)
  const [loading2, setLoading2] = useState(false)
  const [error, setError] = useState(null)
  const [theme, setTheme] = useState("dark")
  const [activeTab, setActiveTab] = useState("etf1")
  const [dateRange, setDateRange] = useState([0, 100])

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  const fetchETF = async (file, setData, setLoading) => {
    setLoading(true)
    setError(null)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("http://localhost:8000/api/etf", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload failed")
      const json = await res.json()
      setData({ ...json, fileName: file.name })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const activeData = activeTab === "etf1" ? etf1 : activeTab === "etf2" ? etf2 : null
  const isLoading = activeTab === "etf1" ? loading1 : loading2
  const bothLoaded = etf1 && etf2

  const getSlicedPrices = (data) => {
    if (!data) return []
    const total = data.etf_prices.length
    const start = Math.floor((dateRange[0] / 100) * total)
    const end = Math.floor((dateRange[1] / 100) * total)
    return data.etf_prices.slice(start, end)
  }

  return (
    <div style={{ maxWidth: 1140, margin: "0 auto", padding: "48px 24px" }}>

      {/* Header */}
      <header className="fade-up" style={{ marginBottom: 56, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 20, letterSpacing: 8, color: "var(--accent)", textTransform: "uppercase", marginBottom: 14, fontFamily: "var(--font-display)" }}>
            Portfolio Analytics
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 800, lineHeight: 1.05, color: "var(--text)" }}>
            ETF
            <span style={{ color: "var(--accent)", WebkitTextStroke: "1px var(--accent)", WebkitTextFillColor: "transparent" }}> Visualizer</span>
          </h1>
          <p style={{ color: "var(--muted2)", marginTop: 14, fontSize: 20, maxWidth: 1000, lineHeight: 1.7 }}>
            Please upload your ETF CSV files to view holdings, reconstructed price history, and top positions.
          </p>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
          style={{
            background: "var(--surface)", border: "1px solid var(--border2)",
            borderRadius: 10, padding: "10px 16px", cursor: "pointer",
            color: "var(--muted2)", fontSize: 18, transition: "all 0.2s",
            display: "flex", alignItems: "center", gap: 8
          }}
          title="Toggle theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </header>

      {/* Upload Row */}
      <div className="fade-up-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40 }}>
        <UploadCSV
          label="ETF 1"
          fileName={etf1?.fileName}
          onUpload={(f) => fetchETF(f, setEtf1, setLoading1)}
          loading={loading1}
          color="var(--accent)"
        />
        <UploadCSV
          label="ETF 2"
          fileName={etf2?.fileName}
          onUpload={(f) => fetchETF(f, setEtf2, setLoading2)}
          loading={loading2}
          color="var(--accent3)"
        />
      </div>

      <p style={{ color: "var(--muted2)", fontSize: 20, maxWidth: 1300, lineHeight: 1, textAlign: "center", marginBottom: 40 }}>
        You can also upload both files at once to compare their performance.
      </p>


      {error && (
        <div style={{ color: "var(--accent2)", background: "rgba(255,107,107,0.08)", border: "1px solid var(--accent2)", borderRadius: 10, padding: "12px 18px", marginBottom: 24, fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Tabs */}
      {(etf1 || etf2 || loading1 || loading2) && (
        <div className="fade-up-2" style={{ display: "flex", gap: 4, marginBottom: 32, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {[
            { id: "etf1", label: etf1?.fileName || "ETF 1", color: "var(--accent)", disabled: !etf1 && !loading1 },
            { id: "etf2", label: etf2?.fileName || "ETF 2", color: "var(--accent3)", disabled: !etf2 && !loading2 },
            { id: "compare", label: "⚡ Compare", color: "var(--accent2)", disabled: !bothLoaded },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              style={{
                padding: "8px 20px", borderRadius: 8, border: "none", cursor: tab.disabled ? "not-allowed" : "pointer",
                fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 500, transition: "all 0.2s",
                background: activeTab === tab.id ? tab.color : "transparent",
                color: activeTab === tab.id ? "#000" : tab.disabled ? "var(--muted)" : "var(--muted2)",
                opacity: tab.disabled ? 0.4 : 1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && activeTab !== "compare" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <Skeleton height={220} />
          <Skeleton height={320} />
          <Skeleton height={260} />
        </div>
      )}

      {/* Compare Mode */}
      {activeTab === "compare" && bothLoaded && (
        <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <Section title="Price History Comparison" subtitle="Both ETFs overlaid — weighted sum of constituents">
            <DateRangeSlider dateRange={dateRange} setDateRange={setDateRange} />
            <ETFPriceChart
              etfPrices={getSlicedPrices(etf1)}
              etfPrices2={getSlicedPrices(etf2)}
              label1={etf1.fileName}
              label2={etf2.fileName}
            />
          </Section>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <Section title={etf1.fileName} subtitle="Top 5 holdings">
              <TopHoldingsBar top5={etf1.top5} color="var(--accent)" />
            </Section>
            <Section title={etf2.fileName} subtitle="Top 5 holdings">
              <TopHoldingsBar top5={etf2.top5} color="var(--accent3)" />
            </Section>
          </div>
        </div>
      )}

      {/* Single ETF View */}
      {!isLoading && activeData && activeTab !== "compare" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div className="fade-up">
            <Section title="Holdings" subtitle={`${activeData.holdings.length} constituents · click columns to sort`}>
              <HoldingsTable holdings={activeData.holdings} />
            </Section>
          </div>
          <div className="fade-up-1">
            <Section title="ETF Price History" subtitle="Reconstructed weighted sum over time">
              <DateRangeSlider dateRange={dateRange} setDateRange={setDateRange} />
              <ETFPriceChart etfPrices={getSlicedPrices(activeData)} />
            </Section>
          </div>
          <div className="fade-up-2">
            <Section title="Top 5 Holdings" subtitle="Largest positions by holding size at latest close">
              <TopHoldingsBar top5={activeData.top5} color="var(--accent)" />
            </Section>
          </div>
        </div>
      )}

    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <section>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{title}</h2>
          {subtitle && <p style={{ color: "var(--muted2)", fontSize: 11, marginTop: 4 }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, boxShadow: "var(--glow)" }}>
        {children}
      </div>
    </section>
  )
}

function DateRangeSlider({ dateRange, setDateRange }) {
  return (
    <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
      <span style={{ fontSize: 11, color: "var(--muted2)", whiteSpace: "nowrap" }}>Date range</span>
      <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="range" min={0} max={dateRange[1] - 1} value={dateRange[0]}
          onChange={e => setDateRange([+e.target.value, dateRange[1]])}
          style={{ flex: 1, accentColor: "var(--accent)", height: 4 }}
        />
        <input
          type="range" min={dateRange[0] + 1} max={100} value={dateRange[1]}
          onChange={e => setDateRange([dateRange[0], +e.target.value])}
          style={{ flex: 1, accentColor: "var(--accent)", height: 4 }}
        />
      </div>
      <span style={{ fontSize: 11, color: "var(--accent)", whiteSpace: "nowrap" }}>
        {dateRange[0]}% – {dateRange[1]}%
      </span>
      <button
        onClick={() => setDateRange([0, 100])}
        style={{ fontSize: 10, color: "var(--muted2)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontFamily: "var(--font-mono)" }}
      >
        Reset
      </button>
    </div>
  )
}
