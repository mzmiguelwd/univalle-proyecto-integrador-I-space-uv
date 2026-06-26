import { useEffect, useRef } from "react";

// INTERFACES

interface FocusTrapProps {
  children: React.ReactNode;
  isActive: boolean;
  onEscape?: () => void;
}

// CONSTANTS

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function FocusTrap({
  children,
  isActive,
  onEscape,
}: Readonly<FocusTrapProps>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const previousFocusedElement = document.activeElement as HTMLElement | null;
    const container = containerRef.current;

    const getFocusableElements = () => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hasAttribute("disabled"));
    };

    const initialElements = getFocusableElements();
    if (initialElements.length > 0) {
      initialElements[0].focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscapeRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;

      const currentFocusableElements = getFocusableElements();
      const firstElement = currentFocusableElements[0];
      const lastElement = currentFocusableElements.at(-1);

      if (!firstElement || !lastElement) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusedElement?.focus();
    };
  }, [isActive]);

  return <div ref={containerRef}>{children}</div>;
}
