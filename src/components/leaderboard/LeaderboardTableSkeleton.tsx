import React from 'react';
import { Skeleton, TableCell, TableRow } from '@mui/material';
import { bodyCellStyle } from './types';

type SkeletonVariant = 'miners' | 'prs' | 'repositories';

interface LeaderboardTableSkeletonProps {
  variant: SkeletonVariant;
  rows?: number;
}

const LAYOUTS: Record<
  SkeletonVariant,
  Array<{ width: string; barWidth: string; align?: 'right' }>
> = {
  miners: [
    { width: '80px', barWidth: '24px' },
    { width: '25%', barWidth: '60%' },
    { width: '15%', barWidth: '40%', align: 'right' },
    { width: '15%', barWidth: '40%', align: 'right' },
    { width: '15%', barWidth: '40%', align: 'right' },
    { width: '15%', barWidth: '50%', align: 'right' },
  ],
  prs: [
    { width: '80px', barWidth: '24px' },
    { width: '40%', barWidth: '80%' },
    { width: '20%', barWidth: '60%' },
    { width: '20%', barWidth: '60%' },
    { width: '10%', barWidth: '50%' },
    { width: '15%', barWidth: '55%', align: 'right' },
  ],
  repositories: [
    { width: '60px', barWidth: '24px' },
    { width: '35%', barWidth: '70%' },
    { width: '12%', barWidth: '50%', align: 'right' },
    { width: '18%', barWidth: '55%', align: 'right' },
    { width: '15%', barWidth: '40%', align: 'right' },
    { width: '15%', barWidth: '40%', align: 'right' },
    { width: '52px', barWidth: '20px' },
  ],
};

const LeaderboardTableSkeleton: React.FC<LeaderboardTableSkeletonProps> = ({
  variant,
  rows = 10,
}) => {
  const cols = LAYOUTS[variant];
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <TableRow key={rowIdx} aria-hidden="true">
          {cols.map((col, colIdx) => (
            <TableCell
              key={colIdx}
              align={col.align}
              sx={{ ...bodyCellStyle, width: col.width }}
            >
              <Skeleton
                variant="text"
                width={col.barWidth}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.06)',
                  ml: col.align === 'right' ? 'auto' : 0,
                }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};

export default LeaderboardTableSkeleton;
