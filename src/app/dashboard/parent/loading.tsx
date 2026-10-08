export default function ParentLoading() {
  return (
    <main className="min-h-screen bg-[#11100e] px-4 py-12 text-[#f7f1e4]" role="status">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#e4c86a]">
          Parent portal
        </p>
        <h1 className="mt-5 font-plex-serif text-3xl">Loading your student&apos;s week…</h1>
        <p className="mt-3 text-base text-[#c9c0af]">
          Checking linked students and recent activity.
        </p>
      </div>
    </main>
  );
}
