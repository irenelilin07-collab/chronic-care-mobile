import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const SLIDE_ENTER_MS = 350;
export const SLIDE_EXIT_MS = 280;
export const SLIDE_ENTER_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
export const SLIDE_EXIT_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** @deprecated use SLIDE_ENTER_MS */
export const SLIDE_PANEL_MS = SLIDE_ENTER_MS;

export default function SlideOverPanel({
  open,
  onClose,
  title,
  children,
  footer,
  variant = "overlay",
}) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const openRef = useRef(open);
  const panelRef = useRef(null);
  const isPush = variant === "push";

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useLayoutEffect(() => {
    if (!open && mounted) {
      setActive(false);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setActive(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    const fallback = window.setTimeout(() => {
      if (!openRef.current) setMounted(false);
    }, SLIDE_EXIT_MS + 100);
    return () => window.clearTimeout(fallback);
  }, [open]);

  useEffect(() => {
    if (!mounted) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  function handlePanelTransitionEnd(event) {
    if (event.target !== panelRef.current || event.propertyName !== "transform") return;
    if (!openRef.current) setMounted(false);
  }

  if (!mounted) return null;

  const durationMs = active ? SLIDE_ENTER_MS : SLIDE_EXIT_MS;
  const easing = active ? SLIDE_ENTER_EASE : SLIDE_EXIT_EASE;

  return (
    <div className="fixed inset-0 z-30 overflow-hidden">
      {!isPush ? (
        <button
          type="button"
          aria-label="关闭"
          onClick={onClose}
          className="absolute inset-0 bg-black/20 transition-opacity ease-out"
          style={{
            opacity: active ? 1 : 0,
            transitionDuration: `${durationMs}ms`,
          }}
        />
      ) : null}
      <div className="pointer-events-none mx-auto h-full w-full max-w-md">
        <div
          ref={panelRef}
          onTransitionEnd={handlePanelTransitionEnd}
          className={`flex h-full w-full flex-col bg-[#f5f6f8] [backface-visibility:hidden] ${
            isPush ? "shadow-[-6px_0_20px_rgba(0,0,0,0.1)]" : "shadow-[-8px_0_24px_rgba(0,0,0,0.08)]"
          } ${active ? "pointer-events-auto" : "pointer-events-none"}`}
          style={{
            transform: active ? "translate3d(0, 0, 0)" : "translate3d(100%, 0, 0)",
            transitionProperty: "transform",
            transitionDuration: `${durationMs}ms`,
            transitionTimingFunction: easing,
            willChange: "transform",
          }}
        >
          <header className="sticky top-0 z-10 flex shrink-0 items-center gap-3 bg-[#f5f6f8] px-4 pb-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#666] shadow-sm active:scale-95"
              aria-label="返回"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M14 6 8 12l6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-[#1a1a1a]">{title}</h2>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-1">{children}</main>
          {footer ? <div className="shrink-0">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
