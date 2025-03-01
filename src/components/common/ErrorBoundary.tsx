import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-8">
          <div className="text-red-500 dark:text-red-400 mb-2">
            Something went wrong. Please try refreshing the page.
          </div>
          <button
            onClick={() => window.location.reload()}
            className="opacity-75 hover:opacity-100"
          >
            [REFRESH]
          </button>
        </div>
      );
    }

    return this.props.children;
  }
} 