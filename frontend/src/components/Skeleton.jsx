export default function Skeleton({ height = 200 }) {
  return (
    <div style={{ height, borderRadius: "var(--radius)", background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, var(--border2) 50%, transparent 100%)", backgroundSize: "600px 100%", animation: "shimmer 1.6s infinite linear" }} />
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ height: 12, width: "30%", background: "var(--border2)", borderRadius: 4, opacity: 0.5 }} />
        <div style={{ height: 8, width: "55%", background: "var(--border)", borderRadius: 4, opacity: 0.3 }} />
        <div style={{ marginTop: 16, height: height * 0.45, background: "var(--border)", borderRadius: 8, opacity: 0.2 }} />
      </div>
    </div>
  )
}
