import React, { useState, useCallback, useMemo } from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
    Marker,
    ZoomableGroup,
} from "react-simple-maps";
import { FaPlus, FaMinus, FaCrosshairs, FaTruck, FaMapMarkerAlt } from "react-icons/fa";

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// Coordenadas de ciudades USA [lng, lat]
const CITY_COORDS = {
    "houston": [-95.3698, 29.7604], "dallas": [-96.7970, 32.7767],
    "san antonio": [-98.4936, 29.4241], "austin": [-97.7431, 30.2672],
    "fort worth": [-97.3308, 32.7555], "el paso": [-106.4850, 31.7619],
    "mcallen": [-98.2300, 26.2034], "corpus christi": [-97.3964, 27.8006],
    "lubbock": [-101.8313, 33.5779], "amarillo": [-101.8313, 35.2220],
    "laredo": [-99.5075, 27.5036], "beaumont": [-94.1266, 30.0802],
    "temple": [-97.3428, 31.0982], "wilmer": [-96.6850, 32.5890],
    "los angeles": [-118.2437, 34.0522], "san diego": [-117.1611, 32.7157],
    "san jose": [-121.8863, 37.3382], "san francisco": [-122.4194, 37.7749],
    "fresno": [-119.7871, 36.7378], "sacramento": [-121.4944, 38.5816],
    "bakersfield": [-119.0187, 35.3733], "riverside": [-117.3961, 33.9533],
    "miami": [-80.1918, 25.7617], "orlando": [-81.3789, 28.5383],
    "tampa": [-82.4572, 27.9506], "jacksonville": [-81.6557, 30.3322],
    "fort lauderdale": [-80.1373, 26.1224], "west palm beach": [-80.0534, 26.7153],
    "atlanta": [-84.3880, 33.7490], "savannah": [-81.0998, 32.0809],
    "phoenix": [-112.0740, 33.4484], "tucson": [-110.9747, 32.2226],
    "charlotte": [-80.8431, 35.2271], "raleigh": [-78.6382, 35.7796],
    "charleston": [-79.9311, 32.7765], "columbia": [-81.0348, 34.0007],
    "nashville": [-86.7816, 36.1627], "memphis": [-90.0490, 35.1495],
    "birmingham": [-86.8025, 33.5207], "montgomery": [-86.3001, 32.3668],
    "new orleans": [-90.0715, 29.9511], "baton rouge": [-91.1871, 30.4515],
    "oklahoma city": [-97.5164, 35.4676], "tulsa": [-95.9928, 36.1540],
    "denver": [-104.9903, 39.7392], "colorado springs": [-104.8214, 38.8339],
    "chicago": [-87.6298, 41.8781], "columbus": [-82.9988, 39.9612],
    "cleveland": [-81.6944, 41.4993], "philadelphia": [-75.1652, 39.9526],
    "pittsburgh": [-79.9959, 40.4406], "new york": [-74.0060, 40.7128],
    "detroit": [-83.0458, 42.3314], "indianapolis": [-86.1581, 39.7684],
    "milwaukee": [-87.9065, 43.0389], "minneapolis": [-93.2650, 44.9778],
    "st louis": [-90.1994, 38.6270], "kansas city": [-94.5786, 39.0997],
    "las vegas": [-115.1398, 36.1699], "salt lake city": [-111.8910, 40.7608],
    "portland or": [-122.6765, 45.5152], "seattle": [-122.3321, 47.6062],
    "richmond": [-77.4360, 37.5407], "baltimore": [-76.6122, 39.2904],
    "boston": [-71.0589, 42.3601], "albuquerque": [-106.6504, 35.0844],
    "little rock": [-92.2896, 34.7465], "louisville": [-85.7585, 38.2527],
    "omaha": [-95.9345, 41.2565], "wichita": [-97.3375, 37.6872],
    "brownsville": [-97.4975, 25.9017],
};

