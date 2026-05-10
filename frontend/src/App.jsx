import { useState, useEffect } from "react"
import UploadCSV from "./components/UploadCSV"
import HoldingsTable from "./components/HoldingsTable"
import ETFPriceChart from "./components/ETFPriceChart"
import TopHoldingsBar from "./components/TopHoldingsBar"
import Skeleton from "./components/Skeleton"
import "./index.css"

const API_BASE = "/api"

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem("etf_token") || "")
  const [loginForm, setLoginForm] = useState({ username: "", password: "" })
  const [loginError, setLoginError] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)

  const [etfData, setEtfData] = useState(null)
  const [prices, setPrices] = useState(null)
  const [top5, setTop5] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [theme, setTheme] = useState("dark")
  const [dateRange, setDateRange] = useState([0, 100])
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [fileRef, setFileRef] = useState(null)

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  // Authentication
  const handleLogin = async () => {
    setLoginLoading(true)
    setLoginError(null)
    const form = new URLSearchParams()
    form.append("username", loginForm.username)
    form.append("password", loginForm.password)
    try {
      const res = await fetch(`${API_BASE}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || "Invalid username or password")
      }
      const data = await res.json()
      sessionStorage.setItem("etf_token", data.access_token)
      setToken(data.access_token)
    } catch (e) {
      setLoginError(e.message)
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("etf_token")
    setToken("")
    setEtfData(null)
    setPrices(null)
    setTop5(null)
    setFileRef(null)
    setError(null)
  }

  // API fetch helper
  const apiFetch = async (endpoint, file, params = "") => {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch(`${API_BASE}${endpoint}${params}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData,
    })
    if (res.status === 401) {
      handleLogout()
      throw new Error("Session expired — please log in again")
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || `Request failed: ${res.status}`)
    }
    return res.json()
  }

  // File Upload 
  const handleUpload = async (file) => {
    setLoading(true)
    setError(null)
    setFileRef(file)
    setPage(1)
    try {
      const [holdings, pricesRes, top5Res] = await Promise.all([
        apiFetch("/etf/holdings", file, `?page=1&page_size=${pageSize}`),
        apiFetch("/etf/prices", file),
        apiFetch("/etf/top5", file),
      ])
      setEtfData({ ...holdings, fileName: file.name })
      setPrices(pricesRes.data)
      setTop5(top5Res.data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Pagination
  const handlePageChange = async (newPage) => {
    if (!fileRef) return
    setLoading(true)
    try {
      const holdings = await apiFetch("/etf/holdings", fileRef, `?page=${newPage}&page_size=${pageSize}`)
      setEtfData(prev => ({ ...prev, ...holdings }))
      setPage(newPage)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const getSlicedPrices = () => {
    if (!prices) return []
    const total = prices.length
    const start = Math.floor((dateRange[0] / 100) * total)
    const end = Math.floor((dateRange[1] / 100) * total)
    return prices.slice(start, end)
  }

  const totalPages = etfData ? Math.ceil(etfData.total / pageSize) : 0

  // Render
  return (
    <div style={{ maxWidth: 1140, margin: "0 auto", padding: "48px 24px" }}>

      {/* Header */}
      <header className="fade-up" style={{ marginBottom: 48, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 20, letterSpacing: 8, color: "var(--accent)", textTransform: "uppercase", marginBottom: 14, fontFamily: "var(--font-display)" }}>
            Portfolio Analytics
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 800, lineHeight: 1.05, color: "var(--text)" }}>
            ETF<br />
            <span style={{ color: "var(--accent)", WebkitTextStroke: "1px var(--accent)", WebkitTextFillColor: "transparent" }}>Visualizer</span>
          </h1>
          <p style={{ color: "var(--muted2)", marginTop: 14, fontSize: 18, maxWidth: 1000, lineHeight: 1.7 }}>
            Upload ETF CSV files to explore holdings, reconstructed price history, and top positions.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {token && (
            <button onClick={handleLogout}
              style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 10, padding: "10px 16px", cursor: "pointer", color: "var(--accent2)", fontSize: 13, fontFamily: "var(--font-display)" }}>
              Sign out
            </button>
          )}
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
            style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 10, padding: "10px 16px", cursor: "pointer", color: "var(--muted2)", fontSize: 18 }}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* Login */}
      {!token && (
        <div className="fade-up-1" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 28, marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: "var(--muted2)", marginBottom: 16, letterSpacing: 1, textTransform: "uppercase" }}>Sign in to continue</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
            <input
              placeholder="Username"
              value={loginForm.username}
              onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={inputStyle}
            />
            <button onClick={handleLogin} disabled={loginLoading}
              style={{ padding: "11px 24px", background: "var(--accent)", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "var(--font-display)", opacity: loginLoading ? 0.7 : 1 }}>
              {loginLoading ? "Signing in..." : "Sign in"}
            </button>
            {loginError && (
              <div style={{ color: "var(--accent2)", fontSize: 13 }}>⚠ {loginError}</div>
            )}
            <div style={{ color: "var(--muted2)", fontSize: 12, marginTop: 4 }}>
              Demo credentials — username: <strong>trader1</strong> / password: <strong>password123</strong>
            </div>
          </div>
        </div>
      )}

      {/* Upload */}
      {token && (
        <div className="fade-up-1" style={{ marginBottom: 40 }}>
          <UploadCSV
            label="ETF"
            fileName={etfData?.fileName}
            onUpload={handleUpload}
            loading={loading}
            color="var(--accent)"
          />
        </div>
      )}

      {error && (
        <div style={{ color: "var(--accent2)", background: "rgba(244,114,182,0.08)", border: "1px solid var(--accent2)", borderRadius: 10, padding: "12px 18px", marginBottom: 24, fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {/* Skeletons */}
      {loading && !etfData && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <Skeleton height={220} />
          <Skeleton height={320} />
          <Skeleton height={260} />
        </div>
      )}

      {/* Data */}
      {etfData && prices && top5 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div className="fade-up">
            <Section title="Holdings" subtitle={`${etfData.total} constituents · page ${page} of ${totalPages} · click columns to sort`}>
              <HoldingsTable holdings={etfData.items} />
              <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} loading={loading} />
            </Section>
          </div>
          <div className="fade-up-1">
            <Section title="ETF Price History" subtitle="Reconstructed weighted sum — constituents with missing weights contribute zero">
              <DateRangeSlider dateRange={dateRange} setDateRange={setDateRange} />
              <ETFPriceChart etfPrices={getSlicedPrices()} />
            </Section>
          </div>
          <div className="fade-up-2">
            <Section title="Top 5 Holdings" subtitle="Largest positions by weight × latest close price">
              <TopHoldingsBar top5={top5} color="var(--accent)" />
            </Section>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  padding: "10px 14px", background: "var(--surface2)",
  border: "1px solid var(--border2)", borderRadius: 8,
  color: "var(--text)", fontSize: 14, fontFamily: "var(--font-display)", outline: "none",
}

function Section({ title, subtitle, children }) {
  return (
    <section>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--text)" }}>{title}</h2>
        {subtitle && <p style={{ color: "var(--muted2)", fontSize: 12, marginTop: 4 }}>{subtitle}</p>}
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, boxShadow: "var(--glow)" }}>
        {children}
      </div>
    </section>
  )
}

