import { useState, useEffect, useRef } from "react";

export function useHasNotChanged(value, n, onStaleValueDetected, skipIfTrue) {
  const [isStale, setIsStale] = useState(false);
  const previousValueRef = useRef(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (previousValueRef.current === "" || skipIfTrue) return;

      if (previousValueRef.current === value) {
        setIsStale(true);
        onStaleValueDetected();
      }
    }, n * 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [value, n]);

  useEffect(() => {
    previousValueRef.current = value;
    setIsStale(false);
  }, [value]);

  return isStale;
}
