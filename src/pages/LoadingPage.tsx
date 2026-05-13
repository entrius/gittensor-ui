import { Box, CircularProgress } from '@mui/material';

const LoadingPage: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      minHeight: { xs: '240px', sm: '320px' },
      flex: '1 1 auto',
    }}
  >
    <CircularProgress sx={{ m: 5, color: 'primary.main' }} />
  </Box>
);
export default LoadingPage;
