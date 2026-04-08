// ===========================================
// FIREBASE COLLECTIONS
// ===========================================
export const COLLECTIONS = {
  USERS: "users",
  VEHICULOS: "vehiculos",
  VIAJES_PENDIENTES: "viajesPendientes",
  VIAJES_PAGADOS: "viajesPagados",
  CHOFERES: "choferes",
  CLIENTES: "clientes",
  EMPRESAS: "empresas",
  MOVIMIENTOS: "movimientos",
  PROVINCE: "province",
  CONFIG: "config",
  LOTES_EN_TRANSITO: "lotesEnTransito",
  ENTRADAS_CAJA: "entradasCaja",
  SALIDAS_CAJA: "salidasCaja",
  SOLICITUDES_VEHICULOS: "solicitudesVehiculos",
};

// ===========================================
// USER TYPES & ROLES
// ===========================================
export const USER_TYPES = {
  ADMIN: "admin",
  EMPRESA: "empresa",
  CHOFER: "chofer",
  CLIENTE: "cliente",
};

// ===========================================
// VEHICLE STATUS
// ===========================================
export const VEHICLE_STATUS = {
  PR: { code: "PR", label: "Registrado" },
  IN: { code: "IN", label: "Cargando" },
  TR: { code: "TR", label: "En Viaje" },
  EB: { code: "EB", label: "En Brownsville" },
  DS: { code: "DS", label: "Descargado" },
  EN: { code: "EN", label: "Entregado" },
};

export const VEHICLE_STATUS_LIST = Object.values(VEHICLE_STATUS);

// ===========================================
// TRIP STATUS
// ===========================================
export const TRIP_STATUS = {
  PENDIENTE: "PENDIENTE",
  VERIFICADO: "VERIFICADO",
  PAGADO: "PAGADO",
};

// ===========================================
// PAYMENT METHODS
// ===========================================
export const PAYMENT_METHODS = {
  EFECTIVO: "efectivo",
  CHEQUE: "cheque",
  ZELLE: "zelle",
  TARJETA: "tarjeta",
};

// ===========================================
// WAREHOUSES / ALMACENES
// ===========================================
export const WAREHOUSES = [
  { value: "Copart", label: "Copart" },
  { value: "IAA", label: "IAA" },
  { value: "Manheim", label: "Manheim" },
  { value: "Adesa", label: "Adesa" },
  { value: "Otra", label: "Otra" },
];

// ===========================================
// PAGINATION
// ===========================================
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50, 100],
};

// ===========================================
// CONFIG DOCUMENT KEYS (consecutivos)
// ===========================================
export const CONFIG_KEYS = {
  VIAJES_PENDIENTES: "viajesPendientes",
  VIAJES_PAGADOS: "Viajes pagados",
  FOLIO_VENTA: "folioventa",
  CLIENTES: "clientes",
  CHOFERES: "choferes",
  EMPRESAS: "empresas",
  ENTRADAS: "entradas",
  SALIDAS: "salidas",
};

// ===========================================
// ALERT TYPES
// ===========================================
export const ALERT_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
};

// ===========================================
// SIDEBAR MODULES
// ===========================================
export const ADMIN_MODULES = {
  SALIDA_VEHICULO: "salidaVehiculo",
  SALIDA_CAJA: "salidaCaja",
  ENTRADA_CAJA: "entradaCaja",
  CORTE_DIA: "corteDia",
  CORTE_TOTAL: "corteTotal",
  COBRANZA: "cobranza",
  REPORTE_COBROS: "reporteCobros",
  REPORTS: "reports",
  REPORTS_PENDIENTES_PAGO: "reportsPendientesPago",
  CLIENTES: "clientes",
  VIAJES: "viajes",
  REPORTE_VIAJES_PAGO: "reporteViajesPago",
  CHOFERES: "choferes",
  EMPRESAS: "empresas",
  VIAJES_ANTERIORES: "viajesAnteriores",
  VEHICULOS: "vehiculos",
  ESTADOS_PRECIOS: "estadosPrecios",
  USERS: "users",
};

// ===========================================
// COMPANY INFO (for receipts)
// ===========================================
export const COMPANY_INFO = {
  NAME: "Jorge Minnesota Logistic LLC",
  ADDRESS: "932 N. Minnesota Ave.",
  CITY: "Brownsville, Texas, 78521",
  PHONE: "+1 (956) 371-8314",
  LOGO_PATH: "/assets/Logo.png",
  LOGO_PRINT_PATH: "/assets/Logoprint.png",
};
