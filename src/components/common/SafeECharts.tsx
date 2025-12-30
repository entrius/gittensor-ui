import React, { useEffect, useState, useRef, forwardRef } from "react";
import ReactECharts, { EChartsReactProps } from "echarts-for-react";

/**
 * A wrapper around ReactECharts that prevents the "sensor is undefined" error
 * by ensuring proper mount/unmount lifecycle and container readiness.
 */
const SafeECharts = forwardRef<ReactECharts, EChartsReactProps>(
  (props, ref) => {
    const [isMounted, setIsMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      // Small delay to ensure container has dimensions
      const timer = setTimeout(() => {
        if (containerRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;
          if (clientWidth > 0 && clientHeight > 0) {
            setIsMounted(true);
          }
        }
      }, 50);

      return () => {
        clearTimeout(timer);
        setIsMounted(false);
      };
    }, []);

    return (
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
        {isMounted && (
          <ReactECharts
            ref={ref}
            {...props}
            notMerge={true}
            lazyUpdate={true}
          />
        )}
      </div>
    );
  }
);

SafeECharts.displayName = "SafeECharts";

export default SafeECharts;
