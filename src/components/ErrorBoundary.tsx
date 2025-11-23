'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

// Neo-pop styling constants
const NEO_BORDER = '2px solid #000';
const NEO_SHADOW = '6px 6px 0 #000';
const NEO_SHADOW_SM = '4px 4px 0 #000';
const COLORS = {
  lavender: '#DCC4F5',
  mint: '#B8E6D4',
  pink: '#FFBDBD',
  cream: '#FFF8F0',
};

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
        <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: COLORS.cream }}>
          <div
            className="rounded-2xl p-6 max-w-2xl"
            style={{ backgroundColor: 'white', border: NEO_BORDER, boxShadow: NEO_SHADOW }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="p-3 rounded-xl"
                style={{ backgroundColor: COLORS.pink, border: NEO_BORDER }}
              >
                <AlertTriangle size={24} className="text-gray-900" />
              </div>
              <h1 className="text-2xl font-black text-gray-900">Application Error</h1>
            </div>

            {/* Error Message */}
            <div
              className="mb-4 p-4 rounded-xl"
              style={{ backgroundColor: COLORS.cream, border: NEO_BORDER }}
            >
              <strong className="text-gray-900 font-bold">Error:</strong>
              <span className="ml-2 text-gray-700">{this.state.error?.message}</span>
            </div>

            {/* Stack Trace */}
            <div className="mb-4">
              <strong className="text-gray-900 font-bold">Stack:</strong>
              <pre
                className="text-xs p-3 rounded-xl mt-2 overflow-auto max-h-64 text-gray-700"
                style={{ backgroundColor: '#F3F4F6', border: '1px solid #000' }}
              >
                {this.state.error?.stack}
              </pre>
            </div>

            {/* Component Stack */}
            {this.state.errorInfo && (
              <div className="mb-4">
                <strong className="text-gray-900 font-bold">Component Stack:</strong>
                <pre
                  className="text-xs p-3 rounded-xl mt-2 overflow-auto max-h-64 text-gray-700"
                  style={{ backgroundColor: '#F3F4F6', border: '1px solid #000' }}
                >
                  {this.state.errorInfo.componentStack}
                </pre>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5 flex items-center gap-2"
                style={{ backgroundColor: COLORS.pink, border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
              >
                <RotateCcw size={16} />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl font-bold text-gray-900 transition hover:-translate-y-0.5 flex items-center gap-2"
                style={{ backgroundColor: COLORS.lavender, border: NEO_BORDER, boxShadow: NEO_SHADOW_SM }}
              >
                <RefreshCw size={16} />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
