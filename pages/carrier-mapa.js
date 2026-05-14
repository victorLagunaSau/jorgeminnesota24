import React, { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { useAuthContext } from "../context/auth";
import { firestore } from "../firebase/firebaseIni";
import { FaArrowLeft, FaExpand, FaCompress } from "react-icons/fa";

const MapChart = dynamic(() => import("../components/features/solicitudes/MapaUSA"), { ssr: false });

const US_STATES_MAP = {
    'TX': 'Texas', 'CA': 'California', 'FL': 'Florida', 'AZ': 'Arizona',
    'NV': 'Nevada', 'GA': 'Georgia', 'NC': 'North Carolina', 'SC': 'South Carolina',
    'TN': 'Tennessee', 'AL': 'Alabama', 'LA': 'Louisiana', 'MS': 'Mississippi',
    'OK': 'Oklahoma', 'AR': 'Arkansas', 'NM': 'New Mexico', 'CO': 'Colorado',
    'IL': 'Illinois', 'OH': 'Ohio', 'PA': 'Pennsylvania', 'NY': 'New York',
    'NJ': 'New Jersey', 'MI': 'Michigan', 'IN': 'Indiana', 'WI': 'Wisconsin',
    'MN': 'Minnesota', 'IA': 'Iowa', 'MO': 'Missouri', 'KS': 'Kansas',
    'NE': 'Nebraska', 'SD': 'South Dakota', 'ND': 'North Dakota', 'MT': 'Montana',
    'WY': 'Wyoming', 'UT': 'Utah', 'ID': 'Idaho', 'WA': 'Washington',
    'OR': 'Oregon', 'VA': 'Virginia', 'WV': 'West Virginia', 'KY': 'Kentucky',
    'MD': 'Maryland', 'DE': 'Delaware', 'CT': 'Connecticut', 'RI': 'Rhode Island',
    'MA': 'Massachusetts', 'VT': 'Vermont', 'NH': 'New Hampshire', 'ME': 'Maine',
    'HI': 'Hawaii', 'AK': 'Alaska'
};

const CarrierMapaPage = () => {
    const { user, loading, isEmpresa } = useAuthContext();
    const [solicitudes, setSolicitudes] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [estadosAutorizados, setEstadosAutorizados] = useState(null);
    const mapaContainerRef = useRef(null);

    const toggleFullscreen = useCallback(() => {
        if (!mapaContainerRef.current) return;
        if (!document.fullscreenElement) {
            mapaContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    }, []);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    }, []);

    // Cargar estados autorizados de la empresa
    useEffect(() => {
        if (!user) return;
        const unsubscribe = firestore()
            .collection("empresas")
            .doc(user.id)
            .onSnapshot((doc) => {
                setEstadosAutorizados(doc.exists ? (doc.data().estadosAutorizados || []) : []);
            });
        return () => unsubscribe();
    }, [user]);

    const locationEnEstadoAutorizado = useCallback((location) => {
        if (!estadosAutorizados || estadosAutorizados.length === 0) return true;
        if (!location) return false;
        const match = location.match(/\b([A-Z]{2})\b/);
        if (match && US_STATES_MAP[match[1]]) return estadosAutorizados.includes(match[1]);
        for (const code of estadosAutorizados) {
            if (US_STATES_MAP[code] && location.toLowerCase().includes(US_STATES_MAP[code].toLowerCase())) return true;
        }
        return false;
    }, [estadosAutorizados]);

    useEffect(() => {
        if (!user || estadosAutorizados === null) { setLoadingData(estadosAutorizados === null); return; }
        const unsubscribe = firestore()
            .collection("solicitudesVehiculos")
            .onSnapshot((snap) => {
                const lista = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(s => s.estado !== "completado" && s.estado !== "asignado" && s.estado !== "en_proceso")
                    .filter(s => locationEnEstadoAutorizado(s.location));
                lista.sort((a, b) => {
                    const fechaA = a.fechaSolicitud?.toDate?.() || new Date(0);
                    const fechaB = b.fechaSolicitud?.toDate?.() || new Date(0);
                    return fechaB - fechaA;
                });
                setSolicitudes(lista);
                setLoadingData(false);
            }, () => setLoadingData(false));
        return () => unsubscribe();
    }, [user, locationEnEstadoAutorizado]);

    const getEstadoConfig = (estado) => {
        const config = {
            pendiente: { bg: "bg-amber-500", label: "Pendiente" },
            asignado: { bg: "bg-indigo-500", label: "Asignado" },
            en_proceso: { bg: "bg-blue-500", label: "En Proceso" },
            completado: { bg: "bg-green-500", label: "Completado" }
        };
        return config[estado] || config.pendiente;
    };

    const formatDate = (timestamp, includeTime = false) => {
        if (!timestamp) return "-";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return String(timestamp);
        const opts = { day: "numeric", month: "short", year: "numeric" };
        if (includeTime) { opts.hour = "2-digit"; opts.minute = "2-digit"; }
        return date.toLocaleDateString("es-MX", opts);
    };

    if (loading) return (
        <div className="h-screen flex justify-center items-center bg-gray-900">
            <span className="loading loading-ring loading-lg text-red-600"></span>
        </div>
    );

    if (!user || !isEmpresa) return (
        <div className="h-screen flex flex-col justify-center items-center bg-gray-900 gap-4">
            <p className="text-gray-400 text-sm">Inicia sesión como carrier</p>
            <a href="/carriers" className="text-red-500 font-bold text-sm underline">Volver</a>
        </div>
    );

    if (loadingData) return (
        <div className="h-screen flex justify-center items-center bg-gray-900">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
    );

    return (
        <div ref={mapaContainerRef} className="min-h-screen bg-gray-900 flex flex-col">
            <Head><title>Mapa Solicitudes | Jorge Minnesota INC</title></Head>

            {/* Header mínimo */}
            <header className="flex items-center gap-3 px-4 py-3 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                <a href="/carriers" className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors">
                    <FaArrowLeft size={16} />
                </a>
                <div className="flex-1">
                    <h1 className="text-sm font-black text-white uppercase tracking-tight">
                        Mapa de Solicitudes
                    </h1>
                    <p className="text-[10px] text-gray-500">
                        {solicitudes.length} solicitudes pendientes
                    </p>
                </div>
            </header>

            {/* Mapa completo */}
            <div className="flex-1">
                <MapChart
                    solicitudes={solicitudes}
                    onSelectSolicitud={() => {}}
                    getEstadoConfig={getEstadoConfig}
                    formatDate={formatDate}
                    isFullscreen={isFullscreen}
                    toggleFullscreen={toggleFullscreen}
                />
            </div>
        </div>
    );
};

export default CarrierMapaPage;
