import { useEffect, useState } from 'react';

// A 'compact' list is at most this tall, so it reads as a dropdown and not a panel filling the popup
const COMPACT_MAX_HEIGHT = 280;
// Below this much room under the field, an 'auto' list opens upward when there is more room above
const MIN_ROOM_BELOW = 200;
const GAP = 6;
const VIEWPORT_PADDING = 12;

/**
 * Fixed-position style for a list under (or over) its field.
 * preferredDirection: 'auto' (down, or up when the field is near the bottom of the screen), 'down' or 'up'.
 * heightMode: 'compact' (capped height) or 'viewport' (as tall as the room allows).
 */
export const useFloatingDropdownPosition = (
  anchorRef,
  isOpen,
  dependencyValues = [],
  preferredDirection = 'auto',
  heightMode = 'compact'
) => {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!isOpen || !anchorRef?.current) {
      setStyle(null);
      return undefined;
    }

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_PADDING - GAP;
      const spaceAbove = rect.top - VIEWPORT_PADDING - GAP;
      const openUp = preferredDirection === 'up'
        || (preferredDirection === 'auto' && spaceBelow < MIN_ROOM_BELOW && spaceAbove > spaceBelow);
      const room = Math.max(120, openUp ? spaceAbove : spaceBelow);
      const maxHeight = heightMode === 'viewport' ? room : Math.min(room, COMPACT_MAX_HEIGHT);
      const left = Math.max(VIEWPORT_PADDING, Math.min(rect.left, window.innerWidth - rect.width - VIEWPORT_PADDING));

      const next = openUp
        ? { left, width: rect.width, top: 'auto', bottom: viewportHeight - rect.top + GAP, maxHeight }
        : { left, width: rect.width, top: rect.bottom + GAP, bottom: 'auto', maxHeight };

      // Skip the re-render when nothing moved
      setStyle((current) => (
        current && Object.keys(next).every((key) => current[key] === next[key]) ? current : next
      ));
    };

    updatePosition();
    // Once more after the popup has finished laying out (fonts, an error line, the list itself appearing)
    const frame = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    // The field moves without a scroll when the popup around it grows or shrinks
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
    // so watch the field and the boxes around it, up to the popup itself
    for (let node = anchorRef.current, depth = 0; node && node !== document.body && depth < 8; node = node.parentElement, depth += 1) {
      observer?.observe(node);
      if (getComputedStyle(node).position === 'fixed') break;
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      observer?.disconnect();
    };
  }, [anchorRef, isOpen, preferredDirection, heightMode, ...dependencyValues]);

  return style;
};
