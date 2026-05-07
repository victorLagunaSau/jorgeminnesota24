import React, { useState, useCallback, memo } from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
    Marker,
    ZoomableGroup,
} from "react-simple-maps";
import { FaCar, FaUser, FaMapMarkerAlt, FaBarcode, FaGavel, FaExpand, FaCompress, FaPlus, FaMinus, FaCrosshairs } from "react-icons/fa";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// Coordenadas de ciudades con subastas IAA/Copart en USA [lng, lat]
const CITY_COORDS = {
    // Texas
    "houston": [-95.3698, 29.7604], "dallas": [-96.7970, 32.7767],
    "san antonio": [-98.4936, 29.4241], "austin": [-97.7431, 30.2672],
    "fort worth": [-97.3308, 32.7555], "el paso": [-106.4850, 31.7619],
    "mcallen": [-98.2300, 26.2034], "corpus christi": [-97.3964, 27.8006],
    "lubbock": [-101.8313, 33.5779], "amarillo": [-101.8313, 35.2220],
    "laredo": [-99.5075, 27.5036], "beaumont": [-94.1266, 30.0802],
    "temple": [-97.3428, 31.0982], "lufkin": [-94.8491, 31.3382],
    "longview": [-94.7405, 32.5007], "abilene": [-99.7331, 32.4487],
    "waco": [-97.1467, 31.5493], "tyler": [-95.3010, 32.3513],
    "midland": [-102.0779, 31.9973], "odessa": [-102.3676, 31.8457],
    "wilmer": [-96.6850, 32.5890], "andrews": [-102.5455, 32.3187],
    "fort pierce": [-80.3256, 27.4467],
    // California
    "los angeles": [-118.2437, 34.0522], "san diego": [-117.1611, 32.7157],
    "san jose": [-121.8863, 37.3382], "san francisco": [-122.4194, 37.7749],
    "fresno": [-119.7871, 36.7378], "sacramento": [-121.4944, 38.5816],
    "bakersfield": [-119.0187, 35.3733], "riverside": [-117.3961, 33.9533],
    "rancho cucamonga": [-117.5931, 34.1064], "fontana": [-117.4350, 34.0922],
    "sun valley": [-118.3920, 34.2192], "van nuys": [-118.4485, 34.1867],
    "anaheim": [-117.9145, 33.8366], "long beach": [-118.1937, 33.7701],
    "fremont": [-121.9886, 37.5485], "hayward": [-122.0808, 37.6688],
    "vallejo": [-122.2566, 38.1041], "martinez": [-122.1342, 37.9990],
    "colton": [-117.3133, 34.0739], "adelanto": [-117.4093, 34.5828],
    // Florida
    "miami": [-80.1918, 25.7617], "orlando": [-81.3789, 28.5383],
    "orlando north": [-81.3500, 28.6800],
    "tampa": [-82.4572, 27.9506], "jacksonville": [-81.6557, 30.3322],
    "fort lauderdale": [-80.1373, 26.1224], "west palm beach": [-80.0534, 26.7153],
    "pensacola": [-87.2169, 30.4213], "tallahassee": [-84.2807, 30.4383],
    "ocala": [-82.1401, 29.1872], "fort myers": [-81.8723, 26.6406],
    "clearwater": [-82.8001, 27.9659], "lakeland": [-81.9498, 28.0395],
    "opa locka": [-80.2503, 25.9023], "punta gorda": [-82.0454, 26.9298],
    "arcadia": [-81.8587, 27.2156],
    // Georgia
    "atlanta": [-84.3880, 33.7490], "savannah": [-81.0998, 32.0809],
    "macon": [-83.6324, 32.8407], "augusta": [-81.9750, 33.4735],
    // Arizona
    "phoenix": [-112.0740, 33.4484], "tucson": [-110.9747, 32.2226],
    "mesa": [-111.8315, 33.4152], "scottsdale": [-111.9261, 33.4942],
    // North Carolina
    "charlotte": [-80.8431, 35.2271], "raleigh": [-78.6382, 35.7796],
    "greensboro": [-79.7920, 36.0726], "durham": [-78.8986, 35.9940],
    "china grove": [-80.5821, 35.5693], "mebane": [-79.2667, 36.0960],
    // South Carolina
    "charleston": [-79.9311, 32.7765], "columbia": [-81.0348, 34.0007],
    "greenville": [-82.3940, 34.8526],
    // Tennessee
    "nashville": [-86.7816, 36.1627], "memphis": [-90.0490, 35.1495],
    "knoxville": [-83.9207, 35.9606], "chattanooga": [-85.3097, 35.0456],
    // Alabama
    "birmingham": [-86.8025, 33.5207], "montgomery": [-86.3001, 32.3668],
    "mobile": [-88.0399, 30.6954], "tanner": [-86.9524, 34.7343],
    "dothan": [-85.3905, 31.2232], "bessemer": [-86.9544, 33.4018], "huntsville": [-86.5861, 34.7304],
    // Louisiana
    "new orleans": [-90.0715, 29.9511], "baton rouge": [-91.1871, 30.4515],
    "shreveport": [-93.7502, 32.5252],
    // Mississippi
    "jackson": [-90.1848, 32.2988], "hattiesburg": [-89.2903, 31.3271],
    "meridian": [-88.7037, 32.3643], "gulfport": [-89.0928, 30.3674],
    // Oklahoma
    "oklahoma city": [-97.5164, 35.4676], "tulsa": [-95.9928, 36.1540],
    "norman": [-97.4395, 35.2226],
    // Colorado
    "denver": [-104.9903, 39.7392], "colorado springs": [-104.8214, 38.8339],
    "pueblo": [-104.6091, 38.2544],
    // Illinois
    "chicago": [-87.6298, 41.8781], "springfield": [-89.6501, 39.7817],
    "peoria": [-89.5890, 40.6936], "champaign": [-88.2434, 40.1164],
    "normal": [-88.9907, 40.5142], "wheeling": [-87.9290, 42.1392],
    // Ohio
    "columbus": [-82.9988, 39.9612], "cleveland": [-81.6944, 41.4993],
    "cincinnati": [-84.5120, 39.1031], "dayton": [-84.1916, 39.7589],
    "toledo": [-83.5379, 41.6528], "akron": [-81.5190, 41.0814],
    // Pennsylvania
    "philadelphia": [-75.1652, 39.9526], "pittsburgh": [-79.9959, 40.4406],
    "harrisburg": [-76.8867, 40.2732], "scranton": [-75.6624, 41.4090],
    "wilkes-barre": [-75.8813, 41.2459], "york": [-76.7275, 39.9626],
    "allentown": [-75.4902, 40.6023],
    // New York
    "new york": [-74.0060, 40.7128], "buffalo": [-78.8784, 42.8864],
    "albany": [-73.7562, 42.6526], "long island": [-73.1350, 40.7891],
    "newburgh": [-74.0104, 41.5034], "brookhaven ny": [-72.9157, 40.7834],
    "syracuse": [-76.1474, 43.0481], "rochester": [-77.6109, 43.1566],
    // New Jersey
    "newark": [-74.1724, 40.7357], "trenton": [-74.7429, 40.2171],
    "somerville": [-74.6099, 40.5743],
    // Michigan
    "detroit": [-83.0458, 42.3314], "grand rapids": [-85.6681, 42.9634],
    "flint": [-83.6875, 43.0125], "lansing": [-84.5555, 42.7325],
    "kalamazoo": [-85.5872, 42.2917], "ionia": [-85.0711, 42.9872],
    // Indiana
    "indianapolis": [-86.1581, 39.7684], "fort wayne": [-85.1394, 41.0793],
    "dyer": [-87.5217, 41.4942], "cicero": [-86.0175, 40.1239],
    "evansville": [-87.5711, 37.9716],
    // Wisconsin
    "milwaukee": [-87.9065, 43.0389], "madison": [-89.4012, 43.0731],
    "appleton": [-88.4154, 44.2619], "green bay": [-88.0199, 44.5133],
    // Minnesota
    "minneapolis": [-93.2650, 44.9778], "st paul": [-93.0900, 44.9537],
    "east bethel": [-93.2016, 45.3694],
    // Missouri
    "st louis": [-90.1994, 38.6270], "kansas city": [-94.5786, 39.0997],
    "springfield mo": [-93.2923, 37.2090],
    // Iowa
    "des moines": [-93.6091, 41.5868], "davenport": [-90.5776, 41.5236],
    "cedar rapids": [-91.6656, 41.9779],
    // Kansas
    "wichita": [-97.3375, 37.6872], "topeka": [-95.6890, 39.0473],
    // Nebraska
    "omaha": [-95.9345, 41.2565], "lincoln": [-96.6852, 40.8258],
    // Nevada
    "las vegas": [-115.1398, 36.1699], "reno": [-119.8138, 39.5296],
    // Utah
    "salt lake city": [-111.8910, 40.7608], "ogden": [-111.9738, 41.2230],
    // Oregon
    "portland or": [-122.6765, 45.5152], "eugene": [-123.0868, 44.0521],
    "salem": [-123.0351, 44.9429],
    // Washington
    "seattle": [-122.3321, 47.6062], "spokane": [-117.4260, 47.6588],
    "tacoma": [-122.4443, 47.2529],
    // Virginia
    "richmond": [-77.4360, 37.5407], "norfolk": [-76.2859, 36.8508],
    "fredericksburg": [-77.4605, 38.3032], "roanoke": [-79.9414, 37.2710],
    "virginia beach": [-75.9780, 36.8529],
    // Maryland
    "baltimore": [-76.6122, 39.2904], "elkton": [-75.8333, 39.6068],
    // Connecticut
    "hartford": [-72.6823, 41.7658], "bridgeport": [-73.1952, 41.1865],
    "new haven": [-72.9279, 41.3083],
    // Massachusetts
    "boston": [-71.0589, 42.3601], "worcester": [-71.8023, 42.2626],
    "north billerica": [-71.2700, 42.5598], "templeton": [-72.0687, 42.5565],
    // New Mexico
    "albuquerque": [-106.6504, 35.0844], "las cruces": [-106.7460, 32.3199],
    // Idaho
    "boise": [-116.2023, 43.6150], "twin falls": [-114.4609, 42.5558],
    // Montana
    "billings": [-108.5007, 45.7833], "missoula": [-114.0103, 46.8721],
    // Wyoming
    "casper": [-106.3131, 42.8666],
    // Kentucky
    "louisville": [-85.7585, 38.2527], "lexington": [-84.5037, 38.0406],
    "bowling green": [-86.4436, 36.9685], "paducah": [-88.6001, 37.0834],
    // West Virginia
    "charleston wv": [-81.6326, 38.3498], "morgantown": [-79.9559, 39.6295],
    // Arkansas
    "little rock": [-92.2896, 34.7465], "fayetteville": [-94.1574, 36.0626],
    "fort smith": [-94.3985, 35.3859], "jonesboro": [-90.7043, 35.8423],
    // Maine
    "portland me": [-70.2553, 43.6591], "lyman": [-70.7184, 43.5398],
    "gorham": [-70.4442, 43.6795],
    // New Hampshire
    "manchester": [-71.4548, 42.9956], "candia": [-71.2781, 43.0778],
    // Hawaii
    "honolulu": [-157.8583, 21.3069],
    // Alaska
    "anchorage": [-149.9003, 61.2181],
    // Delaware
    "wilmington": [-75.5398, 39.7391],
    // Rhode Island
    "providence": [-71.4128, 41.8240],
    // Vermont
    "burlington": [-73.2121, 44.4759],
    // North Dakota
    "fargo": [-96.7898, 46.8772],
    // South Dakota
    "sioux falls": [-96.7311, 43.5446],
};

