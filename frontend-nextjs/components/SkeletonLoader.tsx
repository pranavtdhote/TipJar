"use client";

export default function SkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-container" aria-label="Loading supporter feed" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-header">
            <div className="skeleton-user">
              <div className="skeleton-circle" />
              <div className="skeleton-line skeleton-addr" />
            </div>
            <div className="skeleton-line skeleton-badge" />
          </div>
          <div className="skeleton-line skeleton-msg" />
          <div className="skeleton-line skeleton-time" />
        </div>
      ))}
    </div>
  );
}
