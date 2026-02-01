import { useCallback, useState } from 'react';

interface Dimensions {
    width: number;
    height: number;
}

/**
 * A hook that uses a callback ref to observe element dimensions.
 * Returns [callbackRef, dimensions] where callbackRef should be passed to the element's ref prop.
 */
export const useResizeObserver = (): [
    (node: HTMLElement | null) => void,
    Dimensions
] => {
    const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
    const [observer, setObserver] = useState<ResizeObserver | null>(null);
    const [observedNode, setObservedNode] = useState<HTMLElement | null>(null);

    const callbackRef = useCallback((node: HTMLElement | null) => {
        // Disconnect from previous node if any
        if (observer && observedNode) {
            observer.disconnect();
        }

        if (node) {
            // Initial measurement
            const rect = node.getBoundingClientRect();
            setDimensions({ width: rect.width, height: rect.height });

            // Create new observer
            const newObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;
                    setDimensions({ width, height });
                }
            });

            newObserver.observe(node);
            setObserver(newObserver);
            setObservedNode(node);
        } else {
            setDimensions({ width: 0, height: 0 });
            setObserver(null);
            setObservedNode(null);
        }
    }, []); // Empty deps - we manage updates manually

    return [callbackRef, dimensions];
};
