import React, {useState} from "react";
import {useRouter} from "next/router";
import { useAuthContext } from "../context/auth";
import ConsultaMisViajes from "../components/features/viajes/ConsultaMisViajes";
import SeoHead from "../components/marketing/SeoHead";

const MisViajes = () => {
    const router = useRouter();
    const { user, loading, isAdmin, isChofer, signIn, signOut } = useAuthContext();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // Solo admin o chofer pueden acceder
    const hasAccess = isAdmin || isChofer;

    // Si está logueado pero no tiene acceso, hacer logout
    if (user && !hasAccess) {
        signOut();
        router.push("/");
        return null;
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signIn(username, password);
            setLoginError('');
        } catch (error) {
            console.error("Error logging in:", error);
            setLoginError('Usuario o contraseña incorrectos');
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex justify-center items-center">
                <span className="loading loading-ring loading-lg text-red-600"></span>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-4 bg-primary min-h-screen flex flex-col items-center">
                <img src="/assets/LogoW.png" className="w-auto m-5" alt=""/>
                <div className="flex items-center justify-center w-full">
                    <div className="bg-gray-300 p-6 rounded-lg shadow-md w-full max-w-md">
                        <h2 className="text-2xl font-bold text-black-500 mb-4">Iniciar Sesión</h2>
                        {loginError && <p className="text-red-500 mb-4">{loginError}</p>}
                        <form onSubmit={handleLogin}>
                            <div className="mb-4">
                                <label className="block text-black-500 ">Usuario</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-black-500">Contraseña</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-white-500 text-white py-2 rounded-lg text-black-500 shadow-md"
                            >
                                Iniciar Sesión
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <SeoHead title='Viajes - Jorge Minnesota Logistic LLC'/>
            <ConsultaMisViajes user={user}/>
        </div>
    );
};

export default MisViajes;
