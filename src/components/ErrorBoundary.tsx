'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    console.error('[ErrorBoundary] getDerivedStateFromError:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] componentDidCatch:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
    });
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-8">
          <div className="bg-slate-800 border border-red-500 rounded-xl p-6 max-w-2xl">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Application Error</h1>
            <div className="text-white mb-4">
              <strong>Error:</strong> {this.state.error?.message}
            </div>
            <div className="text-white mb-4">
              <strong>Stack:</strong>
              <pre className="text-xs bg-black/40 p-3 rounded mt-2 overflow-auto max-h-64">
                {this.state.error?.stack}
              </pre>
            </div>
            {this.state.errorInfo && (
              <div className="text-white">
                <strong>Component Stack:</strong>
                <pre className="text-xs bg-black/40 p-3 rounded mt-2 overflow-auto max-h-64">
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
