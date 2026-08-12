export default function Loading() {
  const skeletonCards = ["loading-card-1", "loading-card-2", "loading-card-3"];

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="glass-panel rounded-3xl p-6">
        <div className="skeleton h-8 w-56 rounded-lg" />
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {skeletonCards.map((cardId) => (
            <div key={cardId} className="glass-panel rounded-2xl p-4">
              <div className="skeleton h-5 w-24 rounded" />
              <div className="skeleton mt-3 h-8 w-32 rounded" />
              <div className="skeleton mt-3 h-4 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
