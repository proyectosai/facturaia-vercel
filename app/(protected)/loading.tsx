export default function ProtectedLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-6 w-28 rounded-full bg-white/70" />
      <div className="h-20 w-full max-w-4xl rounded-[32px] bg-white/70" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-44 rounded-[32px] bg-white/70" />
        <div className="h-44 rounded-[32px] bg-white/70" />
        <div className="h-44 rounded-[32px] bg-white/70" />
      </div>
    </div>
  );
}
