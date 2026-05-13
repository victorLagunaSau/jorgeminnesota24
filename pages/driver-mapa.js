import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import { firestore } from "../firebase/firebaseIni";
import { COLLECTIONS } from "../constants";
import { FaArrowLeft } from "react-icons/fa";

const MapaChofer = dynamic(() => import("../components/features/viajes/MapaChofer"), { ssr: false });

const SESSION_KEY = "driver_session";

const DriverMapaPage = () => {
    const [chofer, setChofer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [vehiculos, setVehiculos] = useState([]);

    // Restaurar sesión del chofer
    useEffect(() => {
        try {
            const saved = localStorage.getItem(SESSION_KEY);
            if (saved) setChofer(JSON.parse(saved));
        } catch (_) {}
        setLoading(false);
    }, []);

    // Cargar vehículos pendientes del chofer
    useEffect(() => {
        if (!chofer) return;

        const unsubscribe = firestore()
            .collection(COLLECTIONS.VIAJES_PENDIENTES)
            .onSnapshot((snap) => {
                const lista = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(v => v.chofer?.id === chofer.id);

                const todos = [];
                lista.forEach(viaje => {
                    (viaje.vehiculos || []).forEach(v => {
                        todos.push({ ...v, viajeId: viaje.id });
                    });
                });
                setVehiculos(todos);
            });

        return () => unsubscribe();
    }, [chofer]);

    if (loading) return (
        <div className="h-screen flex justify-center items-center bg-gray-900">
            <span className="loading loading-ring loading-lg text-red-600"></span>
        </div>
    );

    if (!chofer) return (
        <div className="h-screen flex flex-col justify-center items-center bg-gray-900 gap-4">
            <p className="text-gray-400 text-sm">Sesión no encontrada</p>
            <Link href="/driver">
                <a className="text-red-500 font-bold text-sm underline">Volver al login</a>
            </Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col safe-area-top safe-area-bottom">
            <Head><title>Mapa | {chofer.nombreChofer}</title></Head>

            {/* Header mínimo */}
            <header className="flex items-center gap-3 px-4 py-3 bg-gray-800 border-b border-gray-700">
                <Link href="/driver">
                    <a className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors">
                        <FaArrowLeft size={16} />
                    </a>
                </Link>
                <div className="flex-1">
                    <h1 className="text-sm font-black text-white uppercase tracking-tight">
                        Mis Vehículos
                    </h1>
                    <p className="text-[10px] text-gray-500">
                        {chofer.nombreChofer} · {vehiculos.filter(v => !v.levantado).length} pendientes · {vehiculos.filter(v => v.levantado).length} levantados
                    </p>
                </div>
            </header>

            {/* Mapa a pantalla completa */}
            <div className="flex-1">
                <MapaChofer vehiculos={vehiculos} />
            </div>
        </div>
    );
};

export default DriverMapaPage;
