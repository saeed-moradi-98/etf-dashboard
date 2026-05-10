import { useRef, useState } from "react"

export default function UploadCSV({ onUpload, loading, label, fileName, color }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const uploaded = !!fileName && !loading

  const handleFile = (file) => {
    if (file && file.name.endsWith(".csv")) onUpload(file)
  }

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
      style={{
        border: `1.5px dashed ${dragging ? color : uploaded ? color : "var(--border2)"}`,
        borderRadius: "var(--radius)", padding: "28px 20px", textAlign: "center",
        cursor: "pointer", transition: "all 0.25s",
        background: dragging ? "var(--accent-dim)" : "var(--surface)",
        position: "relative", overflow: "hidden",
      }}
    >
      {uploaded && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      )}
      <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])} />
      <div style={{ fontSize: 10, letterSpacing: 5, color, textTransform: "uppercase", marginBottom: 10, fontFamily: "var(--font-display)" }}>
        {label}
      </div>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${color}`, borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 13, color: "var(--muted2)" }}>Processing...</span>
        </div>
      ) : uploaded ? (
        <div>
          <div style={{ fontSize: 20, marginBottom: 6, color }}>✓</div>
          <div style={{ fontSize: 13, color, fontWeight: 500 }}>{fileName}</div>
          <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 4 }}>Click to replace</div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 26, marginBottom: 8 }}>📂</div>
          <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>Drop ETF CSV here</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>or click to browse</div>
        </div>
      )}
    </div>
  )
}
