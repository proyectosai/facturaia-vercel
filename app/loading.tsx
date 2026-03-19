export default function RootLoading() {
  return (
    <main className="page-shell px-2 py-10">
      <div className="animate-pulse space-y-5">
        <div className="h-6 w-32 rounded-full bg-white/70" />
        <div className="h-16 w-full max-w-3xl rounded-[28px] bg-white/70" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-52 rounded-[32px] bg-white/70" />
          <div className="h-52 rounded-[32px] bg-white/70" />
          <div className="h-52 rounded-[32px] bg-white/70" />
        </div>
      </div>
    </main>
  );
}
