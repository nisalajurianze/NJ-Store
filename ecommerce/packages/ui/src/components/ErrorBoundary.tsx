import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryFallbackRender = (params: {
  error: Error;
  reset: () => void;
}) => ReactNode;

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode | ErrorBoundaryFallbackRender;
  resetKeys?: unknown[];
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const haveResetKeysChanged = (prevKeys: unknown[] = [], nextKeys: unknown[] = []): boolean =>
  prevKeys.length !== nextKeys.length || prevKeys.some((value, index) => !Object.is(value, nextKeys[index]));

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (!this.state.error) {
      return;
    }

    if (haveResetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.setState({ error: null });
    }
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    if (typeof this.props.fallback === 'function') {
      return this.props.fallback({
        error: this.state.error,
        reset: this.reset
      });
    }

    return this.props.fallback;
  }
}