// Coordenadas centrales por estado (fallback)
const STATE_CENTER = {
    'Texas': [-99.90, 31.97], 'California': [-119.42, 36.78], 'Florida': [-81.52, 27.66],
    'Arizona': [-111.09, 34.05], 'Nevada': [-116.42, 38.80], 'Georgia': [-83.64, 32.17],
    'North Carolina': [-79.02, 35.76], 'South Carolina': [-81.16, 33.84], 'Tennessee': [-86.58, 35.52],
    'Alabama': [-86.90, 32.32], 'Louisiana': [-91.96, 30.98], 'Mississippi': [-89.40, 32.35],
    'Oklahoma': [-97.09, 35.47], 'Arkansas': [-92.37, 34.75], 'New Mexico': [-105.87, 34.52],
    'Colorado': [-105.78, 39.55], 'Illinois': [-89.40, 40.63], 'Ohio': [-82.91, 40.42],
    'Pennsylvania': [-77.19, 41.20], 'New York': [-74.22, 43.30], 'New Jersey': [-74.41, 40.06],
    'Michigan': [-84.54, 44.31], 'Indiana': [-86.13, 40.27], 'Wisconsin': [-89.62, 43.78],
    'Minnesota': [-94.69, 46.73], 'Iowa': [-93.10, 41.88], 'Missouri': [-91.83, 37.96],
    'Kansas': [-98.48, 39.01], 'Nebraska': [-99.90, 41.49], 'Utah': [-111.09, 39.32],
    'Oregon': [-120.55, 43.80], 'Washington': [-120.74, 47.75], 'Virginia': [-78.66, 37.43],
    'Kentucky': [-84.27, 37.84], 'Maryland': [-76.64, 39.05], 'Massachusetts': [-71.38, 42.41],
};

const CITY_KEYS_SORTED = Object.keys(CITY_COORDS).sort((a, b) => b.length - a.length);

function getVehicleCoords(ciudad, estado) {
    if (ciudad) {
        const ciudadLower = ciudad.toLowerCase().trim();
        for (const city of CITY_KEYS_SORTED) {
            if (ciudadLower.includes(city) || city.includes(ciudadLower)) {
                return CITY_COORDS[city];
            }
        }
    }
    if (estado && STATE_CENTER[estado]) {
        return STATE_CENTER[estado];
    }
    return null;
}

// Brownsville (destino)
const BROWNSVILLE = [-97.4975, 25.9017];
const DEFAULT_CENTER = [-97, 35];
const DEFAULT_ZOOM = 1;