// Coordenadas centrales de cada estado (fallback)
const STATE_CENTER = {
    'TX': [-99.90, 31.97], 'CA': [-119.42, 36.78], 'FL': [-81.52, 27.66],
    'AZ': [-111.09, 34.05], 'NV': [-116.42, 38.80], 'GA': [-83.64, 32.17],
    'NC': [-79.02, 35.76], 'SC': [-81.16, 33.84], 'TN': [-86.58, 35.52],
    'AL': [-86.90, 32.32], 'LA': [-91.96, 30.98], 'MS': [-89.40, 32.35],
    'OK': [-97.09, 35.47], 'AR': [-92.37, 34.75], 'NM': [-105.87, 34.52],
    'CO': [-105.78, 39.55], 'IL': [-89.40, 40.63], 'OH': [-82.91, 40.42],
    'PA': [-77.19, 41.20], 'NY': [-74.22, 43.30], 'NJ': [-74.41, 40.06],
    'MI': [-84.54, 44.31], 'IN': [-86.13, 40.27], 'WI': [-89.62, 43.78],
    'MN': [-94.69, 46.73], 'IA': [-93.10, 41.88], 'MO': [-91.83, 37.96],
    'KS': [-98.48, 39.01], 'NE': [-99.90, 41.49], 'SD': [-99.90, 43.97],
    'ND': [-101.00, 47.55], 'MT': [-110.36, 46.88], 'WY': [-107.29, 42.76],
    'UT': [-111.09, 39.32], 'ID': [-114.74, 44.07], 'WA': [-120.74, 47.75],
    'OR': [-120.55, 43.80], 'VA': [-78.66, 37.43], 'WV': [-80.45, 38.60],
    'KY': [-84.27, 37.84], 'MD': [-76.64, 39.05], 'DE': [-75.53, 38.91],
    'CT': [-72.76, 41.60], 'RI': [-71.48, 41.58], 'MA': [-71.38, 42.41],
    'VT': [-72.58, 44.56], 'NH': [-71.57, 43.19], 'ME': [-69.45, 45.25],
    'HI': [-155.67, 19.90], 'AK': [-153.49, 64.20],
};

