"use client";

import { useState, useEffect, useCallback } from "react";
import { X, AlertCircle, CheckCircle } from "lucide-react";

interface ErrorInfo {
  id: string;
  type: 'runtime' | 'build' | 'unhandled';
  message: string;
  stack?: string;
  timestamp: Date;
}

export function DebugBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [buildTime, setBuildTime] = useState<string>("N/A");
  const [renderTime, setRenderTime] = useState<string>("N/A");
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [buildStatus, setBuildStatus] = useState<'building' | 'success' | 'error'>('success');

  const addError = useCallback((error: Omit<ErrorInfo, 'id' | 'timestamp'>) => {
    setErrors(prev => [...prev, {
      ...error,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    }]);
    setShowErrors(true);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
    setShowErrors(false);
  }, []);

  useEffect(() => {
    // Calculate render time
    const startTime = performance.now();
    setRenderTime(`${(performance.now() - startTime).toFixed(2)}ms`);

    // Get build time from Next.js build ID or use current time as fallback
    const buildId = process.env.NEXT_PUBLIC_BUILD_ID || Date.now().toString();
    setBuildTime(new Date(parseInt(buildId)).toLocaleString());

    // Listen for runtime errors
    const handleError = (event: ErrorEvent) => {
      // Filter out Next.js internal errors
      if (event.filename?.includes('next-devtools') || 
          event.filename?.includes('webpack') ||
          event.filename?.includes('hot-reloader') ||
          event.message?.includes('ResizeObserver') ||
          event.message?.includes('Non-Error promise rejection captured')) {
        return;
      }
      
      addError({
        type: 'runtime',
        message: event.message,
        stack: event.error?.stack
      });
    };

    // Listen for unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      // Filter out common non-critical rejections
      const reason = event.reason?.message || String(event.reason);
      if (reason.includes('ResizeObserver') || 
          reason.includes('Non-Error promise rejection') ||
          reason.includes('next-devtools')) {
        return;
      }
      
      addError({
        type: 'unhandled',
        message: reason,
        stack: event.reason?.stack
      });
    };

    // Listen for Next.js specific errors via custom events
    const handleNextError = (event: CustomEvent) => {
      addError({
        type: 'build',
        message: event.detail?.message || 'Build error',
        stack: event.detail?.stack
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('next-error', handleNextError as EventListener);

    // Monitor webpack HMR status
    if (typeof window !== 'undefined' && (window as any).__webpack_hot_middleware_reporter__) {
      const reporter = (window as any).__webpack_hot_middleware_reporter__;
      const originalReporter = reporter.onBuildError;
      
      reporter.onBuildError = (err: any) => {
        setBuildStatus('error');
        addError({
          type: 'build',
          message: err.message || 'Build error',
          stack: err.stack
        });
        originalReporter?.(err);
      };

      const originalSuccess = reporter.onBuildOk;
      reporter.onBuildOk = () => {
        setBuildStatus('success');
        originalSuccess?.();
      };
    }

    // Hide Next.js indicator with a more aggressive approach
    const hideNextIndicator = () => {
      const style = document.createElement('style');
      style.innerHTML = `
        nextjs-portal,
        #__next-build-indicator,
        [class*="nextjs-"],
        [id*="nextjs-"],
        div[style*="position: fixed"][style*="z-index: 99999"],
        div[style*="position:fixed"][style*="z-index:99999"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);

      // Also try to remove the element directly
      const indicators = document.querySelectorAll('nextjs-portal, [class*="nextjs-"], [id*="nextjs-"]');
      indicators.forEach(el => el.remove());
    };

    // Run immediately and after a delay to catch late-loading indicators
    hideNextIndicator();
    setTimeout(hideNextIndicator, 100);
    setTimeout(hideNextIndicator, 500);
    setTimeout(hideNextIndicator, 1000);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('next-error', handleNextError as EventListener);
    };
  }, [addError]);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <>
      {/* Debug Bubble */}
      <div
        id="crunchycone-debug-bubble"
        className="fixed bottom-4 left-4 z-[999999] flex h-12 w-12 items-center justify-center rounded-full bg-black/90 text-2xl shadow-lg ring-1 ring-white/10 transition-all hover:scale-110 hover:bg-black dark:bg-white/90 dark:ring-black/10 dark:hover:bg-white cursor-pointer select-none"
        onClick={() => setIsOpen(true)}
        role="button"
        aria-label="Open debug panel"
        style={{ zIndex: 999999 }}
      >
        <span className="animate-pulse-3">🍨</span>
        {errors.length > 0 && (
          <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {errors.length}
          </div>
        )}
        {buildStatus === 'building' && (
          <div className="absolute inset-0 rounded-full border-2 border-yellow-500 animate-pulse" />
        )}
      </div>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed bottom-20 left-4 z-[999998] w-80 rounded-lg bg-black/90 p-4 text-white shadow-2xl ring-1 ring-white/10 dark:bg-white/90 dark:text-black dark:ring-black/10"
          style={{ zIndex: 999998 }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">CrunchyCone Debug</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 hover:bg-white/10 dark:hover:bg-black/10"
              aria-label="Close debug panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="mb-3 flex gap-2 border-b border-white/10 dark:border-black/10">
            <button
              onClick={() => setShowErrors(false)}
              className={`pb-2 px-1 text-xs font-medium transition-colors ${
                !showErrors 
                  ? 'text-white dark:text-black border-b-2 border-white dark:border-black' 
                  : 'text-white/60 dark:text-black/60 hover:text-white/80 dark:hover:text-black/80'
              }`}
            >
              Info
            </button>
            <button
              onClick={() => setShowErrors(true)}
              className={`pb-2 px-1 text-xs font-medium transition-colors flex items-center gap-1 ${
                showErrors 
                  ? 'text-white dark:text-black border-b-2 border-white dark:border-black' 
                  : 'text-white/60 dark:text-black/60 hover:text-white/80 dark:hover:text-black/80'
              }`}
            >
              Errors
              {errors.length > 0 && (
                <span className="px-1 rounded bg-red-500 text-white text-[10px]">
                  {errors.length}
                </span>
              )}
            </button>
          </div>
          
          <div className="space-y-2 text-xs">
            {!showErrors ? (
              <>
                <div className="flex justify-between">
                  <span className="text-white/70 dark:text-black/70">Environment:</span>
                  <span className="font-mono">{process.env.NODE_ENV}</span>
                </div>
                <div className="flex justify-between">
              <span className="text-white/70 dark:text-black/70">Next.js Version:</span>
              <span className="font-mono">{process.env.NEXT_RUNTIME || "15.x"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70 dark:text-black/70">Render Time:</span>
              <span className="font-mono">{renderTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70 dark:text-black/70">Build Time:</span>
              <span className="font-mono text-[10px]">{buildTime}</span>
            </div>
              <div className="flex justify-between">
                <span className="text-white/70 dark:text-black/70">Build Status:</span>
                <span className="flex items-center gap-1">
                  {buildStatus === 'success' && <CheckCircle className="h-3 w-3 text-green-500" />}
                  {buildStatus === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
                  {buildStatus === 'building' && <div className="h-3 w-3 rounded-full border-2 border-yellow-500 animate-pulse" />}
                  <span className="font-mono capitalize">{buildStatus}</span>
                </span>
              </div>
              <div className="mt-3 border-t border-white/10 pt-3 dark:border-black/10">
                <div className="flex justify-between">
                  <span className="text-white/70 dark:text-black/70">Powered by:</span>
                  <span className="font-mono">CrunchyCone 🍨</span>
                </div>
              </div>
              </>
            ) : (
              /* Errors Tab */
              <>
                {errors.length === 0 ? (
                  <div className="py-8 text-center text-white/60 dark:text-black/60">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p>No errors detected</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white/70 dark:text-black/70">Errors ({errors.length})</span>
                      <button
                        onClick={clearErrors}
                        className="text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {errors.map((error) => (
                        <div
                          key={error.id}
                          className="p-2 rounded bg-red-500/10 border border-red-500/20"
                        >
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-red-500 text-[11px] uppercase">
                                {error.type}
                              </div>
                              <div className="mt-1 text-white dark:text-black break-words">
                                {error.message}
                              </div>
                              {error.stack && (
                                <details className="mt-1">
                                  <summary className="cursor-pointer text-[10px] text-white/60 dark:text-black/60 hover:text-white/80 dark:hover:text-black/80">
                                    Stack trace
                                  </summary>
                                  <pre className="mt-1 text-[10px] overflow-x-auto text-white/80 dark:text-black/80">
                                    {error.stack}
                                  </pre>
                                </details>
                              )}
                              <div className="mt-1 text-[10px] text-white/50 dark:text-black/50">
                                {error.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}