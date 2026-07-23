import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  // @ts-ignore
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React error:', error, errorInfo);
  }

  public render() {
    // @ts-ignore
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-[#051650]">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-3xl p-8 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto font-black text-xl">
              !
            </div>
            <h1 className="text-xl font-black uppercase tracking-tight text-red-600">Application Error</h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Something went wrong while rendering the application.
            </p>
            {/* @ts-ignore */}
            {this.state.error?.message && (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-left text-[11px] font-mono text-slate-700 overflow-x-auto">
                {/* @ts-ignore */}
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#051650] text-white py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#0A2472] transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    // @ts-ignore
    return this.props.children;
  }
}






