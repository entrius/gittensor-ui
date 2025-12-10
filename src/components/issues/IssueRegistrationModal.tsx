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
} from '@mui/material';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { usePolkadotWallet, useContract } from '../../hooks/usePolkadotWallet';
import { useValidateIssue, useRegisterIssueMetadata } from '../../api/IssuesApi';
import {
  BOUNTY_CONTRACT,
  NETWORK_INFO,
  areContractsConfigured,
} from '../../config/bittensorConfig';
import { stringToU8a } from '@polkadot/util';
import { keccakAsHex } from '@polkadot/util-crypto';
import { ContractPromise } from '@polkadot/api-contract';
import contractMetadata from '../../contracts/IssueBountyManager.json';

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

  // API hooks
  const validateIssueMutation = useValidateIssue();
  const registerMetadataMutation = useRegisterIssueMetadata();

  // Form state
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [validatedIssue, setValidatedIssue] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<'validate' | 'payment'>('validate');
  const [gasMultiplier, setGasMultiplier] = useState<number>(1); // 1x = normal, 1.5x = faster, 2x = fastest

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

  // Step 1: Validate issue with API
  const handleValidateIssue = async () => {
    if (!githubUrl.trim()) {
      setStatus({
        type: 'error',
        message: 'Please enter a GitHub issue URL.',
      });
      return;
    }

    // Basic URL validation
    try {
      const url = new URL(githubUrl);
      if (!url.hostname.includes('github.com')) {
        setStatus({
          type: 'error',
          message: 'Please enter a valid GitHub URL.',
        });
        return;
      }
    } catch {
      setStatus({
        type: 'error',
        message: 'Please enter a valid URL.',
      });
      return;
    }

    setLoading(true);
    setStatus({
      type: 'info',
      message: 'Validating GitHub issue...',
    });

    try {
      const result = await validateIssueMutation.mutateAsync(githubUrl);

      if (result.valid) {
        setValidatedIssue(result.issue);
        setStatus({
          type: 'success',
          message: `✓ Issue validated: "${result.issue.title}"`,
        });
        // Advance to payment step
        setTimeout(() => {
          setCurrentStep('payment');
          setStatus(null);
        }, 1500);
      }
    } catch (error: any) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to validate issue.',
      });
      setValidatedIssue(null);
    } finally {
      setLoading(false);
    }
  };

  // Step 2 & 3: Register on smart contract + store metadata
  const handlePayment = async () => {
    if (!validatedIssue) {
      setStatus({
        type: 'error',
        message: 'Please validate the issue first.',
      });
      return;
    }

    if (!areContractsConfigured()) {
      setStatus({
        type: 'error',
        message: 'Contracts not configured yet.',
      });
      return;
    }

    setLoading(true);

    try {
      if (!contract.api || !contract.account) {
        throw new Error('Wallet not connected or API not ready');
      }

      const signer = await contract.getSigner();
      const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * 1e9)); // TAO has 9 decimals
      const githubUrlHash = keccakAsHex(stringToU8a(githubUrl));

      setStatus({
        type: 'info',
        message: 'Step 1/3: Registering issue on smart contract...',
      });

      // Create contract instance
      const contractInstance = new ContractPromise(
        contract.api,
        contractMetadata,
        BOUNTY_CONTRACT.address
      );

      // Call registerIssue function on the contract
      // Gas limits (WeightV2):
      // - refTime: Computational time limit in picoseconds (1 second = 1 trillion picoseconds)
      //   Base: 500 billion = 0.5 seconds of execution time
      //   User can adjust with gasMultiplier (1x, 1.5x, 2x)
      // - proofSize: Maximum proof size for the transaction in bytes
      //   Base: 5MB = 5,000,000 bytes
      const baseRefTime = 500000000000;
      const baseProofSize = 5000000;
      const gasLimit = contract.api.registry.createType('WeightV2', {
        refTime: Math.floor(baseRefTime * gasMultiplier),
        proofSize: Math.floor(baseProofSize * gasMultiplier),
      });

      // New contract: register(url) is payable, send TAO with value
      const registerTx = contractInstance.tx.register(
        {
          gasLimit,
          storageDepositLimit: null,
          value: amountInSmallestUnit, // TAO amount sent with transaction
        },
        githubUrl // Only parameter is the URL
      );

      // Calculate tip for transaction priority (helps with congested pools)
      // Tip is in smallest unit (planck). Higher tip = higher priority.
      // Base: 1 TAO tip at 1x, scales with multiplier
      const tipAmount = BigInt(Math.floor(1_000_000_000 * gasMultiplier)); // 1 TAO * multiplier

      // Execute transaction and wait for result
      // Dev mode: signer is a KeyringPair, sign directly
      // Production: signer is an injected signer, pass in options
      const txResult: any = await new Promise((resolve, reject) => {
        const signAndSendArgs = contract.isDevMode
          ? [signer, { tip: tipAmount }, (result: any) => handleTxResult(result, resolve, reject)] // KeyringPair with tip
          : [contract.account.address, { signer, tip: tipAmount }, (result: any) => handleTxResult(result, resolve, reject)]; // Injected signer with tip

        async function handleTxResult({ status, events, dispatchError }: any, resolve: any, reject: any) {
          if (status.isInBlock) {
            console.log(`Transaction in block: ${status.asInBlock}`);
          }

          if (status.isFinalized) {
            // Look for IssueRegistered event and extract issue ID
            let issueId = null;
            events.forEach(({ event }: any) => {
              if (event.section === 'contracts' && event.method === 'ContractEmitted') {
                console.log('Contract event:', event.data.toHuman());
              }
            });

            // Get block number from block hash by querying the header
            const blockHash = status.asFinalized.toHex();
            let blockNumber = '0';
            try {
              const header = await contract.api!.rpc.chain.getHeader(status.asFinalized);
              blockNumber = header.number.toString();
              console.log(`Finalized in block #${blockNumber} (${blockHash})`);
            } catch (e) {
              console.warn('Could not fetch block number:', e);
            }

            resolve({
              blockNumber,
              blockHash,
              txHash: blockHash,
              issueId: issueId || Date.now().toString(),
            });
          }

          if (dispatchError) {
            if (dispatchError.isModule) {
              const decoded = contract.api!.registry.findMetaError(dispatchError.asModule);
              reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
            } else {
              reject(new Error(dispatchError.toString()));
            }
          }
        }

        (registerTx.signAndSend as any)(...signAndSendArgs).catch(reject);
      });

      setStatus({
        type: 'info',
        message: 'Step 2/3: Transaction confirmed, storing metadata...',
      });

      // Step 3: Register metadata in API
      await registerMetadataMutation.mutateAsync({
        issueId: txResult.issueId,
        githubUrl,
        githubUrlHash,
        depositorAddress: contract.account.address,
        initialBountyAmount: amountInSmallestUnit.toString(),
        activeBountyAmount: amountInSmallestUnit.toString(),
        registrationTimestamp: Math.floor(Date.now() / 1000),
        blockNumber: txResult.blockNumber,
        txHash: txResult.txHash,
      });

      setStatus({
        type: 'success',
        message: `✓ Issue registered successfully! Issue ID: ${txResult.issueId}`,
      });

      // Clear form
      setTimeout(() => {
        setGithubUrl('');
        setAmount('');
        setValidatedIssue(null);
        setStatus(null);
        setCurrentStep('validate');
        onClose();
      }, 3000);

    } catch (error: any) {
      console.error('Registration error:', error);

      if (error.message?.includes('Cancelled')) {
        setStatus({
          type: 'warning',
          message: 'Transaction cancelled by user.',
        });
      } else {
        setStatus({
          type: 'error',
          message: error.response?.data?.message || error.message || 'Transaction failed.',
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
    setValidatedIssue(null);
    setCurrentStep('validate');
    onClose();
  };

  // Go back to validation step
  const handleBackToValidation = () => {
    setCurrentStep('validate');
    setAmount('');
    setStatus(null);
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
          Place a TAO bounty on your GitHub issue to attract miner attention. Your TAO is automatically
          converted to ALPHA and staked in the bounty pool. When your issue is solved, the solver receives
          the ALPHA tokens directly. No pre-staking required - just send TAO with your bounty registration.
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

            {/* Step 1: Validate Issue */}
            {currentStep === 'validate' && (
              <Box>
                <TextField
                  fullWidth
                  type="url"
                  label="GitHub Issue URL"
                  placeholder="https://github.com/user/repo/issues/123"
                  value={githubUrl}
                  onChange={(e) => {
                    setGithubUrl(e.target.value);
                    setValidatedIssue(null);
                  }}
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

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleValidateIssue}
                  disabled={loading || !githubUrl.trim()}
                  sx={{
                    p: 1.5,
                    fontSize: 16,
                    textTransform: 'none',
                    borderRadius: 2,
                    fontWeight: 600,
                  }}
                >
                  {loading ? 'Validating...' : 'Validate & Continue'}
                </Button>

                {renderStatus()}
              </Box>
            )}

            {/* Step 2: Payment */}
            {currentStep === 'payment' && validatedIssue && (
              <Box>
                {/* Display validated issue */}
                <Box sx={{ mb: 3, p: 2, backgroundColor: 'rgba(76, 175, 80, 0.1)', border: '1px solid rgba(76, 175, 80, 0.3)', borderRadius: 2 }}>
                  <Typography variant="body2" color="success.main" fontWeight={600} sx={{ mb: 1 }}>
                    ✓ Validated Issue
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                    {validatedIssue.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, wordBreak: 'break-all' }}>
                    {githubUrl}
                  </Typography>
                  <Button
                    size="small"
                    onClick={handleBackToValidation}
                    disabled={loading}
                    sx={{ textTransform: 'none', fontSize: 12 }}
                  >
                    Change Issue
                  </Button>
                </Box>

                <TextField
                  fullWidth
                  type="number"
                  label="Bounty Amount (TAO)"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  inputProps={{
                    min: 0,
                    step: 0.01,
                  }}
                  sx={{
                    mb: 1.5,
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

                {/* Gas fee control */}
                <Box sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Transaction Priority
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1, cursor: 'help' }}
                      title="Higher priority = Higher gas limit = Faster processing on congested network. Gas fees are paid in TAO to validators."
                    >
                      ⓘ
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant={gasMultiplier === 1 ? 'contained' : 'outlined'}
                      onClick={() => setGasMultiplier(1)}
                      disabled={loading}
                      sx={{ flex: 1, textTransform: 'none' }}
                    >
                      Normal (1x)
                    </Button>
                    <Button
                      size="small"
                      variant={gasMultiplier === 1.5 ? 'contained' : 'outlined'}
                      onClick={() => setGasMultiplier(1.5)}
                      disabled={loading}
                      sx={{ flex: 1, textTransform: 'none' }}
                    >
                      Fast (1.5x)
                    </Button>
                    <Button
                      size="small"
                      variant={gasMultiplier === 2 ? 'contained' : 'outlined'}
                      onClick={() => setGasMultiplier(2)}
                      disabled={loading}
                      sx={{ flex: 1, textTransform: 'none' }}
                    >
                      Fastest (2x)
                    </Button>
                  </Box>
                </Box>

                {/* Fee breakdown */}
                {parseFloat(amount) > 0 && (
                  <Box sx={{ mb: 2.5, p: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Bounty amount:
                      </Typography>
                      <Typography variant="caption">{parseFloat(amount).toFixed(2)} TAO</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Tx priority tip:
                      </Typography>
                      <Typography variant="caption">{gasMultiplier.toFixed(1)} TAO</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Converted to:
                      </Typography>
                      <Typography variant="caption" color="success.main">ALPHA (auto-staked)</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Payout fee (2%):
                      </Typography>
                      <Typography variant="caption" color="warning.main">Deducted on payout</Typography>
                    </Box>
                  </Box>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handlePayment}
                  disabled={loading || !amount || parseFloat(amount) <= 0}
                  sx={{
                    p: 1.5,
                    fontSize: 16,
                    textTransform: 'none',
                    borderRadius: 2,
                    fontWeight: 600,
                  }}
                >
                  {loading ? 'Processing...' : 'Register Issue on Chain'}
                </Button>

                {renderStatus()}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IssueRegistrationModal;
