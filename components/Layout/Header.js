import React, {useState, useEffect} from "react";
import Link from "next/link";
import {Link as LinkScroll} from "react-scroll";
import {useRouter} from "next/router";
import {auth} from "../../firebase/firebaseIni";

const Header = () => {
    const [activeLink, setActiveLink] = useState(null);
    const [scrollActive, setScrollActive] = useState(false);
    const [user, setUser] = useState(null); // Nuevo estado para almacenar la información del usuario
    const router = useRouter();

    const salir = () => {
        auth().signOut();
    }

    useEffect(() => {
        let isMounted = true; // Variable para rastrear si el componente está montado

        const unsubscribe = auth().onAuthStateChanged((user) => {
            if (isMounted) {
                setUser(user);
            }
        });
        window.addEventListener("scroll", () => {
            setScrollActive(window.scrollY > 20);
        });
        const {pathname} = router;
        if (pathname.includes("/")) {
            setActiveLink("inicio");
        } else if (pathname.includes("/servicios")) {
            setActiveLink("servicios");
        } else if (pathname.includes("/admin")) {
            setActiveLink("admin");
        } else if (pathname.includes("/login")) {
            setActiveLink("login");
        } else {
            setActiveLink("inicio");
        }
        return () => {
            window.removeEventListener("scroll", () => {
                setScrollActive(window.scrollY > 20);
            });
            unsubscribe();
        };
    }, [router.pathname]);

    return (
        <>
            <header
                className={
                    "fixed top-0 w-full  z-30 bg-white-500 transition-all " +
                    (scrollActive ? " shadow-md pt-0" : " pt-4")
                }
            >
                <nav className="max-w-screen-xl px-6 sm:px-8 lg:px-16 mx-auto grid grid-flow-col py-3 sm:py-4">
                    <div className="col-start-1 col-end-2 flex items-center">
                        <img src="/assets/Logo.png" className="w-auto" alt=""/>
                    </div>
                    <ul className="hidden lg:flex col-start-4 col-end-8 text-black-500  items-center">
                        <Link href="/">
                            <a
                                onClick={() => setActiveLink("inicio")}
                                className={`px-4 py-2 mx-2 cursor-pointer animation-hover inline-block relative ${
                                    activeLink === "inicio"
                                        ? "text-primary animation-active"
                                        : "text-black-500 hover:text-primary"
                                }`}
                            >
                                Inicio
                            </a>
                        </Link>
                        <LinkScroll
                            activeClass="active"
                            to="serch"
                            spy={true}
                            smooth={true}
                            duration={1000}
                            onSetActive={() => {
                                setActiveLink("serch");
                            }}
                            className={
                                "px-4 py-2 mx-2 cursor-pointer animation-hover inline-block relative" +
                                (activeLink === "serch"
                                    ? " text-orange-500 animation-active "
                                    : " text-black-500 hover:text-orange-500 a")
                            }
                        >
                            Buscar
                        </LinkScroll>
                        <LinkScroll
                            activeClass="active"
                            to="cobertura"
                            spy={true}
                            smooth={true}
                            duration={1000}
                            onSetActive={() => {
                                setActiveLink("cobertura");
                            }}
                            className={
                                "px-4 py-2 mx-2 cursor-pointer animation-hover inline-block relative" +
                                (activeLink === "cobertura"
                                    ? " text-orange-500 animation-active "
                                    : " text-black-500 hover:text-orange-500 a")
                            }
                        >
                            Cobertura
                        </LinkScroll>
                        {/*<Link href="/servicios">*/}
                        {/*    <a*/}
                        {/*        onClick={() => setActiveLink("servicios")}*/}
                        {/*        className={`px-4 py-2 mx-2 cursor-pointer animation-hover inline-block relative ${*/}
                        {/*            activeLink === "servicios"*/}
                        {/*                ? "text-primary animation-active"*/}
                        {/*                : "text-black-500 hover:text-primary"*/}
                        {/*        }`}*/}
                        {/*    >*/}
                        {/*        Servicios*/}
                        {/*    </a>*/}
                        {/*</Link>*/}


                    </ul>
                    <div className="col-start-10 col-end-12 font-medium flex justify-end items-center">
                        {user && (
                            <Link href="/admin">
                                <a
                                    onClick={() => setActiveLink("admin")}
                                    className={`px-4 py-2 mx-2 cursor-pointer animation-hover inline-block relative ${
                                        activeLink === "admin"
                                            ? "text-primary animation-active"
                                            : "text-black-500 hover:text-primary"
                                    }`}
                                >
                                    Administrar
                                </a>
                            </Link>
                        )}
                        {user ? (
                            <Link href="/">
                                <a
                                    onClick={() => {
                                        setActiveLink("logout");
                                        salir();
                                    }}
                                    className="font-medium tracking-wide py-2 px-5 sm:px-8 border border-primary text-white-500 bg-primary outline-none rounded-l-full rounded-r-full capitalize hover:bg-white-500 hover:text-primary transition-all hover:shadow-primary"
                                >
                                    Salir
                                </a>
                            </Link>

                        ) : (
                            <div/>
                            // <Link href="/login">
                            //     <a
                            //         onClick={() => setActiveLink("login")}
                            //         className="font-medium tracking-wide py-2 px-5 sm:px-8 border border-primary text-white-500 bg-primary outline-none rounded-l-full rounded-r-full capitalize hover:bg-white-500 hover:text-primary transition-all hover:shadow-primary"
                            //     >
                            //         Iniciar
                            //     </a>
                            // </Link>
                        )}
                    </div>
                </nav>
            </header>
            {/* Navegación móvil */}

            <nav className="fixed lg:hidden bottom-0 left-0 right-0 z-20 px-4 sm:px-8 shadow-t ">
                <div className="bg-white-500 sm:px-3">
                    <ul className="flex w-full justify-between items-center text-black-500">
                        <Link href="/">
                            <a
                                onClick={() => setActiveLink("admin")}
                                className={
                                    "mx-1 sm:mx-2 px-3 sm:px-4 py-2 flex flex-col items-center text-xs border-t-2 transition-all " +
                                    (activeLink === "admin"
                                        ? "bg-blue-100 border-primary text-primary"
                                        : "border-transparent")
                                }
                            >
                                {/*<img*/}
                                {/*	src="/assets/Icon/headerMarca.png"*/}
                                {/*	alt="Icono"*/}
                                {/*	style={{width: "28px", height: "28px"}}*/}
                                {/*/>*/}
                                Inicio
                            </a>
                        </Link>
                        <LinkScroll
                            activeClass="active"
                            to="serch"
                            spy={true}
                            smooth={true}
                            duration={1000}
                            onSetActive={() => {
                                setActiveLink("serch");
                            }}
                            className={
                                "mx-1 sm:mx-2 px-3 sm:px-4 py-2 flex flex-col items-center text-xs border-t-2 transition-all " +
                                (activeLink === "serch"
                                    ? "  border-orange-500 text-orange-500"
                                    : " border-transparent ")
                            }
                        >
                            {/*<svg*/}
                            {/*    className="w-6 h-6"*/}
                            {/*    fill="none"*/}
                            {/*    stroke="currentColor"*/}
                            {/*    viewBox="0 0 24 24"*/}
                            {/*    xmlns="http://www.w3.org/2000/svg"*/}
                            {/*>*/}
                            {/*    <path*/}
                            {/*        strokeLinecap="round"*/}
                            {/*        strokeLinejoin="round"*/}
                            {/*        strokeWidth={2}*/}
                            {/*        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"*/}
                            {/*    />*/}
                            {/*</svg>*/}
                            Buscar
                        </LinkScroll>
                        <LinkScroll
                            activeClass="active"
                            to="cobertura"
                            spy={true}
                            smooth={true}
                            duration={1000}
                            onSetActive={() => {
                                setActiveLink("cobertura");
                            }}
                            className={
                                "mx-1 sm:mx-2 px-3 sm:px-4 py-2 flex flex-col items-center text-xs border-t-2 transition-all " +
                                (activeLink === "cobertura"
                                    ? "  border-orange-500 text-orange-500"
                                    : " border-transparent ")
                            }
                        >
                            {/*<svg*/}
                            {/*    className="w-6 h-6"*/}
                            {/*    fill="none"*/}
                            {/*    stroke="currentColor"*/}
                            {/*    viewBox="0 0 24 24"*/}
                            {/*    xmlns="http://www.w3.org/2000/svg"*/}
                            {/*>*/}
                            {/*    <path*/}
                            {/*        strokeLinecap="round"*/}
                            {/*        strokeLinejoin="round"*/}
                            {/*        strokeWidth={2}*/}
                            {/*        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"*/}
                            {/*    />*/}
                            {/*</svg>*/}
                            Cobertura
                        </LinkScroll>

                    </ul>
                </div>
            </nav>
            {/* Fin de la navegación móvil */}
        </>
    );
};

export default Header;
