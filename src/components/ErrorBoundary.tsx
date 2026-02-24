import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: '' }
  }

  componentDidCatch(_error: Error, info: { componentStack: string }): void {
    this.setState({ errorInfo: info.componentStack ?? '' })
  }

  private handleCopy = (): void => {
    const { error, errorInfo } = this.state
    const text = `錯誤：${error?.message ?? ''}\n\n元件堆疊：${errorInfo}`
    void navigator.clipboard.writeText(text)
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback) {
      return this.props.fallback
    }

    const { error, errorInfo } = this.state

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-md shadow-md max-w-xl w-full p-8">
          <h1 className="text-xl font-semibold text-slate-800 mb-2">發生錯誤</h1>
          <p className="text-slate-500 mb-6">應用程式遇到未預期的錯誤。</p>

          <details className="mb-6">
            <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-800 select-none">
              錯誤詳情
            </summary>
            <pre className="mt-3 text-xs bg-slate-50 border border-slate-200 rounded p-3 overflow-auto whitespace-pre-wrap break-words text-slate-700">
              {error?.message}
              {errorInfo ? `\n\n元件堆疊：${errorInfo}` : ''}
            </pre>
          </details>

          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 text-white text-sm rounded-md hover:bg-slate-700 transition-colors"
            >
              重新載入
            </button>
            <button
              onClick={this.handleCopy}
              className="px-4 py-2 border border-slate-300 text-slate-600 text-sm rounded-md hover:bg-slate-50 transition-colors"
            >
              複製錯誤資訊
            </button>
          </div>
        </div>
      </div>
    )
  }
}
