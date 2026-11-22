import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let displayMessage = error.message || '요청을 처리하는 중 문제가 발생했습니다.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string };
      if (parsed && parsed.error) {
        displayMessage = `데이터 처리 오류 (${parsed.operationType || 'unknown'}): ${parsed.error}`;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message: displayMessage };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060911] text-slate-100 flex items-center justify-center px-6">
          <div className="max-w-md w-full border border-white/10 bg-[#0B101B] p-8 space-y-4">
            <p className="en-label text-blue-300/80">NOTICE</p>
            <h1 className="text-lg font-medium text-white">화면 표시 중 오류가 발생했습니다</h1>
            <p className="text-sm text-slate-400 leading-relaxed break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-medium border border-blue-300/40 text-blue-200 hover:bg-blue-400/10 transition-colors cursor-pointer"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
