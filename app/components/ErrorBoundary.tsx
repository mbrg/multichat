'use client'
import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-900/20 border border-red-400/20 rounded-md">
            <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
              <span>⚠️</span>
              <span>Something went wrong</span>
            </div>
            <div className="text-xs text-[#888]">
              {this.state.error?.message || 'An unexpected error occurred'}
            </div>
            <button
              onClick={() =>
                this.setState({ hasError: false, error: undefined })
              }
              className="mt-3 px-3 py-1 text-xs text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 rounded-md transition-colors"
            >
              Try again
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
