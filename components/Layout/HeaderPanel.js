import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const HeaderPanel = ({ user, onLogout }) => {
    const [activeLink, setActiveLink] = useState("inicio");
    const router = useRouter();

    useEffect(() => {
        const { pathname } = router;
        if (pathname === "/") {
            setActiveLink("inicio");
        } else if (pathname.includes("/admin")) {
            setActiveLink("admin");
        } else {
            setActiveLink("");
        }
    }, [router.pathname]);

    return (
        <header className="fixed top-0 w-full z-30 bg-white-500 transition-all shadow-lg ">
            <div className="max-w-screen-xl mx-auto flex justify-between items-center py-3 sm:py-4 px-6 sm:px-8 lg:px-16">
                <div className="flex items-center">
                    <img src="/assets/Logo.png" className="w-auto h-10" alt="Logo" />
                </div>
                <nav className="flex-grow flex items-center justify-between">
                    <ul className="hidden lg:flex text-black-500 items-center">
                        <li>
                            <Link href="/">
                                <a
                                    onClick={() => setActiveLink("inicio")}
                                    className={`px-4 py-2 mx-2 cursor-pointer animation-hover inline-block relative ${
                                        activeLink === "inicio"
                                            ? "text-primary animation-active"
                                            : "text-black-500 hover:text-primary"
                                    }`}
                                >
                                    Home
                                </a>
                            </Link>
                        </li>
                    </ul>
                    <div className="font-medium flex justify-end items-center">
                        <span className="mr-4 text-black-500">Hola <strong>{user?.nombre}</strong> </span>
                        <button onClick={onLogout} className="btn btn-outline btn-error">
                            Salir
                        </button>
                    </div>
                </nav>
            </div>
        </header>
    );
};

export default HeaderPanel;
