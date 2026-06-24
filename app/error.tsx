"use client";
import { useEffect } from "react";

/**
 * App-level error boundary. Stale chunk references after a new deploy throw
 * ChunkLoadError — auto-reload once to pull the fresh build. Anything else
 * shows a recoverable screen instead of a raw "client-side exception".
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isChunkError =
    /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|importing a module script failed/i.test(
      error?.message ?? ""
    ) || error?.name === "ChunkLoadError";

  useEffect(() => {
    if (!isChunkError) return;
    // Reload once (guarded by a session flag) to fetch the new chunks.
    const KEY = "chunk_reload_once";
    if (!sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, "1");
      window.location.reload();
    }
  }, [isChunkError]);

  if (isChunkError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6 text-center text-text-secondary">
        <p className="text-sm">Updating to the latest version…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="text-4xl mb-3">😕</div>
        <h1 className="text-lg font-semibold text-text-primary mb-1">Something went wrong</h1>
        <p className="text-sm text-text-muted mb-4">An unexpected error occurred. Try again, or reload the page.</p>
        {(error?.message || error?.digest) && (
          <pre className="text-left text-[11px] text-red-300/90 bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-5 overflow-x-auto whitespace-pre-wrap break-words">
            {error.message || ""}{error.digest ? `\n\n[digest: ${error.digest}]` : ""}
          </pre>
        )}
        <div className="flex gap-2 justify-center">
          <button onClick={reset} className="text-sm font-medium text-white bg-gradient-to-r from-accent-pink to-accent-purple rounded-lg px-5 py-2.5">
            Try again
          </button>
          <button onClick={() => window.location.reload()} className="text-sm font-medium text-text-secondary border border-border rounded-lg px-5 py-2.5 hover:text-text-primary">
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
