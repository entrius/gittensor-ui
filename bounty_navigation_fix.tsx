import React, { useState, useCallback } from 'react';

// Fix: Bounty submission links and back navigation consistency
// Addresses issue #906

interface BountyItem {
  id: string;
  title: string;
  url: string;
  status: string;
}

export function useBountyNavigation() {
  const [history, setHistory] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);

  const navigate = useCallback((url: string) => {
    setHistory(prev => current ? [...prev, current] : prev);
    setCurrent(url);
  }, [current]);

  const goBack = useCallback(() => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory(h => h.slice(0, -1));
      setCurrent(prev);
    }
  }, [history]);

  const getBountyUrl = useCallback((bounty: BountyItem): string => {
    // Consistent URL format for bounty links
    return '/bounties/' + bounty.id;
  }, []);

  return { current, navigate, goBack, getBountyUrl, canGoBack: history.length > 0 };
}

export default useBountyNavigation;
