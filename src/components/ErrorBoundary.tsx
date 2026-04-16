import React from 'react';
import ErrorFallback from './ErrorFallback';

interface ErrorBoundaryProps {
  /** 'fullPage' spans the viewport; 'inline' keeps layout chrome visible. */
  variant?: 'fullPage' | 'inline';
  /** When this value changes, the boundary resets — pass location.pathname for per-route boundaries. */
  resetKey?: string;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // TODO: forward to Sentry / Datadog when telemetry is wired up.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleReset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          variant={this.props.variant ?? 'inline'}
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
