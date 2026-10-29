import React from "react";
import { useEffect, useRef } from "react";
import { mountPlatform } from "../platform/engine.js";
import "../styles/global.css";

/**
 * React lifecycle wrapper for the PrivacySEK platform demo.
 * Replace the sample data with API responses when the backend is ready.
 */
export default function AppLayout({ data }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    return mountPlatform(ref.current, data);
  }, [data]);
  return <div ref={ref} style={{ height: "100%" }} />;
}