function Pagination({ page, totalPages, onChange, loading }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
    .reduce((acc, p, i, arr) => {
      if (i > 0 && p - arr[i - 1] > 1) acc.push("...")
      acc.push(p)
      return acc
    }, [])

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
      {[["«", 1], ["‹", page - 1]].map(([label, target]) => (
        <PageBtn key={label} onClick={() => onChange(target)} disabled={page === 1 || loading}>{label}</PageBtn>
      ))}
      {pages.map((p, i) =>
        p === "..." ? <span key={`e${i}`} style={{ color: "var(--muted)", fontSize: 13 }}>…</span>
          : <PageBtn key={p} onClick={() => onChange(p)} disabled={loading} active={p === page}>{p}</PageBtn>
      )}
      {[["›", page + 1], ["»", totalPages]].map(([label, target]) => (
        <PageBtn key={label} onClick={() => onChange(target)} disabled={page === totalPages || loading}>{label}</PageBtn>
      ))}
    </div>
  )
}

function PageBtn({ children, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        minWidth: 36, height: 36, borderRadius: 8, border: "1px solid",
        borderColor: active ? "var(--accent)" : "var(--border2)",
        background: active ? "var(--accent)" : "var(--surface2)",
        color: active ? "#000" : disabled ? "var(--muted)" : "var(--text)",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13, fontFamily: "var(--font-display)",
        fontWeight: active ? 700 : 400, opacity: disabled ? 0.4 : 1,
      }}>
      {children}
    </button>
  )
}

function DateRangeSlider({ dateRange, setDateRange }) {
  return (
    <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
      <span style={{ fontSize: 12, color: "var(--muted2)", whiteSpace: "nowrap" }}>Date range</span>
      <div style={{ flex: 1, display: "flex", gap: 8 }}>
        <input type="range" min={0} max={dateRange[1] - 1} value={dateRange[0]}
          onChange={e => setDateRange([+e.target.value, dateRange[1]])}
          style={{ flex: 1, accentColor: "var(--accent)" }} />
        <input type="range" min={dateRange[0] + 1} max={100} value={dateRange[1]}
          onChange={e => setDateRange([dateRange[0], +e.target.value])}
          style={{ flex: 1, accentColor: "var(--accent)" }} />
      </div>
      <span style={{ fontSize: 12, color: "var(--accent)", whiteSpace: "nowrap" }}>{dateRange[0]}% – {dateRange[1]}%</span>
      <button onClick={() => setDateRange([0, 100])}
        style={{ fontSize: 11, color: "var(--muted2)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>
        Reset
      </button>
    </div>
  )
}
