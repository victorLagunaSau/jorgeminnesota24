// ============================================================
// CONSTANTES CENTRALIZADAS - Jorge Minnesota Logistic LLC
// ============================================================

// --- STATUS DE VEHICULOS ---
export const VEHICLE_STATUS = {
    PR: "Registrado",
    IN: "Cargando",
    TR: "En Viaje",
    EB: "En Brownsville",
    DS: "Descargado",
    EN: "Entregado",
};

export const VEHICLE_STATUS_CODES = Object.keys(VEHICLE_STATUS);

export const VEHICLE_STATUS_OPTIONS = Object.entries(VEHICLE_STATUS).map(
    ([code, label]) => ({ value: code, label })
);

export const VEHICLE_STATUS_DESCRIPTIONS = {
    PR: "Tu vehiculo esta asignado y en espera de ser recogido.",
    IN: "Tu vehiculo esta siendo cargado en nuestra unidad de transporte.",
    TR: "Tu vehiculo esta en camino a Brownsville.",
    EB: "Tu vehiculo ha llegado a la ciudad de Brownsville.",
    DS: "Tu vehiculo esta esperando que lo recojas.",
    EN: "Tu vehiculo fue entregado.",
};

export const getStatusLabel = (code) => VEHICLE_STATUS[code] || code;

export const getStatusIndex = (code) => VEHICLE_STATUS_CODES.indexOf(code);

// --- TIPOS DE VEHICULO ---
export const VEHICLE_TYPES = [
    { value: "A", label: "A Ligero" },
    { value: "B", label: "B Mediano" },
    { value: "C", label: "C Pesado" },
];

// --- ALMACENES ---
export const WAREHOUSES = [
    { value: "Copart", label: "Copart" },
    { value: "Adesa", label: "Adesa" },
    { value: "Manheim", label: "Manheim" },
    { value: "Insurance Auto Auctions", label: "Insurance Auto Auctions" },
];

// --- OPCIONES DE TITULO ---
export const TITLE_OPTIONS = [
    { value: "NO", label: "NO" },
    { value: "SI", label: "SI" },
];

// --- PAGINACION ---
export const PAGE_SIZES = {
    DEFAULT: 10,
    SMALL: 8,
    MEDIUM: 15,
    LARGE: 20,
    XLARGE: 25,
};

export const PAGE_SIZE_OPTIONS = [10, 25, 50];

// --- TIMEOUTS ---
export const ALERT_TIMEOUT = 3500;
export const COPY_FEEDBACK_TIMEOUT = 2000;
export const ERROR_TIMEOUT = 5000;

// --- PAISES TELEFONO ---
export const PHONE_COUNTRIES = ["us", "mx"];
export const DEFAULT_COUNTRY = "us";
export const DEFAULT_COUNTRY_NAME = "United States";

// --- COLECCIONES FIREBASE ---
export const COLLECTIONS = {
    VEHICULOS: "vehiculos",
    MOVIMIENTOS: "movimientos",
    VIAJES_PENDIENTES: "viajesPendientes",
    VIAJES_PAGADOS: "viajesPagados",
    LOTES_EN_TRANSITO: "lotesEnTransito",
    CHOFERES: "choferes",
    CLIENTES: "clientes",
    EMPRESAS: "empresas",
    USERS: "users",
    CONFIG: "config",
    PROVINCE: "province",
    TOKENS_CHOFER: "tokensChofer",
};

export const CONSECUTIVOS_DOC = "consecutivos";

// --- LIMITES DE CAMPOS ---
export const FIELD_LIMITS = {
    BIN_NIP: 16,
    GATE_PASS: 12,
    LICENSE: 13,
    ZIP_CODE: 5,
    TAX_ID: 10,
    LOT: 8,
    MIN_PASSWORD: 6,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
};

// --- ALMACENES VIAJE (FormViaje) ---
export const TRIP_WAREHOUSES = ["Copart", "IAA", "Manheim", "Adesa", "Otra"];

// --- METODOS DE PAGO ---
export const PAYMENT_METHODS = {
    EFECTIVO: "efectivo",
    CHEQUE: "cheque",
    ZELLE: "zelle",
    TARJETA: "tarjeta",
    CREDITO: "credito",
};

// --- TIPOS DE MOVIMIENTO ---
export const MOVEMENT_TYPES = {
    ENTRADA: "Entrada",
    SALIDA: "Salida",
    PAGO: "Pago",
    ABONO: "Abono",
    ANTICIPO: "Anticipo",
};

// --- FORMATEO ---
export const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.seconds
        ? new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000)
        : new Date(timestamp);
    return date.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

export const formatDateTime = (timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.seconds
        ? new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000)
        : new Date(timestamp);
    return date.toLocaleString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const timestampToDate = (timestamp) => {
    if (!timestamp) return new Date(0);
    return timestamp.seconds
        ? new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000)
        : new Date(timestamp);
};
