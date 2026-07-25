"use client";

interface SuccessModalProps {
  txHash?: string;
  amount: string;
  isSepolia: boolean;
  onClose: () => void;
}

export default function SuccessModal({ txHash, amount, isSepolia, onClose }: SuccessModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="success-modal-title">
      <div className="glass-card modal-card animate-pop">
        <button className="modal-close" onClick={onClose} aria-label="Close success message">✕</button>
        
        <div className="success-icon-badge">
          <svg className="check-svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h3 id="success-modal-title" className="modal-title">Tip Sent Successfully!</h3>
        <p className="modal-subtitle">
          Your contribution of <strong style={{ color: "#34d399" }}>{amount || "ETH"}</strong> has been permanently recorded on the blockchain.
        </p>

        {txHash && (
          <div className="tx-details-box">
            <div className="tx-details-label">Transaction Hash</div>
            <div className="mono-text tx-hash-code">{txHash}</div>
            {isSepolia ? (
              <a
                className="btn-secondary btn-sm"
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                style={{ marginTop: 10, display: "inline-flex" }}
              >
                View on Sepolia Etherscan ↗
              </a>
            ) : (
              <div className="tx-notice">Recorded on Local Hardhat Network</div>
            )}
          </div>
        )}

        <button className="btn-primary modal-action-btn" onClick={onClose}>
          Done 🎉
        </button>
      </div>
    </div>
  );
}
