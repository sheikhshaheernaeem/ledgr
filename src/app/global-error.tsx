"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif", color: "white", textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Critical Error</h1>
          <p style={{ color: "#888", marginBottom: "1rem" }}>The application encountered a fatal error.</p>
          <button
            onClick={reset}
            style={{ background: "#10b981", color: "black", border: "none", padding: "0.5rem 1.25rem", borderRadius: "0.5rem", cursor: "pointer", fontWeight: "600" }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
