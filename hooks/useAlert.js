import { useState, useCallback, useRef } from "react";
import { ALERT_TYPES } from "../constants";

/**
 * Custom hook for alert/notification management
 * @param {number} defaultDuration - Default auto-dismiss duration in ms
 * @returns {object} Alert state and methods
 */
export const useAlert = (defaultDuration = 3000) => {
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: ALERT_TYPES.INFO,
  });

  const timeoutRef = useRef(null);

  // Clear any existing timeout
  const clearAlertTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Show alert with auto-dismiss
  const showAlert = useCallback(
    (message, type = ALERT_TYPES.INFO, duration = defaultDuration) => {
      clearAlertTimeout();

      setAlert({
        show: true,
        message,
        type,
      });

      if (duration > 0) {
        timeoutRef.current = setTimeout(() => {
          setAlert((prev) => ({ ...prev, show: false }));
        }, duration);
      }
    },
    [defaultDuration, clearAlertTimeout]
  );

  // Hide alert manually
  const hideAlert = useCallback(() => {
    clearAlertTimeout();
    setAlert((prev) => ({ ...prev, show: false }));
  }, [clearAlertTimeout]);

  // Convenience methods for each type
  const showSuccess = useCallback(
    (message, duration) => showAlert(message, ALERT_TYPES.SUCCESS, duration),
    [showAlert]
  );

  const showError = useCallback(
    (message, duration) => showAlert(message, ALERT_TYPES.ERROR, duration),
    [showAlert]
  );

  const showWarning = useCallback(
    (message, duration) => showAlert(message, ALERT_TYPES.WARNING, duration),
    [showAlert]
  );

  const showInfo = useCallback(
    (message, duration) => showAlert(message, ALERT_TYPES.INFO, duration),
    [showAlert]
  );

  // Get alert CSS classes based on type (for Tailwind/DaisyUI)
  const getAlertClasses = useCallback(() => {
    const baseClasses = "alert";
    const typeClasses = {
      [ALERT_TYPES.SUCCESS]: "alert-success",
      [ALERT_TYPES.ERROR]: "alert-error",
      [ALERT_TYPES.WARNING]: "alert-warning",
      [ALERT_TYPES.INFO]: "alert-info",
    };
    return `${baseClasses} ${typeClasses[alert.type] || ""}`;
  }, [alert.type]);

  return {
    // State
    alert,
    isVisible: alert.show,
    message: alert.message,
    type: alert.type,

    // Methods
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Helpers
    getAlertClasses,
  };
};

export default useAlert;
