import React, { useState } from "react";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? "var(--accent)" : "var(--bg-3)",
        position: "relative", cursor: "pointer", transition: "background 0.2s",
        border: "1px solid var(--border-1)",
        flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 2,
        left: value ? 18 : 2,
        width: 16, height: 16, borderRadius: 8,
        background: "white", transition: "left 0.15s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
      }} />
    </div>
  );
}

export function SettingsPage() {
  const [notifyApprovals, setNotifyApprovals] = useState(
    () => localStorage.getItem("paperclip_notify_approvals") !== "false"
  );
  const [notifySystem, setNotifySystem] = useState(
    () => localStorage.getItem("paperclip_notify_system") !== "false"
  );

  function handleNotifyApprovals(v: boolean) {
    setNotifyApprovals(v);
    localStorage.setItem("paperclip_notify_approvals", v ? "true" : "false");
  }

  function handleNotifySystem(v: boolean) {
    setNotifySystem(v);
    localStorage.setItem("paperclip_notify_system", v ? "true" : "false");
  }

  return (
    <main className="main" style={{ padding: "32px 36px", overflowY: "auto" }}>
      <h1 style={{ margin: "0 0 28px", fontSize: 20, fontWeight: 700, color: "var(--fg-0)" }}>
        Settings
      </h1>

      <section style={{
        background: "var(--bg-1)", border: "1px solid var(--border-1)",
        borderRadius: 10, padding: "20px 24px", maxWidth: 520,
      }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "var(--fg-0)" }}>
          알림 (Notifications)
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--fg-0)", fontWeight: 500 }}>
                새 승인 요청 알림
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                앱 내 배너로 새 승인 요청을 알립니다.
              </div>
            </div>
            <Toggle value={notifyApprovals} onChange={handleNotifyApprovals} />
          </div>

          <div style={{ borderTop: "1px solid var(--border-1)" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--fg-0)", fontWeight: 500 }}>
                Windows 시스템 알림
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                운영체제 알림 센터에 팝업을 표시합니다.
              </div>
            </div>
            <Toggle value={notifySystem} onChange={handleNotifySystem} />
          </div>
        </div>

        <div style={{
          marginTop: 18, padding: "10px 14px",
          background: "var(--bg-2)", border: "1px solid var(--border-1)",
          borderRadius: 7, fontSize: 12, color: "var(--fg-3)", lineHeight: 1.6,
        }}>
          새 승인 요청이 올 때 앱 내 알림과 Windows 알림을 표시합니다.
        </div>
      </section>
    </main>
  );
}
