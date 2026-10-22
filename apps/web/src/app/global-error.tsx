"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-PH">
      <body>
        <main style={{ fontFamily: "sans-serif", margin: "15vh auto", maxWidth: 640, padding: 24 }}>
          <h1>NegosyoOS is temporarily unavailable.</h1>
          <p>Please retry. If the problem continues, contact support with the time it occurred.</p>
          <button onClick={reset} type="button">Try again</button>
        </main>
      </body>
    </html>
  );
}
