export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl animate-pulse px-6 py-20" aria-busy="true" aria-label="Loading page">
      <div className="h-5 w-36 rounded bg-muted" />
      <div className="mt-6 h-14 max-w-2xl rounded bg-muted" />
      <div className="mt-4 h-6 max-w-xl rounded bg-muted" />
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => <div className="h-32 rounded-xl bg-muted" key={item} />)}
      </div>
    </main>
  );
}
