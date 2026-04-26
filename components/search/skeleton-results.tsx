export function SkeletonResults() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-72 animate-pulse rounded-[28px] border border-white/10 bg-white/10" />
      ))}
    </div>
  );
}
