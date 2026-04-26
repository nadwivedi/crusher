import { useEffect, useState } from 'react';

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

      const viewportPadding = 12;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const availableHeight = Math.max(120, spaceBelow - 4);

      setStyle({
        left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - rect.width - viewportPadding)),
        width: rect.width,
        top: rect.bottom + 6,
        bottom: 'auto',
        maxHeight: availableHeight
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, isOpen, preferredDirection, heightMode, ...dependencyValues]);

  return style;
};
