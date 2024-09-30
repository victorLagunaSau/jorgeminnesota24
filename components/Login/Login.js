import React, {useMemo, useState, useEffect} from "react";
import {motion} from "framer-motion";
import getScrollAnimation from "../../utils/getScrollAnimation";
import ScrollAnimationWrapper from "../Layout/ScrollAnimationWrapper";
import FormLogin from "./FormLogin";
import FormRecuperaContrasena from "./FormRecuperaContrasena";
import FormRegistro from "./FormRegistro";
import {auth} from "../../firebase/firebaseIni";
import Router from "next/router";

const Login001 = () => {
	const scrollAnimation = useMemo(() => getScrollAnimation(), []);
	const [estatusForm, setEstatusForm] = useState(1);

	useEffect(() => {
		const unsubscribe = auth().onAuthStateChanged((user) => {
			if (user) {
				Router.push("/admin");
			}
		});
		return () => unsubscribe();
	}, []);

	return (
		<div className="bg-gradient-to-b h-[1000px] from-gray-100 to-white-500 w-full py-14" id="soporte">
			<div className="flex flex-col w-full my-0 mt-10">
				<ScrollAnimationWrapper>
					<div className="to-white-100 w-full py-14" id="catalogo">
						<motion.h3
							variants={scrollAnimation}
							className="text-2xl sm:text-3xl lg:text-4xl font-medium text-black-100 leading-relaxed w-9/12 sm:w-6/12 lg:w-4/12 mx-auto text-center"
						>
							{estatusForm === 1 ? (
								<div>
									<br/>
									Inicia sesión con tu usuario y contraseña
								</div>
							) : null}
							{estatusForm === 2 ? (
								<div>
									<br/>
									Registrate como distribuidor Pathbooks
								</div>
							) : null}
							{estatusForm === 3 ? (
								<div>
									<br/>
									Recupera tu contraseña
								</div>
							) : null}
						</motion.h3>
						<ScrollAnimationWrapper>
							<motion.h3 variants={scrollAnimation}>
								<div className="flex flex-col w-full my-0 bg-white-500">
									<div className="max-w-screen-xl mt-8 mb-6 sm:mt-14 sm:mb-14 px-6 sm:px-8 lg:px-16 mx-auto ">
										<div className="containerLogin100">
											<div className="wrapLogin100">
												{estatusForm === 1 ? (
													<div>
														<div className="card lg:card-side bg-white-100 shadow-xl">
															<figure className="w-[400px] h-[400px]">
																<img src="/assets/loginForm001.jpg"  alt="Album"/>
															</figure>
															<div className="card-body min-w-[400px] h-[400px]">
																<h2 className="card-title">Iniciar sesión como distribuidor</h2>
																<FormLogin/>
															</div>
														</div>
													</div>
												) : null}
												{estatusForm === 2 ? (
													<div>
														<div className="card lg:card-side bg-white-100 shadow-xl">
															<figure className="w-[400px] h-[400px]">
																<img src="/assets/loginForm001.jpg" alt="Album"/>
															</figure>
															<div className="card-body min-w-[400px] h-[400px]">
																<FormRegistro/>
															</div>
														</div>
													</div>
												) : null}
												{estatusForm === 3 ? (
													<div>
														<div className="card lg:card-side bg-white-100 shadow-xl">
															<figure className="w-[400px] h-[400px]">
																<img src="/assets/loginForm001.jpg" alt="Album"/>
															</figure>
															<div className="card-body min-w-[400px] h-[400px]">
																<h2 className="card-title">Recupera tu contraseña</h2>
																<FormRecuperaContrasena/>
															</div>
														</div>
													</div>
												) : null}
											</div>
											{estatusForm === 1 ? (
												<div>
													<div>
														<p>
															Olvidé mi contraseña:{" "}
															<button className="btn btn-active btn-link" onClick={() => setEstatusForm(3)}>
																Recuperar aquí
															</button>
															No tengo Cuenta:{" "}
															<button className="btn btn-active btn-link" onClick={() => setEstatusForm(2)}>
																Registrarme
															</button>
														</p>
													</div>
												</div>
											) : null}
											{estatusForm === 2 ? (
												<div>
													<div>
														<p>
															Regresar:{" "}
															<button className="btn btn-active btn-link" onClick={() => setEstatusForm(1)}>
																Ir a Iniciar sesión
															</button>
														</p>
													</div>
												</div>
											) : null}
											{estatusForm === 3 ? (
												<div>
													<div>
														<p>
															Regresar:{" "}
															<button className="btn btn-active btn-link" onClick={() => setEstatusForm(1)}>
																Ir a Iniciar sesión
															</button>
														</p>
													</div>
												</div>
											) : null}
										</div>
									</div>
								</div>
							</motion.h3>
						</ScrollAnimationWrapper>
					</div>
				</ScrollAnimationWrapper>
			</div>
		</div>
	);
};

export default Login001;
