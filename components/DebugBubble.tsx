"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export function DebugBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [buildTime, setBuildTime] = useState<string>("N/A");
  const [renderTime, setRenderTime] = useState<string>("N/A");

  useEffect(() => {
    // Calculate render time
    const startTime = performance.now();
    setRenderTime(`${(performance.now() - startTime).toFixed(2)}ms`);

    // Get build time from Next.js build ID or use current time as fallback
    const buildId = process.env.NEXT_PUBLIC_BUILD_ID || Date.now().toString();
    setBuildTime(new Date(parseInt(buildId)).toLocaleString());

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
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <>
      {/* Debug Bubble */}
      <div
        className="fixed bottom-4 left-4 z-[9999] flex h-12 w-12 items-center justify-center rounded-full bg-black/90 text-2xl shadow-lg ring-1 ring-white/10 transition-all hover:scale-110 hover:bg-black dark:bg-white/90 dark:ring-black/10 dark:hover:bg-white cursor-pointer select-none"
        onClick={() => setIsOpen(true)}
        role="button"
        aria-label="Open debug panel"
      >
        <span className="animate-pulse-3">🍨</span>
      </div>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed bottom-20 left-4 z-[9999] w-80 rounded-lg bg-black/90 p-4 text-white shadow-2xl ring-1 ring-white/10 dark:bg-white/90 dark:text-black dark:ring-black/10">
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
          
          <div className="space-y-2 text-xs">
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
            <div className="mt-3 border-t border-white/10 pt-3 dark:border-black/10">
              <div className="flex justify-between">
                <span className="text-white/70 dark:text-black/70">Powered by:</span>
                <span className="font-mono">CrunchyCone 🍨</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}