// Nombre completo → abreviación + coordenadas para labels
const STATE_LABELS = {
    'Alabama': { abbr: 'AL', coords: [-86.90, 32.32] },
    'Alaska': { abbr: 'AK', coords: [-153.49, 64.20] },
    'Arizona': { abbr: 'AZ', coords: [-111.09, 34.05] },
    'Arkansas': { abbr: 'AR', coords: [-92.37, 34.75] },
    'California': { abbr: 'CA', coords: [-119.42, 36.78] },
    'Colorado': { abbr: 'CO', coords: [-105.78, 39.55] },
    'Connecticut': { abbr: 'CT', coords: [-72.76, 41.60] },
    'Delaware': { abbr: 'DE', coords: [-75.53, 38.91] },
    'Florida': { abbr: 'FL', coords: [-81.52, 27.66] },
    'Georgia': { abbr: 'GA', coords: [-83.64, 32.17] },
    'Hawaii': { abbr: 'HI', coords: [-155.67, 19.90] },
    'Idaho': { abbr: 'ID', coords: [-114.74, 44.07] },
    'Illinois': { abbr: 'IL', coords: [-89.40, 40.63] },
    'Indiana': { abbr: 'IN', coords: [-86.13, 40.27] },
    'Iowa': { abbr: 'IA', coords: [-93.10, 41.88] },
    'Kansas': { abbr: 'KS', coords: [-98.48, 39.01] },
    'Kentucky': { abbr: 'KY', coords: [-84.27, 37.84] },
    'Louisiana': { abbr: 'LA', coords: [-91.96, 30.98] },
    'Maine': { abbr: 'ME', coords: [-69.45, 45.25] },
    'Maryland': { abbr: 'MD', coords: [-76.64, 39.05] },
    'Massachusetts': { abbr: 'MA', coords: [-71.38, 42.41] },
    'Michigan': { abbr: 'MI', coords: [-84.54, 44.31] },
    'Minnesota': { abbr: 'MN', coords: [-94.69, 46.73] },
    'Mississippi': { abbr: 'MS', coords: [-89.40, 32.35] },
    'Missouri': { abbr: 'MO', coords: [-91.83, 37.96] },
    'Montana': { abbr: 'MT', coords: [-110.36, 46.88] },
    'Nebraska': { abbr: 'NE', coords: [-99.90, 41.49] },
    'Nevada': { abbr: 'NV', coords: [-116.42, 38.80] },
    'New Hampshire': { abbr: 'NH', coords: [-71.57, 43.19] },
    'New Jersey': { abbr: 'NJ', coords: [-74.41, 40.06] },
    'New Mexico': { abbr: 'NM', coords: [-105.87, 34.52] },
    'New York': { abbr: 'NY', coords: [-74.22, 43.30] },
    'North Carolina': { abbr: 'NC', coords: [-79.02, 35.76] },
    'North Dakota': { abbr: 'ND', coords: [-101.00, 47.55] },
    'Ohio': { abbr: 'OH', coords: [-82.91, 40.42] },
    'Oklahoma': { abbr: 'OK', coords: [-97.09, 35.47] },
    'Oregon': { abbr: 'OR', coords: [-120.55, 43.80] },
    'Pennsylvania': { abbr: 'PA', coords: [-77.19, 41.20] },
    'Rhode Island': { abbr: 'RI', coords: [-71.48, 41.58] },
    'South Carolina': { abbr: 'SC', coords: [-81.16, 33.84] },
    'South Dakota': { abbr: 'SD', coords: [-99.90, 43.97] },
    'Tennessee': { abbr: 'TN', coords: [-86.58, 35.52] },
    'Texas': { abbr: 'TX', coords: [-99.90, 31.97] },
    'Utah': { abbr: 'UT', coords: [-111.09, 39.32] },
    'Vermont': { abbr: 'VT', coords: [-72.58, 44.56] },
    'Virginia': { abbr: 'VA', coords: [-78.66, 37.43] },
    'Washington': { abbr: 'WA', coords: [-120.74, 47.75] },
    'West Virginia': { abbr: 'WV', coords: [-80.45, 38.60] },
    'Wisconsin': { abbr: 'WI', coords: [-89.62, 43.78] },
    'Wyoming': { abbr: 'WY', coords: [-107.29, 42.76] },
};

