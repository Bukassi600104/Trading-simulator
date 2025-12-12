"use client";

interface AffiliateWidgetProps {
  bonusAmount?: string;
  partnerName?: string;
}

export default function AffiliateWidget({
  bonusAmount = "$30k",
  partnerName = "Bybit",
}: AffiliateWidgetProps) {
  return (
    <div className="affiliate-widget">
      <span className="partner-badge">PARTNER OFFER</span>
      
      <div className="offer-content">
        <h3>Claim your {bonusAmount} Deposit Bonus</h3>
        <p>Exclusive integration reward for Midnight Traders on {partnerName}.</p>
      </div>

      <button className="claim-btn">
        Claim Now
        <span className="arrow">→</span>
      </button>

      <style jsx>{`
        .affiliate-widget {
          background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #334155;
          position: relative;
          overflow: hidden;
        }

        .affiliate-widget::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
        }

        .partner-badge {
          display: inline-block;
          padding: 4px 10px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          color: #10B981;
          letter-spacing: 0.5px;
          margin-bottom: 16px;
        }

        .offer-content {
          margin-bottom: 20px;
        }

        .offer-content h3 {
          font-size: 18px;
          font-weight: 700;
          color: #F1F5F9;
          margin: 0 0 8px 0;
          line-height: 1.3;
        }

        .offer-content h3::before {
          content: '💰 ';
        }

        .offer-content p {
          font-size: 13px;
          color: #94A3B8;
          margin: 0;
          line-height: 1.5;
        }

        .claim-btn {
          width: 100%;
          padding: 12px 20px;
          background: #1E293B;
          border: 1px solid #334155;
          border-radius: 10px;
          color: #F1F5F9;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .claim-btn:hover {
          background: #334155;
          border-color: #475569;
        }

        .arrow {
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
