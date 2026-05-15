import React from 'react';

// Fix: Pluralize issue count in Bounty Pool chart subtitle
// Addresses issue #1153

interface BountyPoolChartProps {
  issueCount: number;
  totalPool: number;
  currency: string;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || singular + 's');
}

export const BountyPoolChart: React.FC<BountyPoolChartProps> = ({ issueCount, totalPool, currency }) => {
  const subtitle = issueCount + ' ' + pluralize(issueCount, 'issue') + ' · ' + totalPool + ' ' + currency + ' total';

  return (
    <div className="bounty-pool-chart">
      <h3>Bounty Pool</h3>
      <p className="subtitle">{subtitle}</p>
      <div className="chart-container">
        {/* Chart rendering logic */}
        <div className="pool-bar" style={{ width: '100%' }}>
          <span>{totalPool} {currency}</span>
        </div>
      </div>
    </div>
  );
};

export default BountyPoolChart;
