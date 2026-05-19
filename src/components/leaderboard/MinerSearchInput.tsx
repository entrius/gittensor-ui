import { InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ClearSearchAdornment } from '../common';
import { DebouncedSearchInput } from '../common/DebouncedSearchInput';

export interface MinerSearchInputProps {
  initialValue: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MinerSearchInput({
  initialValue,
  onChange,
  placeholder = 'Search by GitHub ID',
}: MinerSearchInputProps): JSX.Element {
  return (
    <DebouncedSearchInput
      initialDraft={initialValue}
      onDebouncedChange={onChange}
    >
      {({ draftValue, setDraftValue }) => (
        <TextField
          placeholder={placeholder}
          size="small"
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.tertiary', fontSize: '1rem' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <ClearSearchAdornment
                visible={Boolean(draftValue)}
                onClear={() => {
                  setDraftValue('');
                  onChange('');
                }}
              />
            ),
          }}
          sx={{
            width: { xs: '100%', sm: 260 },
            '& .MuiOutlinedInput-root': {
              color: 'text.primary',
              backgroundColor: 'background.default',
              fontSize: '0.8rem',
              height: '36px',
              borderRadius: 2,
              '& fieldset': { borderColor: 'border.light' },
              '&:hover fieldset': { borderColor: 'border.medium' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            },
          }}
        />
      )}
    </DebouncedSearchInput>
  );
}
