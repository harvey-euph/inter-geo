import React, { useRef, useState, useEffect } from 'react';
import { GripHorizontal, RotateCcw, X } from 'lucide-react';

export interface FloatingWindowProps {
  /** Title text shown in the top drag bar */
  title: string;
  /** Leading icon displayed before title */
  icon?: React.ReactNode;
  /** Whether the window is currently visible */
  isExpanded: boolean;
  /** Callback fired when clicking the top-right close button (X) */
  onCollapse: () => void;
  /** Dynamic stacking z-index */
  zIndex?: number;
  /** Whether this window is currently the frontmost focused window */
  isFront?: boolean;
  /** Callback fired whenever the window is clicked or dragged to bring it to front */
  onFocusWindow?: () => void;
  /** Whether the reset button should be shown in the top bar */
  hasActiveReset?: boolean;
  /** Callback fired when clicking the reset button */
  onReset?: () => void;
  /** Label for the reset button (defaults to 'Reset') */
  resetLabel?: string;
  /** Custom tooltip for the reset button */
  resetTitle?: string;
  /** Additional CSS class names on the outer container */
  className?: string;
  /** Additional CSS class names on the draggable top bar */
  topBarClassName?: string;
  /** Extra actions/controls rendered in the top bar before reset/close buttons */
  headerActions?: React.ReactNode;
  /** Default initial coordinates if not yet dragged */
  defaultPosition?: { x: number; y: number };
  /** Content rendered inside the window body */
  children: React.ReactNode;
}

/**
 * FloatingWindow: Reusable desktop-like floating window component.
 *
 * Encapsulates:
 * - Pointer drag movement with pointer capture
 * - Viewport boundary collision and clamping
 * - Window focus / stacking z-index awareness
 * - Symmetrical top bar with drag grip, title, reset, and close actions
 * - Composition-based children rendering
 */
export const FloatingWindow: React.FC<FloatingWindowProps> = React.memo(({
  title,
  icon,
  isExpanded,
  onCollapse,
  zIndex,
  isFront,
  onFocusWindow,
  hasActiveReset = false,
  onReset,
  resetLabel = 'Reset',
  resetTitle = '重設 (Reset)',
  className = '',
  topBarClassName = '',
  headerActions,
  defaultPosition,
  children
}) => {
  const windowRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(defaultPosition ?? null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    parentWidth: number;
    parentHeight: number;
    windowWidth: number;
    windowHeight: number;
  } | null>(null);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    onFocusWindow?.();

    // Only primary mouse button or touch
    if (e.button !== 0) return;

    // Do not initiate drag if clicking on interactive elements
    const target = e.target as HTMLElement | null;
    if (target?.closest('input') || target?.closest('button') || target?.closest('a')) {
      return;
    }

    if (!windowRef.current) return;
    const rect = windowRef.current.getBoundingClientRect();
    const parent = windowRef.current.offsetParent as HTMLElement | null;
    const parentRect = parent
      ? parent.getBoundingClientRect()
      : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

    dragStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left - parentRect.left,
      initialY: rect.top - parentRect.top,
      parentWidth: parentRect.width,
      parentHeight: parentRect.height,
      windowWidth: rect.width,
      windowHeight: rect.height
    };

    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ds = dragStartRef.current;
    if (!ds || ds.pointerId !== e.pointerId) return;

    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;

    const minX = 8;
    const maxX = Math.max(minX, ds.parentWidth - ds.windowWidth - 8);
    const minY = 8;
    const maxY = Math.max(minY, ds.parentHeight - ds.windowHeight - 8);

    const newX = Math.min(Math.max(ds.initialX + dx, minX), maxX);
    const newY = Math.min(Math.max(ds.initialY + dy, minY), maxY);

    setPosition({ x: Math.round(newX), y: Math.round(newY) });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const ds = dragStartRef.current;
    if (!ds || ds.pointerId !== e.pointerId) return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    dragStartRef.current = null;
    setIsDragging(false);
  };

  // Keep window clamped within view if viewport resizes
  useEffect(() => {
    if (!position || !windowRef.current) return;
    const handleResize = () => {
      if (!windowRef.current) return;
      const parent = windowRef.current.offsetParent as HTMLElement | null;
      if (!parent) return;
      const rect = windowRef.current.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();

      setPosition((prev) => {
        if (!prev) return null;
        const minX = 8;
        const maxX = Math.max(minX, parentRect.width - rect.width - 8);
        const minY = 8;
        const maxY = Math.max(minY, parentRect.height - rect.height - 8);
        const clampedX = Math.min(Math.max(prev.x, minX), maxX);
        const clampedY = Math.min(Math.max(prev.y, minY), maxY);
        if (clampedX === prev.x && clampedY === prev.y) return prev;
        return { x: clampedX, y: clampedY };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  if (!isExpanded) return null;

  return (
    <div
      ref={windowRef}
      className={`filter-selector-window ${position ? 'is-dragged' : ''} ${isDragging ? 'is-dragging' : ''} ${isFront ? 'is-focused-front' : ''} ${className}`}
      style={{
        ...(position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'none'
            }
          : {}),
        ...(zIndex ? { zIndex } : {})
      }}
      onPointerDownCapture={onFocusWindow}
      onMouseDownCapture={onFocusWindow}
      role="dialog"
      aria-label={title}
    >
      {/* Draggable Top Bar */}
      <div
        className={`fsw-top-bar ${topBarClassName}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <GripHorizontal size={14} className="fsw-drag-grip" />
        <div className="fsw-window-title">
          {icon}
          <span>{title}</span>
        </div>

        {headerActions}

        {hasActiveReset && onReset && (
          <button
            type="button"
            className="fsw-reset-btn"
            onClick={onReset}
            title={resetTitle}
          >
            <RotateCcw size={12} />
            <span>{resetLabel}</span>
          </button>
        )}

        <button
          type="button"
          className="fsw-close-btn"
          onClick={onCollapse}
          title={`關閉視窗 (Esc)`}
          aria-label={`關閉 ${title}`}
        >
          <X size={14} />
        </button>
      </div>

      {/* Window Body Content */}
      {children}
    </div>
  );
});
