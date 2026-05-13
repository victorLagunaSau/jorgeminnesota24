import { toWords } from "number-to-words";

// ===========================================
// NUMBER UTILITIES
// ===========================================

/**
 * Safely parse a number, returning 0 if invalid
 * @param {any} value - Value to parse
 * @returns {number} Parsed number or 0
 */
export const parseNumberOrZero = (value) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Convert number to words in Spanish format for currency
 * @param {number} amount - Amount to convert
 * @param {string} currency - Currency suffix (default: "DLL")
 * @returns {string} Amount in words
 */
export const numberToWords = (amount, currency = "DLL") => {
  try {
    const num = parseNumberOrZero(amount);
    return toWords(Math.floor(num)).toUpperCase() + ` ${currency}`;
  } catch (error) {
    return `${amount} ${currency}`;
  }
};

/**
 * Format number as currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency symbol (default: "$")
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = "$") => {
  const num = parseNumberOrZero(amount);
  return `${currency}${num.toFixed(2)}`;
};

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  return parseNumberOrZero(num).toLocaleString("en-US");
};

// ===========================================
// STRING UTILITIES
// ===========================================

/**
 * Capitalize first letter of each word
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalizeWords = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
export const truncateString = (str, maxLength = 50) => {
  if (!str || str.length <= maxLength) return str || "";
  return str.slice(0, maxLength) + "...";
};

// ===========================================
// DATE UTILITIES
// ===========================================

/**
 * Format Firestore timestamp to readable date
 * @param {object} timestamp - Firestore timestamp object
 * @param {string} format - Date format (default: "DD/MM/YYYY HH:mm")
 * @returns {string} Formatted date string
 */
export const formatFirestoreDate = (timestamp, format = "DD/MM/YYYY HH:mm") => {
  if (!timestamp) return "";

  // Handle Firestore Timestamp
  if (timestamp.seconds) {
    const date = new Date(timestamp.seconds * 1000);
    return formatDate(date, format);
  }

  // Handle regular Date
  if (timestamp instanceof Date) {
    return formatDate(timestamp, format);
  }

  return "";
};

/**
 * Simple date formatter
 * @param {Date} date - Date object
 * @param {string} format - Format string
 * @returns {string} Formatted date
 */
export const formatDate = (date, format = "DD/MM/YYYY") => {
  if (!date) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return format
    .replace("DD", day)
    .replace("MM", month)
    .replace("YYYY", year)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds);
};

/**
 * Get today's date range (start and end)
 * @returns {object} { startOfDay, endOfDay }
 */
export const getTodayRange = () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { startOfDay, endOfDay };
};

// ===========================================
// ARRAY/OBJECT UTILITIES
// ===========================================

/**
 * Filter array by search term across multiple fields
 * @param {Array} items - Items to filter
 * @param {string} searchTerm - Search term
 * @param {Array} fields - Fields to search in
 * @returns {Array} Filtered items
 */
export const filterBySearch = (items, searchTerm, fields) => {
  if (!searchTerm || !items) return items || [];

  const term = searchTerm.toLowerCase().trim();

  return items.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(term);
    })
  );
};

/**
 * Sort array by field
 * @param {Array} items - Items to sort
 * @param {string} field - Field to sort by
 * @param {string} order - "asc" or "desc"
 * @returns {Array} Sorted items
 */
export const sortByField = (items, field, order = "asc") => {
  if (!items || !field) return items || [];

  return [...items].sort((a, b) => {
    const valueA = a[field];
    const valueB = b[field];

    if (valueA < valueB) return order === "asc" ? -1 : 1;
    if (valueA > valueB) return order === "asc" ? 1 : -1;
    return 0;
  });
};

/**
 * Group array by field
 * @param {Array} items - Items to group
 * @param {string} field - Field to group by
 * @returns {object} Grouped items
 */