// Claves de CITY_COORDS ordenadas de mayor a menor longitud para evitar
// que "charleston" matchee antes que "charleston wv", o "portland" antes
// que "portland me". Longest-match-first.
const CITY_KEYS_SORTED = Object.keys(CITY_COORDS).sort((a, b) => b.length - a.length);

function getLocationCoords(location) {
    if (!location) return null;
    const loc = location.toLowerCase().trim();
    for (const city of CITY_KEYS_SORTED) {
        if (loc.includes(city)) {
            return { coords: CITY_COORDS[city], label: city.replace(/\b\w/g, c => c.toUpperCase()) };
        }
    }
    const stateMatch = location.match(/\b([A-Z]{2})\b/);
    if (stateMatch && STATE_CENTER[stateMatch[1]]) {
        return { coords: STATE_CENTER[stateMatch[1]], label: stateMatch[1] };
    }
    return null;
}

function getAgeColor(fechaSolicitud) {
    if (!fechaSolicitud) return { fill: "#22c55e", fillHover: "#16a34a", pulse: "rgba(34, 197, 94, 0.2)", shadow: "rgba(34,197,94,0.6)", label: "Reciente" };
    const date = fechaSolicitud.toDate ? fechaSolicitud.toDate() : new Date(fechaSolicitud);
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days >= 7) return { fill: "#ef4444", fillHover: "#dc2626", pulse: "rgba(239, 68, 68, 0.2)", shadow: "rgba(239,68,68,0.6)", label: "7+ días", days };
    if (days >= 3) return { fill: "#f59e0b", fillHover: "#d97706", pulse: "rgba(245, 158, 11, 0.2)", shadow: "rgba(245,158,11,0.6)", label: "3-6 días", days };
    return { fill: "#22c55e", fillHover: "#16a34a", pulse: "rgba(34, 197, 94, 0.2)", shadow: "rgba(34,197,94,0.6)", label: "< 3 días", days };
}

