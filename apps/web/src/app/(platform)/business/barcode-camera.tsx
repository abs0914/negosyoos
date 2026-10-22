"use client";

import { useEffect, useRef, useState } from "react";

interface BarcodeResult { rawValue: string }
interface BarcodeDetectorLike { detect(source: ImageBitmapSource): Promise<BarcodeResult[]> }
interface BarcodeDetectorConstructor { new(options?: { formats?: string[] }): BarcodeDetectorLike }

export function BarcodeCamera({ onDetected, onClose }: { onDetected(value: string): void; onClose(): void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    let stream: MediaStream | undefined;
    let frame = 0;
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    async function start() {
      if (!Detector) {
        await Promise.resolve();
        if (active) setError("Camera barcode detection is not supported here. Use the scanner or enter the SKU manually.");
        return;
      }
      const detector = new Detector({ formats: ["ean_13", "ean_8", "code_128", "qr_code", "upc_a", "upc_e"] });
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!active || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        async function scan() {
          if (!active || !video.current) return;
          try {
            const results = await detector.detect(video.current);
            const value = results[0]?.rawValue;
            if (value) { active = false; onDetected(value); return; }
          } catch { /* Frames can be temporarily unavailable while the camera starts. */ }
          frame = requestAnimationFrame(scan);
        }
        frame = requestAnimationFrame(scan);
      } catch {
        setError("Camera access was unavailable. Check browser permission or use manual entry.");
      }
    }
    void start();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onDetected]);

  return <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4" role="dialog">
    <div className="w-full max-w-lg rounded-2xl bg-card p-4 shadow-2xl">
      <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase text-primary">Camera scanner</p><h2 className="text-lg font-semibold">Center the barcode</h2></div><button className="min-h-11 rounded-lg border px-4 font-semibold" onClick={onClose}>Close</button></div>
      {error ? <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{error}</p> : <video className="mt-4 aspect-video w-full rounded-xl bg-black object-cover" muted playsInline ref={video}/>} 
    </div>
  </div>;
}