export const groupByField = (items, field) => {
  if (!items || !field) return {};

  return items.reduce((groups, item) => {
    const key = item[field] || "unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
};

// ===========================================
// VALIDATION UTILITIES
// ===========================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validate phone number (basic)
 * @param {string} phone - Phone to validate
 * @returns {boolean} Is valid phone
 */
export const isValidPhone = (phone) => {
  const cleaned = phone?.replace(/\D/g, "") || "";
  return cleaned.length >= 10;
};

/**
 * Check if value is empty (null, undefined, empty string, empty array)
 * @param {any} value - Value to check
 * @returns {boolean} Is empty
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
};

// ===========================================
// CLIPBOARD UTILITIES
// ===========================================

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy:", error);
    return false;
  }
};

// ===========================================
// ID GENERATION
// ===========================================

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Send push notification to a client when vehicle status changes
 * @param {string} clienteNombre - Client name (uppercase, as stored in vehiculos)
 * @param {string} nuevoEstatus - New vehicle status code (PR, IN, TR, EB, DS, EN)
 * @param {string} vehiculoInfo - Vehicle description (e.g. "2019 CHEVROLET EQUINOX")
 */
export const notificarCambioEstatus = async (clienteNombre, nuevoEstatus, vehiculoInfo) => {
  if (!clienteNombre) return;

  const { VEHICLE_STATUS, VEHICLE_STATUS_DESCRIPTIONS } = require("../constants");

  const statusLabel = VEHICLE_STATUS[nuevoEstatus]?.label || nuevoEstatus;
  const statusDesc = VEHICLE_STATUS_DESCRIPTIONS[nuevoEstatus] || "";

  const titulo = `${vehiculoInfo} — ${statusLabel}`;
  const mensaje = statusDesc || `El estatus de tu vehículo cambió a: ${statusLabel}`;

  try {
    await fetch("/api/send-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteNombre, titulo, mensaje }),
    });
  } catch (err) {
    console.error("Error enviando push notification:", err);
  }
};

/**
 * Send push notification to a driver when they get assigned a new trip
 * @param {string} choferId - Driver's Firestore document ID
 * @param {number} numVehiculos - Number of vehicles in the trip
 * @param {string} empresaNombre - Carrier company name
 */
export const notificarViajeAsignado = async (choferId, numVehiculos, empresaNombre) => {
  if (!choferId) return;

  const titulo = "Nuevo viaje asignado";
  const mensaje = `${empresaNombre} te asignó un viaje con ${numVehiculos} vehículo${numVehiculos > 1 ? 's' : ''}. Abre la app para ver los detalles.`;

  try {
    await fetch("/api/send-push-chofer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choferId, titulo, mensaje }),
    });
  } catch (err) {
    console.error("Error enviando push al chofer:", err);
  }
};

/**
 * Send push notification to a client when their solicitud status changes
 * @param {string} clienteNombre - Client name
 * @param {string} nuevoEstado - New solicitud state (pendiente, aprobado, en_proceso, completado)
 * @param {string} vehiculoInfo - Vehicle description
 */
export const notificarCambioSolicitud = async (clienteNombre, nuevoEstado, vehiculoInfo) => {
  if (!clienteNombre) return;

  const labels = {
    pendiente: "Pendiente",
    aprobado: "Aprobada",
    asignado: "Asignada",
    en_proceso: "En Camino",
    completado: "Completada",
  };

  const mensajes = {
    pendiente: "Tu solicitud está pendiente de revisión.",
    aprobado: "Tu solicitud fue aprobada.",
    asignado: "Tu vehículo fue asignado a un transportista.",
    en_proceso: "Tu vehículo está en camino.",
    completado: "Tu solicitud fue completada.",
  };

  const titulo = `Solicitud ${labels[nuevoEstado] || nuevoEstado} — ${vehiculoInfo}`;
  const mensaje = mensajes[nuevoEstado] || `Tu solicitud cambió a: ${nuevoEstado}`;

  try {
    await fetch("/api/send-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteNombre, titulo, mensaje }),
    });
  } catch (err) {
    console.error("Error enviando push notification:", err);
  }
};