const MapaChofer = ({ vehiculos }) => {
    const [zoom, setZoom] = useState(DEFAULT_ZOOM);
    const [center, setCenter] = useState(DEFAULT_CENTER);
    const [selectedPin, setSelectedPin] = useState(null);

    const handleZoomIn = useCallback(() => setZoom(prev => Math.min(prev * 1.5, 8)), []);
    const handleZoomOut = useCallback(() => setZoom(prev => Math.max(prev / 1.5, 1)), []);
    const handleReset = useCallback(() => { setZoom(DEFAULT_ZOOM); setCenter(DEFAULT_CENTER); }, []);

    const markers = useMemo(() => {
        const grouped = {};
        vehiculos.forEach(v => {
            const coords = getVehicleCoords(v.ciudad, v.estado);
            if (!coords) return;
            const key = coords.join(",");
            if (!grouped[key]) {
                grouped[key] = { coords, vehiculos: [], label: v.ciudad || v.estado || "?" };
            }
            grouped[key].vehiculos.push(v);
        });
        return Object.values(grouped);
    }, [vehiculos]);

    if (vehiculos.length === 0) {
        return (
            <div className="bg-gray-800 rounded-xl p-8 text-center">
                <FaMapMarkerAlt className="text-3xl text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No hay vehículos con ubicación</p>
            </div>
        );
    }

    return (
        <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-gray-700 h-full min-h-[400px]">
            {/* Controles */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
                <button onClick={handleZoomIn} className="w-8 h-8 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center text-gray-300 hover:text-green-400 transition-colors">
                    <FaPlus size={12} />
                </button>
                <button onClick={handleZoomOut} className="w-8 h-8 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center text-gray-300 hover:text-green-400 transition-colors">
                    <FaMinus size={12} />
                </button>
                <button onClick={handleReset} className="w-8 h-8 bg-gray-700 rounded-lg border border-gray-600 flex items-center justify-center text-gray-300 hover:text-green-400 transition-colors">
                    <FaCrosshairs size={12} />
                </button>
            </div>

            {/* Leyenda */}
            <div className="absolute top-3 left-3 z-10 bg-gray-800/90 rounded-lg px-3 py-2 border border-gray-700">
                <div className="flex items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-gray-400">Pendiente</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-400">Levantado</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500" style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}></div>
                        <span className="text-gray-400">Destino</span>
                    </div>
                </div>
            </div>

            <ComposableMap
                projection="geoAlbersUsa"
                projectionConfig={{ scale: 1000 }}
                style={{ width: "100%", height: "auto", aspectRatio: "960/600" }}
            >
                <ZoomableGroup zoom={zoom} center={center} onMoveEnd={(pos) => { if (pos?.coordinates) setCenter(pos.coordinates); if (pos?.zoom) setZoom(pos.zoom); }}>
                    <Geographies geography={GEO_URL}>
                        {({ geographies }) =>
                            geographies.map(geo => (
                                <Geography
                                    key={geo.rsmKey}
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

                    {/* Destino: Brownsville */}
                    <Marker coordinates={BROWNSVILLE}>
                        <polygon
                            points="0,-8 -6,4 6,4"
                            fill="#ef4444"
                            stroke="#fff"
                            strokeWidth={1}
                        />
                        <text textAnchor="middle" y={14} style={{ fontSize: 8, fill: "#ef4444", fontWeight: 800 }}>
                            BROWNSVILLE
                        </text>
                    </Marker>

                    {/* Vehículos */}
                    {markers.map((marker, i) => {
                        const todosLevantados = marker.vehiculos.every(v => v.levantado);
                        const algunoLevantado = marker.vehiculos.some(v => v.levantado);
                        const color = todosLevantados ? "#22c55e" : algunoLevantado ? "#3b82f6" : "#f59e0b";

                        return (
                            <Marker
                                key={i}
                                coordinates={marker.coords}
                                onClick={() => setSelectedPin(selectedPin === i ? null : i)}
                            >
                                <circle
                                    r={marker.vehiculos.length > 1 ? 7 : 5}
                                    fill={color}
                                    stroke="#fff"
                                    strokeWidth={1.5}
                                    style={{ cursor: "pointer" }}
                                />
                                {marker.vehiculos.length > 1 && (
                                    <text textAnchor="middle" y={3.5} style={{ fontSize: 7, fill: "#fff", fontWeight: 900 }}>
                                        {marker.vehiculos.length}
                                    </text>
                                )}
                                <text textAnchor="middle" y={-10} style={{ fontSize: 7, fill: "#9ca3af", fontWeight: 600 }}>
                                    {marker.label}
                                </text>
                            </Marker>
                        );
                    })}
                </ZoomableGroup>
            </ComposableMap>

            {/* Tooltip del pin seleccionado */}
            {selectedPin !== null && markers[selectedPin] && (
                <div className="absolute bottom-3 left-3 right-3 z-20 bg-gray-800 border border-gray-600 rounded-xl p-3 max-h-40 overflow-y-auto">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1">
                            <FaMapMarkerAlt className="text-red-500" /> {markers[selectedPin].label}
                        </span>
                        <button onClick={() => setSelectedPin(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
                    </div>
                    <div className="space-y-1.5">
                        {markers[selectedPin].vehiculos.map((v, vi) => (
                            <div key={vi} className="flex items-center gap-2 text-[11px]">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${v.levantado ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                <span className="text-gray-300 font-mono">#{v.lote}</span>
                                <span className="text-gray-400 truncate">{v.marca} {v.modelo}</span>
                                <span className="text-gray-500 truncate ml-auto">{v.clienteAlt || v.clienteNombre || ''}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapaChofer;
