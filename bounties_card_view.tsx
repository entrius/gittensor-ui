import React, { useState } from 'react';

// Add card view + toolbar parity to Bounties tab
// Addresses issue #858

interface Bounty {
  id: string;
  title: string;
  description: string;
  reward: number;
  currency: string;
  status: string;
}

interface BountiesTabProps {
  bounties: Bounty[];
  viewMode?: 'list' | 'card';
}

export const BountiesTab: React.FC<BountiesTabProps> = ({ bounties, viewMode: initialMode = 'card' }) => {
  const [viewMode, setViewMode] = useState<'list' | 'card'>(initialMode);
  const [sortBy, setSortBy] = useState<'reward' | 'date'>('reward');

  const sorted = [...bounties].sort((a, b) => {
    if (sortBy === 'reward') return b.reward - a.reward;
    return 0;
  });

  return (
    <div className="bounties-tab">
      <div className="toolbar">
        <div className="view-toggle">
          <button onClick={() => setViewMode('card')} className={viewMode === 'card' ? 'active' : ''}>Cards</button>
          <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'active' : ''}>List</button>
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'reward' | 'date')}>
          <option value="reward">Sort by Reward</option>
          <option value="date">Sort by Date</option>
        </select>
      </div>
      <div className={viewMode === 'card' ? 'card-grid' : 'list-view'}>
        {sorted.map(bounty => (
          viewMode === 'card' ? (
            <div key={bounty.id} className="bounty-card">
              <h3>{bounty.title}</h3>
              <p>{bounty.description}</p>
              <span className="reward">{bounty.reward} {bounty.currency}</span>
              <span className={'status ' + bounty.status}>{bounty.status}</span>
            </div>
          ) : (
            <div key={bounty.id} className="bounty-list-item">
              <span>{bounty.title}</span>
              <span>{bounty.reward} {bounty.currency}</span>
              <span>{bounty.status}</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default BountiesTab;
