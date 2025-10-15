// src/hooks/useMarkerState.ts

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ARCombo } from '../types';

export function useMarkerState(combo: ARCombo | null) {
  const [isComboActive, setIsComboActive] = useState(false);
  const foundSetRef = useRef<Set<string>>(new Set());

  const updateComboState = useCallback(() => {
    if (!combo) {
      setIsComboActive(false);
      return;
    }
    const haveAllRequired = combo.required_tags.every(tag => foundSetRef.current.has(tag));
    setIsComboActive(haveAllRequired);
  }, [combo]);

  const onMarkerFound = useCallback((tag: string) => {
    foundSetRef.current.add(tag);
    updateComboState();
  }, [updateComboState]);

  const onMarkerLost = useCallback((tag: string) => {
    foundSetRef.current.delete(tag);
    updateComboState();
  }, [updateComboState]);
  
  useEffect(() => {
      foundSetRef.current.clear();
      updateComboState();
  }, [combo, updateComboState]);

  return { isComboActive, markerHandlers: { onMarkerFound, onMarkerLost } };
}
