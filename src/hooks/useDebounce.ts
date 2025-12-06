import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook that returns a debounced version of the provided value.
 * The returned value will only update after the specified delay
 * has passed without the input value changing.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that returns a debounced version of a callback function.
 * The callback will only be invoked after the specified delay
 * has passed without being called again.
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Keep the callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook for tracking save status with automatic reset.
 * Returns current status and a function to trigger saves.
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useSaveStatus(resetDelay: number = 2000): {
  status: SaveStatus;
  setStatus: (status: SaveStatus) => void;
  trackSave: <T>(promise: Promise<T>) => Promise<T>;
} {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateStatus = useCallback((newStatus: SaveStatus) => {
    setStatus(newStatus);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Auto-reset to idle after showing saved/error
    if (newStatus === 'saved' || newStatus === 'error') {
      timeoutRef.current = setTimeout(() => {
        setStatus('idle');
      }, resetDelay);
    }
  }, [resetDelay]);

  const trackSave = useCallback(async <T>(promise: Promise<T>): Promise<T> => {
    updateStatus('saving');
    try {
      const result = await promise;
      updateStatus('saved');
      return result;
    } catch (error) {
      updateStatus('error');
      throw error;
    }
  }, [updateStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { status, setStatus: updateStatus, trackSave };
}
