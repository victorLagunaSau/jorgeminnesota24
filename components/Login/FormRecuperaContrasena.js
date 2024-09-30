import React, {useState} from 'react';
import {auth} from "../../firebase/firebaseIni";

const FormRecuperaContrasena = () => {
	const [email, setEmail] = useState('');
	const [emailError, setEmailError] = useState('');
	const [authenticationError, setAuthenticationdError] = useState('');
	const handleEmailChange = (e) => {
		setEmail(e.target.value);
		setEmailError('');
	};
	const handleSubmit = (e) => {
		e.preventDefault();

		// Validación del correo electrónico
		if (!email.trim()) {
			setEmailError('El correo electrónico es requerido'); // Mostrar la alerta
			setTimeout(() => {
				setEmailError(false);
			}, 2000);
			return;
		}
		// Validación del formato del correo electrónico
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			setEmailError('Ingresa un correo electrónico válido');
			setTimeout(() => {
				setEmailError(false);
			}, 2000);
			return;
		}
		// Autenticación con Firebase
		auth().sendPasswordResetEmail(email)
			.catch(error => {
				if (error.code === "auth/invalid-email") {
					setAuthenticationdError('Email no valido, Verifica tu email');
				}
				if (error.code === "auth/user-not-found") {
					setAuthenticationdError('Ingresa un email registrado');
				}
			});
	};

	return (
		<form onSubmit={handleSubmit} className="login-form">
			{emailError &&
			<div className="toast toast-top toast-center " style={{marginTop: '200px'}}>
				<div className="alert alert-warning text-black-500">
					<svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
					</svg>
					<span>{emailError}.</span>
				</div>
			</div>
			}
			{authenticationError &&
			<div className="toast toast-top toast-center " style={{marginTop: '200px'}}>
				<div className="alert alert-warning text-black-500">
					<svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
					</svg>
					<span>{authenticationError}.</span>
				</div>
			</div>}
			<div className="form-group">
				<input
					type="email"
					id="email"
					value={email}
					onChange={handleEmailChange}
					className="input input-bordered input-primary w-full max-w-xs bg-white-100 text-black-500"
					placeholder="Ingresa tu email"
				/>
			</div>
			<br/>
			<button className="font-medium tracking-wide py-2 px-5 sm:px-8 border border-primary text-primary bg-white-500 outline-none rounded-l-full rounded-r-full capitalize hover:bg-primary hover:text-white-500 transition-all hover:shadow-orange " type="submit">Recuperar Contraseña</button>
		</form>
	);
};
export default FormRecuperaContrasena;
