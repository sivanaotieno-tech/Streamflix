export default function OfflinePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#070d17", color: "#f5f8fc", fontFamily: "Arial, sans-serif" }}>
      <section style={{ maxWidth: 520, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
        <h1 style={{ fontSize: 30, margin: "0 0 12px" }}>You’re offline</h1>
        <p style={{ color: "#a9b8ca", lineHeight: 1.6 }}>Streamivio is open, but this page hasn’t been saved on this device yet. Reconnect once to load your catalogue and cache the app for next time.</p>
        <a href="/" style={{ display: "inline-block", marginTop: 16, padding: "12px 20px", borderRadius: 10, background: "#168bd0", color: "white", textDecoration: "none" }}>Open Streamivio</a>
      </section>
    </main>
  );
}
