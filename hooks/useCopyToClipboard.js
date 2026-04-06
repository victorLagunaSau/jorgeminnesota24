import { useState, useCallback, useRef } from "react";
import { copyToClipboard } from "../utils";

/**
 * Custom hook for copy to clipboard functionality
 * @param {number} resetDelay - Delay in ms before resetting copied state
 * @returns {object} Copy state and methods
 */
export const useCopyToClipboard = (resetDelay = 2000) => {
  const [copiedId, setCopiedId] = useState(null);
  const [copying, setCopying] = useState(false);
  const timeoutRef = useRef(null);

  // Clear any existing timeout
  const clearCopyTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Copy text to clipboard
  const copy = useCallback(
    async (text, id = null) => {
      clearCopyTimeout();
      setCopying(true);

      try {
        const success = await copyToClipboard(text);

        if (success) {
          setCopiedId(id || text);

          timeoutRef.current = setTimeout(() => {
            setCopiedId(null);
          }, resetDelay);
        }

        return success;
      } catch (error) {
        console.error("Copy failed:", error);
        return false;
      } finally {
        setCopying(false);
      }
    },
    [resetDelay, clearCopyTimeout]
  );

  // Check if specific item was copied
  const isCopied = useCallback(
    (id) => {
      return copiedId === id;
    },
    [copiedId]
  );

  // Reset copied state
  const reset = useCallback(() => {
    clearCopyTimeout();
    setCopiedId(null);
  }, [clearCopyTimeout]);

  return {
    copiedId,
    copying,
    copy,
    isCopied,
    reset,
  };
};

export default useCopyToClipboard;
