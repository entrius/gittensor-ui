import React, { useState, useEffect } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { usePolkadotWallet, useContract } from '../../hooks/usePolkadotWallet';
import {
  ALPHA_TOKEN,
  BOUNTY_CONTRACT,
  NETWORK_INFO,
  areContractsConfigured,
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

  // Polkadot wallet hook
  const wallet = usePolkadotWallet();
  const contract = useContract(wallet);

  // Form state
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Update status when wallet error changes
  useEffect(() => {
    if (wallet.error) {
      setStatus({
        type: 'error',
        message: wallet.error,
      });
    }
  }, [wallet.error]);

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

  // Handle payment/registration process
  const handlePayment = async () => {
    // Validate inputs first
    if (!validateInputs()) {
      return;
    }

    // Check if contracts are configured
    if (!areContractsConfigured()) {
      setStatus({
        type: 'error',
        message: 'Contracts not configured yet. Please wait for deployment to testnet.',
      });
      return;
    }

    setLoading(true);

    try {
      // Ensure we have API and account
      if (!contract.api || !contract.account) {
        throw new Error('Wallet not connected or API not ready');
      }

      const signer = await contract.getSigner();

      // Convert amount to smallest unit (ALPHA has 18 decimals)
      const amountInSmallestUnit = BigInt(parseFloat(amount) * 10 ** ALPHA_TOKEN.decimals);

      // Step 1: Approve ALPHA token spending via pallet-assets
      setStatus({
        type: 'info',
        message: 'Step 1/2: Approving ALPHA token spending...',
      });

      // Call pallet-assets approve_transfer
      // This allows the bounty contract to transfer tokens on behalf of the user
      const approveCall = contract.api.tx.assets.approveTransfer(
        ALPHA_TOKEN.assetId,
        BOUNTY_CONTRACT.address,
        amountInSmallestUnit.toString()
      );

      const approveResult = await approveCall.signAndSend(
        contract.account.address,
        { signer },
        ({ status, events }) => {
          if (status.isInBlock) {
            console.log(`Approval included in block ${status.asInBlock}`);
          }
        }
      );

      setStatus({
        type: 'info',
        message: 'Step 1/2: Approval confirmed, waiting for finalization...',
      });

      // Wait for approval to finalize
      await new Promise((resolve) => setTimeout(resolve, 6000)); // Wait ~1 block

      // Step 2: Call the bounty contract to register the issue
      setStatus({
        type: 'info',
        message: 'Step 2/2: Registering issue on-chain...',
      });

      // TODO: Once contract is deployed, we'll use ContractPromise here
      // Example (will be uncommented when contract is ready):
      /*
      const contract = new ContractPromise(
        contract.api,
        BOUNTY_CONTRACT.metadata,
        BOUNTY_CONTRACT.address
      );

      const registerTx = await contract.tx.registerIssue(
        { gasLimit: -1, storageDepositLimit: null },
        githubUrl,
        amountInSmallestUnit.toString()
      ).signAndSend(
        contract.account.address,
        { signer },
        ({ status, events }) => {
          if (status.isInBlock) {
            console.log(`Registration in block ${status.asInBlock}`);
          }
        }
      );
      */

      // For now, show a placeholder success message
      setStatus({
        type: 'info',
        message: 'Contract interaction will be implemented after WASM contract deployment.',
      });

      // Simulate success for now
      setTimeout(() => {
        setStatus({
          type: 'success',
          message: `Ready to register! Network: ${NETWORK_INFO.name}. Contract deployment pending.`,
        });

        // Clear form
        setGithubUrl('');
        setAmount('');
      }, 2000);
    } catch (error: any) {
      console.error('Registration error:', error);

      // User rejected transaction
      if (error.message?.includes('Cancelled')) {
        setStatus({
          type: 'warning',
          message: 'Transaction cancelled by user.',
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
          sx={{ mb: 3, lineHeight: 1.6 }}
        >
          Place a bounty on your GitHub issue using Gittensor Subnet ALPHA tokens to attract miner attention.
          Your bounty enters the miners' pool of available issues, where they're incentivized to prioritize
          solutions based on bounty amounts. While registration doesn't guarantee a direct solution, our
          network enhances your bounty over time with additional ALPHA tokens as your issue remains open
          (up to a limit to prevent gaming). This time-based allocation increases rewards to further
          incentivize our best miners and improves the likelihood that your issue will be solved.
        </Typography>

        {/* Network Info Badge */}
        <Box
          sx={{
            mb: 3,
            p: 1.5,
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 2,
          }}
        >
          <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
            Network: {NETWORK_INFO.name}
          </Typography>
        </Box>

        {!wallet.isConnected ? (
          // Not connected - Show connect button
          <Box>
            <Button
              variant="contained"
              fullWidth
              onClick={wallet.connect}
              disabled={wallet.isConnecting}
              sx={{
                p: 1.5,
                fontSize: 16,
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 600,
              }}
            >
              {wallet.isConnecting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Connecting...
                </>
              ) : (
                'Connect Substrate Wallet'
              )}
            </Button>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 1.5, textAlign: 'center' }}
            >
              Compatible with Talisman & Polkadot.js extension
            </Typography>

            {renderStatus()}
          </Box>
        ) : (
          // Connected - Show form
          <Box>
            {/* Account selector */}
            <Box
              sx={{
                mb: 3,
                p: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Connected Account
                </Typography>
                <Button size="small" onClick={wallet.disconnect} sx={{ textTransform: 'none' }}>
                  Disconnect
                </Button>
              </Box>

              {wallet.accounts.length > 1 ? (
                <FormControl fullWidth size="small">
                  <Select
                    value={wallet.account?.address || ''}
                    onChange={(e) => {
                      const selected = wallet.accounts.find((acc) => acc.address === e.target.value);
                      if (selected) wallet.selectAccount(selected);
                    }}
                    sx={{
                      fontSize: 14,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                  >
                    {wallet.accounts.map((acc) => (
                      <MenuItem key={acc.address} value={acc.address}>
                        <Box>
                          <Typography variant="body2">{acc.meta.name || 'Unnamed Account'}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {wallet.formatAddress(acc.address)}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {wallet.account?.meta.name || 'Unnamed Account'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {wallet.formatAddress(wallet.account?.address || '')}
                  </Typography>
                </Box>
              )}
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
              label={`Amount (${ALPHA_TOKEN.symbol} tokens)`}
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
