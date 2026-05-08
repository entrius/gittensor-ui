import { useEffect, useRef } from 'react';

interface UseTwitterStickySidebarOptions {
  topOffset?: number;
  bottomOffset?: number;
}

export const useTwitterStickySidebar = ({
  topOffset = 88,
  bottomOffset = 24,
}: UseTwitterStickySidebarOptions = {}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const currentTop = useRef(topOffset);

  useEffect(() => {
    const scrollContainer = document.querySelector('main') || window;

    const handleScroll = () => {
      if (!sidebarRef.current) return;

      const currentScrollY =
        scrollContainer === window
          ? window.scrollY
          : (scrollContainer as HTMLElement).scrollTop;

      const dy = currentScrollY - lastScrollY.current;
      lastScrollY.current = currentScrollY;

      const H = sidebarRef.current.offsetHeight;
      const V =
        scrollContainer === window
          ? window.innerHeight
          : (scrollContainer as HTMLElement).clientHeight;

      // If sidebar is shorter than the viewport minus offsets, just stick to top
      if (H <= V - topOffset - bottomOffset) {
        currentTop.current = topOffset;
      } else {
        const minTop = V - H - bottomOffset;
        const maxTop = topOffset;
        currentTop.current = Math.max(
          minTop,
          Math.min(maxTop, currentTop.current - dy),
        );
      }

      sidebarRef.current.style.top = `${currentTop.current}px`;
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    // Also handle window resize and sidebar height changes
    window.addEventListener('resize', handleScroll);

    let resizeObserver: ResizeObserver | null = null;
    if (sidebarRef.current) {
      resizeObserver = new ResizeObserver(() => handleScroll());
      resizeObserver.observe(sidebarRef.current);
    }

    // Initial calculation
    handleScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      resizeObserver?.disconnect();
    };
  }, [topOffset, bottomOffset]);

  return sidebarRef;
};
