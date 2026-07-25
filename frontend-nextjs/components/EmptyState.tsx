"use client";

interface EmptyStateProps {
  onActionClick?: () => void;
}

export default function EmptyState({ onActionClick }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon-wrapper">
        <svg
          className="empty-svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>
      <h4 className="empty-title">No tips recorded yet</h4>
      <p className="empty-desc">
        Be the first supporter to send ETH and leave a permanent note on-chain!
      </p>
      {onActionClick && (
        <button className="btn-secondary empty-btn" onClick={onActionClick}>
          Send First Tip ⚡
        </button>
      )}
    </div>
  );
}
