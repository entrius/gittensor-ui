import { type ChangeEvent, useEffect, useState } from 'react';

interface UseTableControlsOptions {
  initialSearchQuery?: string;
  initialPage?: number;
  initialRowsPerPage?: number;
  initialShowChart?: boolean;
  initialUseLogScale?: boolean;
}

export const useTableControls = (options: UseTableControlsOptions = {}) => {
  const {
    initialSearchQuery = '',
    initialPage = 0,
    initialRowsPerPage = 10,
    initialShowChart = false,
    initialUseLogScale = true,
  } = options;

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [showChart, setShowChart] = useState(initialShowChart);
  const [page, setPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [useLogScale, setUseLogScale] = useState(initialUseLogScale);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    showChart,
    setShowChart,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    useLogScale,
    setUseLogScale,
    handleChangePage,
    handleChangeRowsPerPage,
  };
};
