import { Component } from 'react';
const haveResetKeysChanged = (prevKeys = [], nextKeys = []) => prevKeys.length !== nextKeys.length || prevKeys.some((value, index) => !Object.is(value, nextKeys[index]));
export class ErrorBoundary extends Component {
    state = {
        error: null
    };
    static getDerivedStateFromError(error) {
        return { error };
    }
    componentDidCatch(error, info) {
        this.props.onError?.(error, info);
    }
    componentDidUpdate(prevProps) {
        if (!this.state.error) {
            return;
        }
        if (haveResetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
            this.setState({ error: null });
        }
    }
    reset = () => {
        this.setState({ error: null });
    };
    render() {
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
