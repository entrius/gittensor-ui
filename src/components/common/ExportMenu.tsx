import React, { useCallback, useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import {
  type ExportColumn,
  type ExportOptions,
  exportRowsToExcel,
  exportRowsToPdf,
} from '../../utils';

interface ExportMenuProps<T> {
  rows: T[];
  columns: ExportColumn<T>[];
  options: ExportOptions;
  label?: string;
  size?: 'small' | 'medium';
  disabled?: boolean;
}

export const ExportMenu = <T,>({
  rows,
  columns,
  options,
  label = 'Export',
  size = 'small',
  disabled,
}: ExportMenuProps<T>): React.ReactElement => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const isOpen = Boolean(anchorEl);
  const isEmpty = rows.length === 0;
  const isDisabled = disabled || isEmpty;

  const handleOpen = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    },
    [],
  );

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleExportExcel = useCallback(() => {
    exportRowsToExcel(rows, columns, options);
    handleClose();
  }, [rows, columns, options, handleClose]);

  const handleExportPdf = useCallback(() => {
    exportRowsToPdf(rows, columns, options);
    handleClose();
  }, [rows, columns, options, handleClose]);

  return (
    <>
      <Button
        size={size}
        variant="outlined"
        onClick={handleOpen}
        disabled={isDisabled}
        startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: '1rem' }} />}
        endIcon={<ArrowDropDownIcon sx={{ fontSize: '1rem' }} />}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        sx={{
          height: size === 'small' ? 32 : 36,
          textTransform: 'none',
          fontSize: '0.75rem',
          fontWeight: 500,
          borderColor: 'border.light',
          color: 'text.primary',
          backgroundColor: 'background.default',
          '&:hover': {
            borderColor: 'border.medium',
            backgroundColor: 'surface.subtle',
          },
        }}
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        MenuListProps={{ dense: true }}
      >
        <MenuItem onClick={handleExportExcel}>
          <ListItemIcon>
            <TableChartOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Excel (.xlsx)"
            primaryTypographyProps={{ fontSize: '0.8rem' }}
          />
        </MenuItem>
        <MenuItem onClick={handleExportPdf}>
          <ListItemIcon>
            <PictureAsPdfOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="PDF"
            primaryTypographyProps={{ fontSize: '0.8rem' }}
          />
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExportMenu;
