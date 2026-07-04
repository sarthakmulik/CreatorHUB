import React from "react";

export function SkeletonStatCard() {
  return (
    <div
      className="glass"
      style={{
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: "60%", height: 16, borderRadius: 4 }} className="skeleton" />
        <div style={{ width: 32, height: 32, borderRadius: 8 }} className="skeleton" />
      </div>
      <div>
        <div style={{ width: "80%", height: 36, borderRadius: 6, marginBottom: 8 }} className="skeleton" />
        <div style={{ width: "40%", height: 14, borderRadius: 4 }} className="skeleton" />
      </div>
    </div>
  );
}

export function SkeletonGrowthChart() {
  return (
    <div
      className="glass"
      style={{
        padding: "24px 32px",
        height: 380,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <div style={{ width: 150, height: 20, borderRadius: 4, marginBottom: 8 }} className="skeleton" />
        <div style={{ width: 200, height: 14, borderRadius: 4 }} className="skeleton" />
      </div>
      <div style={{ flex: 1, borderRadius: 8 }} className="skeleton" />
    </div>
  );
}

export function SkeletonVideoTable() {
  return (
    <div className="glass" style={{ padding: "24px 32px", overflowX: "auto" }}>
      <div style={{ width: 120, height: 20, borderRadius: 4, marginBottom: 24 }} className="skeleton" />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <th key={i} style={{ padding: "0 16px 16px 16px" }}>
                <div style={{ width: 80, height: 14, borderRadius: 4 }} className="skeleton" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 3 }).map((_, rowIdx) => (
            <tr key={rowIdx} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "16px" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 100, height: 56, borderRadius: 8 }} className="skeleton" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    <div style={{ width: "80%", height: 16, borderRadius: 4 }} className="skeleton" />
                    <div style={{ width: "40%", height: 12, borderRadius: 4 }} className="skeleton" />
                  </div>
                </div>
              </td>
              {Array.from({ length: 4 }).map((_, colIdx) => (
                <td key={colIdx} style={{ padding: "16px" }}>
                  <div style={{ width: 60, height: 14, borderRadius: 4 }} className="skeleton" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
