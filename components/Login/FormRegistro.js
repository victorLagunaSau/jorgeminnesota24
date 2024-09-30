import React, {useState} from 'react';
import {auth, firestore} from "../../firebase/firebaseIni";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import Moment from 'moment';

const FormRegistro = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [telefono, setTelefono] = useState('');
    const [contactoDos, setContactoDos] = useState('');
    const [telefonoDos, setTelefonoDos] = useState('');

    const [formError, setFormError] = useState('');

    const showError = (errorMessage) => {
        setFormError(errorMessage);
        setTimeout(() => {
            setFormError('');
        }, 4000);
    };

    const showToast = (message) => (
        <div className="toast toast-top toast-center" style={{marginTop: '200px'}}>
            <div className="alert alert-warning text-black-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none"
                     viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <span>{message}.</span>
            </div>
        </div>
    );

    const handleInputChange = (setState, value) => {
        setState(value);
        setFormError('');
    };

    const onFinish = async (values) => {
        const {
            email, password, nombre, telefono, contactoDos, telefonoDos
        } = values;

        if (!email || !password || !nombre || !telefono) {
            showError('Todos los campos son obligatorios');
            return;
        }
        console.log(email, password, nombre, telefono, contactoDos, telefonoDos)
        try {
            const res = await auth().createUserWithEmailAndPassword(email, password);
            if (res.user.uid) {
                await auth().currentUser.updateProfile({
                    displayName: nombre,
                });
                console.log(res.user.uid)
                console.log(email, password, nombre, telefono, contactoDos, telefonoDos)
                await firestore().collection('users').doc(res.user.uid).set({
                    admin: false,
                    tipo: "chofer",
                    email,
                    id: res.user.uid,
                    nombre: nombre,
                    telefono: telefono,
                    telefonoDos: telefonoDos,
                    contactoDos: contactoDos,
                    photoURL: null,
                    timestamp: Moment().toDate(),
                    username: nombre,
                });
                console.log('Datos guardados correctamente en Firestore.');

                // Restablecer los campos del formulario después de un registro exitoso
                setEmail('');
                setPassword('');
                setNombre('');
                setTelefono('');
                setTelefonoDos('');
                setContactoDos('');
            }
        } catch (error) {
            // Manejar errores de autenticación aquí
            if (error.code === 'auth/invalid-email') {
                showError('Email no válido, verifica tu email');
                setStep(1)
            }
            if (error.code === 'auth/email-already-in-use') {
                showError('La dirección de correo electrónico ya está en uso, si ya tienes una cuenta inicia sesión');
                setStep(1)
            }
            if (error.code === 'auth/weak-password') {
                showError('Tu contraseña debe tener al menos 6 caracteres, verifica tu contraseña');
                setStep(1)
            }
        }
    };

    const handleStepNext = () => {
        if (step === 1) {
            if (!email) {
                showError('El campo email es obligatorio');
            } else if (!password) {
                showError('El campo password es obligatorio');
            } else {
                setStep(2);
            }
        } else if (step === 2) {
            if (!nombre) {
                showError('El campo nombre es obligatorio');
            } else if (!telefono) {
                showError('El campo teléfono es obligatorio');
            } else {
                setStep(3);
            }
        } else if (step === 3) {
            setStep(4);
        }
    };

    const handleStepBack = () => {
        setStep(step - 1)
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onFinish({
            email, password, nombre, telefono, contactoDos, telefonoDos
        });
    };

    return (
        <div>
            <form onSubmit={handleSubmit} className="register-form">
                {formError && showToast(formError)}

                {step === 1 && (
                    <div>
                        <h2>Regístrate y forma parte de </h2>
                        <h2 className="card-title">Jorge Minnesota Logistic LLC.</h2>
                        <div className="label">
                            <span className="label-text-alt">Ingresa tu email:</span>
                        </div>
                        <div className="form-group">
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => handleInputChange(setEmail, e.target.value)}
                                className="input input-bordered input-primary w-full max-w-xs bg-white-100 text-black-500"
                                placeholder="Email"
                            />
                        </div>
                        <div className="label">
                            <span className="label-text-alt">Ingresa una contraseña de mínimo 6 dígitos:</span>
                        </div>
                        <div className="form-group">
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => handleInputChange(setPassword, e.target.value)}
                                className="input input-bordered input-primary w-full max-w-xs bg-white-100 text-black-500"
                                placeholder="Contraseña"
                            />
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <div>
                        <h2 className="card-title">Ya falta menos.</h2>
                        <div className="label">
                            <span className="label-text-alt">Ingresa tu nombre completo:</span>
                        </div>
                        <div className="form-group">
                            <input
                                type="text"
                                id="nombre"
                                value={nombre}
                                onChange={(e) => handleInputChange(setNombre, e.target.value)}
                                className="input input-bordered input-primary w-full max-w-xs bg-white-100 text-black-500"
                                placeholder="Nombre Completo"
                                required
                            />
                        </div>
                        <div className="label">
                            <span className="label-text-alt">Ingresa tu teléfono con clave de pais:</span>
                        </div>
                        <div className="form-group">
                            <PhoneInput
                                onlyCountries={['us', 'mx']}
                                country={'us'}
                                value={telefonoDos}
                                onChange={(value) => {
                                    if (value && value.length > 0 && value[0] !== '+') {
                                        value = '+' + value;
                                    }
                                    setTelefono(value);
                                }}
                                inputProps={{
                                    name: 'phone',
                                    required: true,
                                    maxLength: 60,
                                    placeholder: 'Teléfono',
                                    className: 'input input-bordered input-primary w-full max-w-xs bg-white-100 text-black-500'
                                }}
                                inputStyle={{textAlign: 'right'}}
                            />
                        </div>
                    </div>
                )}
                {step === 3 && (
                    <div>
                        <h1>¿Te gustaría registra un?</h1>
                        <h2 className="card-title">contacto extra</h2>
                        <div className="label">
                            <span className="label-text-alt">Ingresa nombre de contacto (opcional)</span>
                        </div>
                        <div className="form-group">
                            <input
                                type="text"
                                id="contactoDos "
                                value={contactoDos}
                                onChange={(e) => handleInputChange(setContactoDos, e.target.value)}
                                className="input input-bordered input-primary w-full max-w-xs bg-white-100 text-black-500"
                                placeholder="Segundo Contacto"
                                required
                            />
                        </div>
                        <div className="label">
                            <span className="label-text-alt">Ingresa teléfono de contacto (opcional)</span>
                        </div>
                        <div className="form-group">
                             <PhoneInput
                                onlyCountries={['us', 'mx']}
                                country={'us'}
                                value={telefonoDos}
                                onChange={(value) => {
                                    if (value && value.length > 0 && value[0] !== '+') {
                                        value = '+' + value;
                                    }
                                    setTelefonoDos(value);
                                }}
                                inputProps={{
                                    name: 'phone',
                                    required: true,
                                    maxLength: 60,
                                    placeholder: 'Teléfono',
                                    className: 'input input-bordered input-primary w-full max-w-xs bg-white-100 text-black-500'
                                }}
                                inputStyle={{textAlign: 'right'}}
                            />
                        </div>
                    </div>
                )}
                {step === 4 && (
                    <div>
                        <h2 className="card-title">Confirma tus datos<br/>Si tu información está bien regístrate</h2>
                        <p className="text-black-500">Email:<strong className="text-primary"> {email}</strong></p>
                        <p className="text-black-500">Nombre: <strong className="text-primary"> {nombre}</strong></p>
                        <p className="text-black-500">Teléfono: <strong className="text-primary"> {telefono}</strong></p>
                        <p className="text-black-500">Segundo Contacto: <strong className="text-primary"> {contactoDos}</strong></p>
                        <p className="text-black-500">Segundo teléfono: <strong className="text-primary"> {telefonoDos}</strong></p>
                        <br/>
                        <button className="btn btn-outline btn-primary" type="submit">
                            Registrarse
                        </button>
                    </div>
                )}
                <br/>
            </form>
            <div className="grid grid-cols-2 gap-2">
                <div>
                    {step > 1 && (
                        <button
                            type="button"
                            className="font-medium tracking-wide py-2 px-5 sm:px-8 border border-primary text-primary bg-white-500 outline-none rounded-l-full rounded-r-full capitalize hover:bg-primary hover:text-white-500 transition-all hover:shadow-orange"
                            onClick={() => handleStepBack()}
                        >
                            Regresar
                        </button>
                    )}
                </div>
                <div>
                    {step < 4 && (
                        <button
                            type="button"
                            className="font-medium tracking-wide py-2 px-5 sm:px-8 border border-primary text-primary bg-white-500 outline-none rounded-l-full rounded-r-full capitalize hover:bg-primary hover:text-white-500 transition-all hover:shadow-orange"
                            onClick={() => handleStepNext()}
                        >
                            Siguente
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FormRegistro;