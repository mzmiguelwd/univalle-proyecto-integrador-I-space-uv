import { useEffect, useRef } from "react";

type FocusTrapProps = {
  children: React.ReactNode;
  isActive: boolean;
  onEscape?: () => void;
};

const focusableSelector =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function FocusTrap({
  children,
  isActive,
  onEscape,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const previousFocusedElement = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    const focusableElements = Array.from(
      container.querySelectorAll<HTMLElement>(focusableSelector),
    ).filter((element) => !element.hasAttribute("disabled"));

    focusableElements[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscape?.();
        return;
      }

      if (event.key !== "Tab") return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusedElement?.focus();
    };
  }, [isActive, onEscape]);

  return <div ref={containerRef}>{children}</div>;
}