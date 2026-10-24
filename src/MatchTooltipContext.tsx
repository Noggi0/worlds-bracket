import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ActiveTooltip {
  id: string;
  pinned: boolean;
}
interface PointerPosition {
  x: number;
  y: number;
}
interface MatchTooltipState {
  active: ActiveTooltip | null;
  activate: (id: string, pointer?: PointerPosition) => void;
  close: (id: string) => void;
  togglePinned: (id: string) => void;
}
const MatchTooltipContext = createContext<MatchTooltipState | null>(null);

export function MatchTooltipProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveTooltip | null>(null);
  const pointer = useRef<PointerPosition | null>(null);
  const dismissedAt = useRef<PointerPosition | null>(null);
  useEffect(() => {
    const remember = (event: PointerEvent) => {
      // PointerEvent coordinates can be fractional; React mouse events use integer coordinates.
      pointer.current = {
        x: Math.floor(event.clientX),
        y: Math.floor(event.clientY),
      };
    };
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissedAt.current = pointer.current;
        setActive(null);
      }
    };
    window.addEventListener("pointermove", remember);
    window.addEventListener("keydown", dismiss);
    return () => {
      window.removeEventListener("pointermove", remember);
      window.removeEventListener("keydown", dismiss);
    };
  }, []);
  const activate = useCallback((id: string, position?: PointerPosition) => {
    // Removing a tooltip under a stationary pointer can expose another card.
    // Escape must remain effective until the pointer actually moves or focus changes.
    if (
      position &&
      dismissedAt.current?.x === position.x &&
      dismissedAt.current.y === position.y
    )
      return;
    dismissedAt.current = null;
    setActive((previous) =>
      previous?.id === id ? previous : { id, pinned: false },
    );
  }, []);
  // A delayed dismissal from an old card must never close the newly active card.
  const close = useCallback((id: string) => {
    setActive((previous) => (previous?.id === id ? null : previous));
  }, []);
  const togglePinned = useCallback(
    (id: string) =>
      setActive((previous) =>
        previous?.id === id && previous.pinned ? null : { id, pinned: true },
      ),
    [],
  );
  return (
    <MatchTooltipContext.Provider
      value={{ active, activate, close, togglePinned }}
    >
      {children}
    </MatchTooltipContext.Provider>
  );
}

export function useMatchTooltip(): MatchTooltipState {
  const state = useContext(MatchTooltipContext);
  if (!state) throw new Error("MatchCard requires a MatchTooltipProvider");
  return state;
}
