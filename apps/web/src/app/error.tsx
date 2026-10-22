"use client";

import { useEffect } from "react";

import { createLogger } from "@negosyo-os/core/logging";
import { Button } from "@negosyo-os/ui";

const clientLogger = createLogger({ surface: "root-error-boundary" });

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    clientLogger.error("Route rendering failed", error, { digest: error.digest });
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold text-destructive">Unexpected error</p>
        <h1 className="mt-2 text-3xl font-semibold">This page could not be loaded.</h1>
        <p className="mt-3 text-muted-foreground">The failure was logged. You can safely try again.</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
