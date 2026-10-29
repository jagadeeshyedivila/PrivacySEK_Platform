import React from "react";
import { useState, useEffect } from "react";
import AppLayout from "./app/AppLayout.jsx";
import { platformApi } from "./platform/platformApi.js";

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const initData = await platformApi.fetchInitData();
      if (!initData?.org?.short || !Array.isArray(initData.guard?.approvals)) {
        throw new Error("Platform data is not initialized. Restart the backend to seed demo data, or run npm run migrate.");
      }
      setData(initData);
    } catch (err) {
      console.error("[PrivacySEK] App initialization failed:", err);
      setError(err.message || "Failed to connect to backend server / MongoDB.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0B0F19",
        color: "#F3F4F6",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <div style={{
          width: "48px",
          height: "48px",
          border: "3px solid rgba(20, 184, 166, 0.2)",
          borderTopColor: "#14B8A6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: "16px"
        }} />
        <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 6px" }}>PrivacySEK Platform</h2>
        <p style={{ color: "#9CA3AF", fontSize: "14px", margin: 0 }}>
          Connecting to local MongoDB persistence layer...
        </p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0B0F19",
        color: "#F3F4F6",
        padding: "20px",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <div style={{
          maxWidth: "520px",
          background: "#111827",
          border: "1px solid #EF4444",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
            <span style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.2)",
              color: "#EF4444",
              display: "grid",
              placeItems: "center",
              fontWeight: "bold"
            }}>!</span>
            <h2 style={{ fontSize: "18px", fontWeight: "600", margin: 0 }}>Database Connection Error</h2>
          </div>
          <p style={{ color: "#D1D5DB", fontSize: "14px", lineHeight: "1.6", marginBottom: "16px" }}>
            The platform is configured to use local MongoDB as its sole persistence layer, but could not connect to the backend API or MongoDB server.
          </p>
          <div style={{
            background: "#1F2937",
            padding: "12px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#F87171",
            fontFamily: "monospace",
            marginBottom: "20px"
          }}>
            {error}
          </div>
          <p style={{ color: "#9CA3AF", fontSize: "13px", marginBottom: "20px" }}>
            Ensure your local MongoDB instance is active on <code>mongodb://127.0.0.1:27017</code> and start the backend service:
            <br /><code style={{ display: "block", marginTop: "6px", color: "#A7F3D0" }}>npm run server</code>
          </p>
          <button
            onClick={loadData}
            style={{
              background: "#14B8A6",
              color: "#042F2E",
              fontWeight: "600",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return <AppLayout data={data} />;
}
