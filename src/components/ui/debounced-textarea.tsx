"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Simple debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

interface DebouncedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onCommit: (value: string) => void;
  debounceTimeout?: number;
}

export const DebouncedTextarea: React.FC<DebouncedTextareaProps> = ({
  value: initialValue,
  onCommit,
  debounceTimeout = 500,
  className,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(initialValue);

  // Debounce the commit function
  const debouncedCommit = useMemo(
    () => debounce(onCommit, debounceTimeout),
    [onCommit, debounceTimeout]
  );

  // Update local state when the prop value changes from the outside
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue); // Update UI instantly
    debouncedCommit(newValue); // Schedule the debounced write
  };
  
  const handleBlur = () => {
    // Immediately commit changes on blur to ensure data is saved if user navigates away
    onCommit(localValue);
  };

  return (
    <Textarea
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={cn(className)}
      {...props}
    />
  );
};