function getGroupColor(solicitudes) {
    let oldest = null;
    solicitudes.forEach(sol => {
        const date = sol.fechaSolicitud?.toDate ? sol.fechaSolicitud.toDate() : (sol.fechaSolicitud ? new Date(sol.fechaSolicitud) : null);
        if (date && (!oldest || date < oldest)) oldest = date;
    });
    return getAgeColor(oldest ? { toDate: () => oldest } : null);
}

const DEFAULT_CENTER = [-97, 38];
const DEFAULT_ZOOM = 1;

const MapaUSA = ({ onSelectSolicitud, getEstadoConfig, formatDate, solicitudes, isFullscreen, toggleFullscreen }) => {
    const [hoveredMarker, setHoveredMarker] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(DEFAULT_ZOOM);
    const [center, setCenter] = useState(DEFAULT_CENTER);

    const handleMouseMove = (e) => {
        setTooltipPos({ x: e.clientX, y: e.clientY });
    };

    const handleZoomIn = useCallback(() => {
        setZoom(prev => Math.min(prev * 1.5, 8));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom(prev => Math.max(prev / 1.5, 1));
    }, []);

    const handleReset = useCallback(() => {
        setZoom(DEFAULT_ZOOM);
        setCenter(DEFAULT_CENTER);
    }, []);

    const cityMarkers = React.useMemo(() => {
        const grouped = {};
        solicitudes.forEach(sol => {
            const result = getLocationCoords(sol.location);
            if (!result) return;
            const key = result.coords.join(",");
            if (!grouped[key]) {
                grouped[key] = { label: result.label, coords: result.coords, solicitudes: [] };
            }
            grouped[key].solicitudes.push(sol);
        });
        return Object.values(grouped);
    }, [solicitudes]);

    return (
        <div
            className="relative"
            onMouseMove={handleMouseMove}
        >
            {/* Controles arriba a la derecha */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
                {/* Fullscreen */}
                <button
                    onClick={toggleFullscreen}
                    className="w-9 h-9 bg-gray-700 rounded-lg shadow-lg border border-gray-600 flex items-center justify-center text-gray-300 hover:text-red-400 hover:border-red-400 transition-colors"
                    title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                >
                    {isFullscreen ? <FaCompress size={14} /> : <FaExpand size={14} />}
                </button>
                {/* Zoom in */}
                <button
                    onClick={handleZoomIn}
                    className="w-9 h-9 bg-gray-700 rounded-lg shadow-lg border border-gray-600 flex items-center justify-center text-gray-300 hover:text-red-400 hover:border-red-400 transition-colors"
                    title="Acercar"
                >
                    <FaPlus size={12} />
                </button>
                {/* Zoom out */}
                <button
                    onClick={handleZoomOut}
                    className="w-9 h-9 bg-gray-700 rounded-lg shadow-lg border border-gray-600 flex items-center justify-center text-gray-300 hover:text-red-400 hover:border-red-400 transition-colors"
                    title="Alejar"
                >
                    <FaMinus size={12} />
                </button>
                {/* Reset */}
                <button
                    onClick={handleReset}
                    className="w-9 h-9 bg-gray-700 rounded-lg shadow-lg border border-gray-600 flex items-center justify-center text-gray-300 hover:text-red-400 hover:border-red-400 transition-colors"
                    title="Restablecer vista"
                >
                    <FaCrosshairs size={13} />
                </button>
            </div>

            {/* Mapa */}
            <div className="w-full" style={{ aspectRatio: isFullscreen ? undefined : "975 / 610", height: isFullscreen ? "100vh" : undefined }}>
                <ComposableMap
                    projection="geoAlbersUsa"
                    projectionConfig={{ scale: 1000 }}
                    width={975}
                    height={610}
                    style={{ width: "100%", height: "100%" }}
                >
                    <ZoomableGroup
                        zoom={zoom}
                        center={center}
                        onMoveEnd={({ coordinates, zoom: z }) => {
                            setCenter(coordinates);
                            setZoom(z);
                        }}
                        minZoom={1}
                        maxZoom={8}
                    >
                        <Geographies geography={GEO_URL}>
                            {({ geographies }) =>
                                geographies.map((geo) => (
                                    <Geography
                                        key={geo.rpiKey || geo.properties.name}
                                        geography={geo}
                                        fill="#1f2937"
                                        stroke="#374151"
                                        strokeWidth={0.5}
                                        style={{
                                            default: { outline: "none" },
                                            hover: { fill: "#374151", outline: "none" },
                                            pressed: { outline: "none" },
                                        }}
                                    />
                                ))
                            }
                        </Geographies>

                        {/* Labels de estados */}
                        {Object.entries(STATE_LABELS).map(([name, { abbr, coords }]) => (
                            <Marker key={abbr} coordinates={coords}>
                                <text
                                    textAnchor="middle"
                                    y={4 / Math.sqrt(zoom)}
                                    style={{
                                        fontFamily: "system-ui",
                                        fontSize: `${11 / Math.sqrt(zoom)}px`,
                                        fontWeight: "600",
                                        fill: "rgba(156,163,175,0.4)",
                                        pointerEvents: "none",
                                        userSelect: "none",
                                    }}
                                >
                                    {abbr}
                                </text>
                            </Marker>
                        ))}

                        {cityMarkers.map((marker) => {
                            const count = marker.solicitudes.length;
                            const baseRadius = Math.min(4 + count * 1, 14);
                            const radius = baseRadius / Math.sqrt(zoom);
                            const isHovered = hoveredMarker?.label === marker.label &&
                                hoveredMarker?.coords[0] === marker.coords[0];
                            const color = getGroupColor(marker.solicitudes);

                            return (
                                <Marker
                                    key={marker.coords.join(",")}
                                    coordinates={marker.coords}
                                    onMouseEnter={() => setHoveredMarker(marker)}
                                    onMouseLeave={() => setHoveredMarker(null)}
                                    onClick={() => {
                                        if (marker.solicitudes.length === 1) {
                                            onSelectSolicitud(marker.solicitudes[0]);
                                        }
                                    }}
                                    style={{ cursor: "pointer" }}
                                >
                                    <circle
                                        r={radius + 5 / Math.sqrt(zoom)}
                                        fill={color.pulse}
                                        className="animate-ping"
                                        style={{ animationDuration: "2.5s" }}
                                    />
                                    <circle
                                        r={radius}
                                        fill={isHovered ? color.fillHover : color.fill}
                                        stroke="#fff"
                                        strokeWidth={2 / Math.sqrt(zoom)}
                                        style={{
                                            transition: "all 0.2s",
                                            filter: isHovered
                                                ? `drop-shadow(0 0 8px ${color.shadow})`
                                                : "drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                                        }}
                                    />
                                    <text
                                        textAnchor="middle"
                                        y={4 / Math.sqrt(zoom)}
                                        style={{
                                            fontFamily: "system-ui",
                                            fontSize: `${(count > 9 ? 10 : 12) / Math.sqrt(zoom)}px`,
                                            fontWeight: "bold",
                                            fill: "#fff",
                                            pointerEvents: "none",
                                        }}
                                    >
                                        {count}
                                    </text>
                                </Marker>
                            );
                        })}
                    </ZoomableGroup>
                </ComposableMap>
            </div>

            {/* Leyenda */}
            <div className={`absolute bottom-4 left-4 backdrop-blur-sm rounded-lg shadow-lg border p-3 ${
"bg-gray-800/90 border-gray-700"
            }`}>
                <p className={`text-xs font-bold mb-2.5 ${"text-gray-200"}`}>
                    {cityMarkers.reduce((acc, m) => acc + m.solicitudes.length, 0)} vehículos en {cityMarkers.length} ubicaciones
                </p>
                <div className="space-y-1.5">
                    <div className={`flex items-center gap-2 text-xs ${"text-gray-400"}`}>
                        <span className="w-3 h-3 bg-green-500 rounded-full inline-block flex-shrink-0"></span>
                        <span>Menos de 3 días</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${"text-gray-400"}`}>
                        <span className="w-3 h-3 bg-amber-500 rounded-full inline-block flex-shrink-0"></span>
                        <span>3 a 6 días</span>
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${"text-gray-400"}`}>
                        <span className="w-3 h-3 bg-red-500 rounded-full inline-block flex-shrink-0"></span>
                        <span>7+ días</span>
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            {hoveredMarker && (
                <div
                    className="fixed z-[100] pointer-events-none"
                    style={{
                        left: tooltipPos.x + 16,
                        top: tooltipPos.y - 10,
                        maxWidth: "360px",
                    }}
                >
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-800 px-4 py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FaMapMarkerAlt className="text-green-400 text-sm" />
                                <span className="text-white font-bold text-sm">{hoveredMarker.label}</span>
                            </div>
                            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                {hoveredMarker.solicitudes.length}
                            </span>
                        </div>

                        <div className="max-h-72 overflow-y-auto">
                            {hoveredMarker.solicitudes.map((sol, i) => {
                                const config = getEstadoConfig(sol.estado);
                                const ageColor = getAgeColor(sol.fechaSolicitud);
                                return (
                                    <div
                                        key={sol.id}
                                        className={`px-4 py-3 ${i > 0 ? "border-t border-gray-100" : ""} pointer-events-auto cursor-pointer hover:bg-gray-50`}
                                        onClick={() => onSelectSolicitud(sol)}
                                    >
                                        <div className="flex items-start gap-3">
                                            {sol.imageUrl ? (
                                                <img
                                                    src={sol.imageUrl}
                                                    alt=""
                                                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                    <FaCar className="text-gray-400" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-gray-800 truncate flex-1">
                                                        {sol.year} {sol.make} {sol.model}
                                                    </p>
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: ageColor.fill }}
                                                        title={ageColor.label}
                                                    ></span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="bg-gray-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                        {sol.source}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${config.bg}`}>
                                                        {config.label}
                                                    </span>
                                                    {ageColor.days !== undefined && (
                                                        <span className="text-[9px] font-medium" style={{ color: ageColor.fill }}>
                                                            {ageColor.days}d
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <FaBarcode className="text-[8px]" /> {sol.lotNumber}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <FaUser className="text-[8px]" /> {sol.clienteNombre || "Sin cliente"}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <FaMapMarkerAlt className="text-[8px]" /> {sol.location || "Sin ubicación"}
                                                    </span>
                                                </div>
                                                {sol.auctionDate && (
                                                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-400">
                                                        <FaGavel className="text-[8px]" /> {sol.auctionDate}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(MapaUSA);
