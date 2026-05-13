import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { firestore } from "../../../firebase/firebaseIni";

const MapChart = dynamic(() => import("./MapaUSA"), { ssr: false });

const MapaSolicitudes = ({ user }) => {
    const [solicitudes, setSolicitudes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalDetalle, setModalDetalle] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
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

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        const unsubscribe = firestore()
            .collection("solicitudesVehiculos")
            .onSnapshot((snap) => {
                const lista = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(s => s.estado !== "completado" && s.estado !== "asignado" && s.estado !== "en_proceso");
                lista.sort((a, b) => {
                    const fechaA = a.fechaSolicitud?.toDate?.() || new Date(0);
                    const fechaB = b.fechaSolicitud?.toDate?.() || new Date(0);
                    return fechaB - fechaA;
                });
                setSolicitudes(lista);
                setLoading(false);
            }, () => setLoading(false));
        return () => unsubscribe();
    }, [user]);

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

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (solicitudes.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500 text-sm">No hay solicitudes pendientes en el mapa</p>
            </div>
        );
    }

    return (
        <div ref={mapaContainerRef} className="rounded-xl shadow-md border overflow-hidden bg-gray-900 border-gray-700">
            <MapChart
                solicitudes={solicitudes}
                onSelectSolicitud={(sol) => setModalDetalle(sol)}
                getEstadoConfig={getEstadoConfig}
                formatDate={formatDate}
                isFullscreen={isFullscreen}
                toggleFullscreen={toggleFullscreen}
            />
        </div>
    );
};

export default MapaSolicitudes;
