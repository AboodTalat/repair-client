"use client";

import { useEffect, useState } from "react";

/**
 * Keep a dialog mounted while its close animation plays.
 *
 * `open` toggles in the parent; this holds `render` true through the exit
 * window so the CSS keyframes (`.right-drawer` / `.bottom-card` /
 * `.drawer-backdrop` in globals.css) can run before the node disappears.
 *
 *   const { render, dataState } = useDelayedUnmount(open, 320);
 *   if (!render) return null;
 *   <aside data-state={dataState}>   // "open" | "closing"
 *
 * ── Why this shape ──────────────────────────────────────────────────────────
 * This used to be copy-pasted into 13 components, every copy driving the
 * open/closing transition from inside a `useEffect`:
 *
 *   useEffect(() => {
 *     if (open) { setRender(true); setClosing(false); return undefined; }
 *     …
 *   }, [open, render, exitMs]);
 *
 * That is a synchronous setState in an effect body (`react-hooks/
 * set-state-in-effect`, 13 identical errors), and it costs a frame: on open,
 * React rendered once with `render` still false — returning null — and only
 * showed the dialog on the following pass.
 *
 * Opening and starting to close are DERIVED FROM `open`, not side effects, so
 * they belong in the render phase. Updating state during render in response to
 * a changed prop is a documented React pattern ("You Might Not Need an
 * Effect" → adjusting state when a prop changes): React re-runs the component
 * immediately, before touching the DOM, so no extra frame is painted.
 *
 * The effect that remains does the one genuinely time-based thing — waiting
 * `exitMs` before unmounting — and it sets state from a timer callback, which
 * is exactly the usage the lint rule permits.
 */
export default function useDelayedUnmount(open, exitMs) {
  const [phase, setPhase] = useState(open ? "open" : "closed");
  const [prevOpen, setPrevOpen] = useState(open);

  // Render-phase adjustment. Guarded on an actual change, so this cannot loop.
  if (open !== prevOpen) {
    setPrevOpen(open);
    // Re-opening mid-exit lands back on "open" and the effect below clears the
    // pending unmount timer, so a fast close→open never blanks the dialog.
    setPhase(open ? "open" : "closing");
  }

  useEffect(() => {
    if (phase !== "closing") return undefined;
    const t = setTimeout(() => setPhase("closed"), exitMs);
    return () => clearTimeout(t);
  }, [phase, exitMs]);

  return {
    render: phase !== "closed",
    dataState: phase === "closing" ? "closing" : "open",
  };
}
