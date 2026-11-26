/** Focusable controls inside a modal dialog (aligned with AuthDemoModal). */
export const MODAL_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type AttachModalFocusOptions = {
  getRoot: () => HTMLElement | null;
  /** Escape handler; omit or return early inside when Escape must be ignored. */
  onEscape?: () => void;
  /** Element to focus when the trap attaches; defaults to the first focusable. */
  initialFocus?: HTMLElement | null;
};

/**
 * Focus trap + Escape + body scroll lock + restore previous focus on cleanup.
 * Mirrors AuthDemoModal keyboard behavior for reuse in LoginGateModal.
 */
export function attachModalFocusTrap({
  getRoot,
  onEscape,
  initialFocus,
}: AttachModalFocusOptions): () => void {
  const previous = document.activeElement as HTMLElement | null;
  document.body.style.overflow = "hidden";

  const trapTab = (event: KeyboardEvent) => {
    const root = getRoot();
    if (!root) return;
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE_SELECTOR),
    );
    if (focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey && (active === first || !root.contains(active))) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (
      !event.shiftKey &&
      (!active || !root.contains(active) || active === last)
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onEscape?.();
      return;
    }
    if (event.key === "Tab") {
      trapTab(event);
    }
  };

  const focusTarget =
    initialFocus ??
    getRoot()?.querySelector<HTMLElement>(MODAL_FOCUSABLE_SELECTOR) ??
    null;
  focusTarget?.focus();

  window.addEventListener("keydown", onKeyDown);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    document.body.style.overflow = "";
    previous?.focus?.();
  };
}
