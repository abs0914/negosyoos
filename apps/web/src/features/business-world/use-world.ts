"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@negosyo-os/auth/client";
import type { BusinessWorldSnapshot } from "./model";

export function worldTelemetry(event: "load" | "render_failure" | "freshness" | "zone_action" | "fallback", duration?: number) {
  // Integrators can consume this event. Deliberately excludes tenant, amounts and personal data.
  window.dispatchEvent(new CustomEvent("negosyo:world-telemetry", { detail: { event, ...(duration !== undefined ? { durationMs: Math.round(duration) } : {}) } }));
}
export function useWorld(businessId: string, branch: string | null) {
  const [snapshot, setSnapshot] = useState<BusinessWorldSnapshot | null>(null);
  const [connection, setConnection] = useState("Connecting");
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(v => v + 1), []);
  const started = useRef<number | null>(null);
  useEffect(() => {
    const visibility = () => setVisible(!document.hidden);
    visibility(); document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);
  useEffect(() => {
    if (!visible) return;
    const client = createClient();
    const controller = new AbortController();
    let disposed = false, running = false, again = false, topicsKey = "", readyCount = 0;
    let channels: ReturnType<typeof client.channel>[] = [];
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let invalidatedAt: number | null = null;
    started.current ??= performance.now();
    const schedule = () => {
      invalidatedAt ??= performance.now();
      if (!debounce) debounce = setTimeout(() => { debounce = undefined; void fetchSnapshot(); }, 350);
    };
    async function fetchSnapshot() {
      if (disposed) return;
      if (running) { again = true; return; }
      running = true;
      try {
        const response = await fetch(`/api/businesses/${businessId}/world${branch ? `?branch=${encodeURIComponent(branch)}` : ""}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          setSnapshot(null); // Never retain protected values after a failed authorization check.
          throw new Error(response.status === 401 || response.status === 403 ? "Access changed. Choose an accessible business or branch." : "World could not refresh. Retry or use the dashboard.");
        }
        const data = await response.json() as BusinessWorldSnapshot;
        if (disposed) return;
        const nextKey = data.topics.join("|");
        if (topicsKey !== nextKey) {
          topicsKey = nextKey; readyCount = 0;
          for (const channel of channels) void client.removeChannel(channel);
          try {
            await client.realtime.setAuth();
            if (disposed) return;
            // Subscribe first, then obtain a fresh snapshot on SUBSCRIBED to close the race.
            channels = data.topics.map(topic => client.channel(topic, { config: { private: true } })
            .on("broadcast", { event: "invalidate" }, schedule)
            .subscribe(status => {
              if (disposed) return;
              if (status === "SUBSCRIBED") { readyCount++; if (readyCount >= data.topics.length) setConnection("Live"); schedule(); }
              else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) { setConnection("Polling · every 30 seconds"); readyCount = 0; }
            }));
          } catch { setConnection("Polling · every 30 seconds"); topicsKey = ""; }
        }
        setSnapshot(data); setError(null);
        if (started.current !== null) { worldTelemetry("load", performance.now() - started.current); started.current = null; }
        if (invalidatedAt !== null) { worldTelemetry("freshness", performance.now() - invalidatedAt); invalidatedAt = null; }
      } catch (cause) {
        if (!disposed) { setSnapshot(null); setConnection("Disconnected"); setError(cause instanceof Error ? cause.message : "World unavailable"); }
      } finally { running = false; if (again && !disposed) { again = false; schedule(); } }
    }
    void fetchSnapshot();
    const interval = setInterval(() => void fetchSnapshot(), 30000);
    window.addEventListener("online", schedule);
    return () => { disposed = true; controller.abort(); clearInterval(interval); clearTimeout(debounce); window.removeEventListener("online", schedule); for (const c of channels) void client.removeChannel(c); };
  }, [businessId, branch, visible, revision]);
  return { snapshot: snapshot?.branchId === branch ? snapshot : null, connection: visible ? connection : "Paused while hidden", error, visible, refresh };
}
