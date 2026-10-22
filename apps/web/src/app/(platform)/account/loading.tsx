export default function AccountLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl animate-pulse px-6 py-16" aria-busy="true">
      <div className="h-9 w-48 rounded bg-muted" />
      <div className="mt-10 h-72 rounded-2xl bg-muted" />
    </main>
  );
}
