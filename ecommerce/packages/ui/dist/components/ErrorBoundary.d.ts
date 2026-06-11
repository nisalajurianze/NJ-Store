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
export declare class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState;
    static getDerivedStateFromError(error: Error): ErrorBoundaryState;
    componentDidCatch(error: Error, info: ErrorInfo): void;
    componentDidUpdate(prevProps: ErrorBoundaryProps): void;
    private readonly reset;
    render(): ReactNode;
}
export {};
