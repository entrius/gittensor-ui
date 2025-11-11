import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import {
  BITTENSOR_NETWORK,
  ALPHA_TOKEN_ADDRESS,
  BOUNTY_CONTRACT_ADDRESS,
  ALPHA_TOKEN_ABI,
  BOUNTY_ABI,
} from '../../config/bittensorConfig';

interface StatusMessage {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

interface IssueRegistrationModalProps {
  open: boolean;
  onClose: () => void;
}

const IssueRegistrationModal: React.FC<IssueRegistrationModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State management
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Truncate address for display
  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Connect MetaMask wallet
  const connectWallet = async (): Promise<boolean> => {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        setStatus({
          type: 'error',
          message: 'Please install MetaMask to use this feature.',
        });
        return false;
      }

      setLoading(true);
      setStatus({
        type: 'info',
        message: 'Connecting to MetaMask...',
      });

      const browserProvider = new BrowserProvider(window.ethereum);

      // Try to switch to Bittensor network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BITTENSOR_NETWORK.chainId }],
        });
      } catch (switchError: any) {
        // Network doesn't exist, add it
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [BITTENSOR_NETWORK],
            });
          } catch (addError: any) {
            console.error('Add network error:', addError);
            setStatus({
              type: 'error',
              message: `Failed to add Bittensor network: ${addError.message || addError.code || 'Unknown error'}`,
            });
            setLoading(false);
            return false;
          }
        } else {
          setStatus({
            type: 'error',
            message: 'Failed to switch to Bittensor network.',
          });
          setLoading(false);
          return false;
        }
      }

      // Request account access
      const accounts = await browserProvider.send('eth_requestAccounts', []);
      const userAccount = accounts[0];

      setProvider(browserProvider);
      setAccount(userAccount);
      setStatus({
        type: 'success',
        message: `Connected: ${truncateAddress(userAccount)}`,
      });
      setLoading(false);
      return true;
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      setStatus({
        type: 'error',
        message: error.message || 'Failed to connect wallet.',
      });
      setLoading(false);
      return false;
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setStatus(null);
  };

  // Validate form inputs
  const validateInputs = (): boolean => {
    if (!githubUrl.trim()) {
      setStatus({
        type: 'error',
        message: 'Please enter a GitHub issue URL.',
      });
      return false;
    }

    // Basic URL validation
    try {
      const url = new URL(githubUrl);
      if (!url.hostname.includes('github.com')) {
        setStatus({
          type: 'error',
          message: 'Please enter a valid GitHub URL.',
        });
        return false;
      }
    } catch {
      setStatus({
        type: 'error',
        message: 'Please enter a valid URL.',
      });
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setStatus({
        type: 'error',
        message: 'Please enter a valid amount greater than 0.',
      });
      return false;
    }

    return true;
  };

  // Handle payment process
  const handlePayment = async () => {
    // Validate inputs first
    if (!validateInputs()) {
      return;
    }

    // Ensure wallet is connected
    if (!account || !provider) {
      const connected = await connectWallet();
      if (!connected) {
        return;
      }
    }

    setLoading(true);

    try {
      const signer = await provider!.getSigner();
      const amountWei = parseUnits(amount, 18);

      // Transaction 1: Approve token spending
      setStatus({
        type: 'info',
        message: 'Step 1/2: Approve token spending...',
      });

      const alphaTokenContract = new Contract(
        ALPHA_TOKEN_ADDRESS,
        ALPHA_TOKEN_ABI,
        signer
      );

      const approveTx = await alphaTokenContract.approve(
        BOUNTY_CONTRACT_ADDRESS,
        amountWei
      );

      setStatus({
        type: 'info',
        message: 'Step 1/2: Waiting for approval confirmation...',
      });

      await approveTx.wait();

      // Transaction 2: Register issue
      setStatus({
        type: 'info',
        message: 'Step 2/2: Registering issue...',
      });

      const bountyContract = new Contract(
        BOUNTY_CONTRACT_ADDRESS,
        BOUNTY_ABI,
        signer
      );

      const registerTx = await bountyContract.registerIssue(githubUrl, amountWei);

      setStatus({
        type: 'info',
        message: 'Step 2/2: Waiting for registration confirmation...',
      });

      const receipt = await registerTx.wait();

      // Success!
      setStatus({
        type: 'success',
        message: `Success! Transaction: ${receipt.hash}`,
      });

      // Clear form
      setGithubUrl('');
      setAmount('');
    } catch (error: any) {
      console.error('Payment error:', error);

      // User rejected transaction
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        setStatus({
          type: 'warning',
          message: 'Transaction cancelled by user.',
        });
      } else if (error.reason) {
        setStatus({
          type: 'error',
          message: `Transaction failed: ${error.reason}`,
        });
      } else if (error.message) {
        setStatus({
          type: 'error',
          message: `Error: ${error.message}`,
        });
      } else {
        setStatus({
          type: 'error',
          message: 'Transaction failed. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Render status alert
  const renderStatus = () => {
    if (!status) return null;

    return (
      <Alert
        severity={status.type}
        sx={{
          mt: 2,
          wordBreak: 'break-word',
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
        icon={loading ? <CircularProgress size={20} /> : undefined}
      >
        {status.message}
      </Alert>
    );
  };

  // Reset form when modal closes
  const handleClose = () => {
    setGithubUrl('');
    setAmount('');
    setStatus(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography
          variant="h5"
          component="span"
          sx={{
            fontFamily: '"CY Grotesk Grand", "Inter", "Helvetica Neue", sans-serif',
          }}
        >
          Register GitHub Issue
        </Typography>
        <IconButton
          onClick={handleClose}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary',
            },
          }}
        >
          <XMarkIcon style={{ height: 24, width: 24 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          Incentivize open source contributions by placing a bounty on GitHub issues using Alpha tokens
        </Typography>

        {!account ? (
          // Not connected - Show connect button
          <Box>
            <Button
              variant="contained"
              fullWidth
              onClick={connectWallet}
              disabled={loading}
              sx={{
                p: 1.5,
                fontSize: 16,
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 600,
              }}
            >
              {loading ? 'Connecting...' : 'Connect MetaMask'}
            </Button>
            {renderStatus()}
          </Box>
        ) : (
          // Connected - Show form
          <Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                p: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Connected: {truncateAddress(account)}
              </Typography>
              <Button
                size="small"
                onClick={disconnectWallet}
                sx={{ textTransform: 'none' }}
              >
                Disconnect
              </Button>
            </Box>

            <TextField
              fullWidth
              type="url"
              label="GitHub Issue URL"
              placeholder="https://github.com/user/repo/issues/123"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              disabled={loading}
              sx={{
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
              InputProps={{
                sx: { fontSize: 16 },
              }}
              InputLabelProps={{
                sx: { fontSize: 14 },
              }}
            />

            <TextField
              fullWidth
              type="number"
              label="Amount (Alpha tokens)"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              inputProps={{
                min: 0,
                step: 0.01,
              }}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
              InputProps={{
                sx: { fontSize: 16 },
              }}
              InputLabelProps={{
                sx: { fontSize: 14 },
              }}
            />

            <Button
              variant="contained"
              fullWidth
              onClick={handlePayment}
              disabled={loading || !githubUrl.trim() || !amount}
              sx={{
                p: 1.5,
                fontSize: 16,
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 600,
              }}
            >
              {loading ? 'Processing...' : 'Pay & Register Issue'}
            </Button>

            {renderStatus()}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IssueRegistrationModal;
