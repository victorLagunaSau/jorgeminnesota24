import React, { useState, useEffect } from 'react';
import { firestore } from "../../firebase/firebaseIni";
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const FormClientes = () => {
        const [buttonDisabled, setButtonDisabled] = useState(false);
    const initialState = {
        nombre: '',
        telefono: '',
        contactoDos: '',
        telefonoDos: '',
        savedSuccessfully: false
    };

    const [formValues, setFormValues] = useState({ ...initialState });
    const [consecutivo, setConsecutivo] = useState(1);
    const [loading, setLoading] = useState(true);

const getConsecutivo = async () => {
    try {
        const consecutivoRef = await firestore().collection("config").doc("consecutivos").get();
        const data = consecutivoRef.data();
        const actualConsecutivo = data.clientes;
        const nuevoConsecutivo = actualConsecutivo + 1;
        await firestore().collection("config").doc("consecutivos").update({
            clientes: nuevoConsecutivo
        });
        setConsecutivo(nuevoConsecutivo);
    } catch (error) {
        console.error('Error al obtener el contador de consecutivos:', error);
    }
};
    const guardarCliente = async () => {
        if (formValues.nombre && formValues.telefono && !loading) {
            const idCliente = `jm1${consecutivo}`;
            try {
                await firestore().collection("clientes").doc(idCliente).set({
                    clave: idCliente,
                    nombre: formValues.nombre,
                    telefono: formValues.telefono,
                    contactoDos: formValues.contactoDos || null,
                    telefonoDos: formValues.telefonoDos || null,
                    createdAt: new Date()
                });
            } catch (error) {
                console.error('Error al guardar datos:', error);
            }
        } else {
        }
    };

    const guardarClienteYActualizarConsecutivo = async () => {
                if (!formValues.nombre || !formValues.telefono) {
            console.error('El nombre y el teléfono son obligatorios.');
            return;
        }
        try {
            await getConsecutivo();
            await guardarCliente();
            reiniciarFormulario();
            setButtonDisabled(true);
            setTimeout(() => {
                setButtonDisabled(false);
                setTimeout(() => {
                    setFormValues({ ...initialState });
                }, 2000);
            }, 1000);
        } catch (error) {
            console.error('Error al guardar cliente y actualizar consecutivo:', error);
        }
    };

    const reiniciarFormulario = () => {
        setFormValues({ ...initialState, savedSuccessfully: true });
        setFormValues({ ...initialState });
    };

    return (
        <form id="registra"  className="min-h-[500px]">
            <div className="flex justify-center items-center h-full">
                <p>Ingrese los datos del cliente</p>
            </div>
            <div className="flex justify-center items-center h-full m-3">
                <input
                    type="text"
                    placeholder="Nombre"
                    value={formValues.nombre}
                    onChange={(e) => setFormValues({ ...formValues, nombre: e.target.value })}
                    className="input input-bordered input-error w-full max-w-xs bg-white-500"
                />
            </div>
            <div className="flex justify-center items-center h-full m-3">
                <PhoneInput
                    onlyCountries={['us', 'mx']}
                    country={'us'}
                    value={formValues.telefono}
                    onChange={(value) => setFormValues({ ...formValues, telefono: value })}
                    inputProps={{
                        name: 'telefono',
                        required: true,
                        maxLength: 60,
                        placeholder: 'Teléfono',
                        className: 'input input-bordered input-primary w-full max-w-xs bg-white-100 text-black-500'
                    }}
                    inputStyle={{ textAlign: 'right' }}
                />
            </div>
            <div className="flex justify-center items-center h-full m-3">
                <input
                    type="text"
                    placeholder="Segundo Contacto"
                    value={formValues.contactoDos}
                    onChange={(e) => setFormValues({ ...formValues, contactoDos: e.target.value })}
                    className="input input-bordered input-error w-full max-w-xs bg-white-500"
                />
            </div>
            <div className="flex justify-center items-center h-full m-3">
                <PhoneInput
                    onlyCountries={['us', 'mx']}
                    country={'us'}
                    value={formValues.telefonoDos}
                    onChange={(value) => setFormValues({ ...formValues, telefonoDos: value })}
                    inputProps={{
                        name: 'telefonoDos',
                        maxLength: 60,
                        placeholder: 'Teléfono 2',
                        className: 'input input-bordered input-primary w-full max-w-xs bg-white-100 text-black-500'
                    }}
                    inputStyle={{ textAlign: 'right' }}
                />
            </div>
            <div className="flex justify-center items-center h-full m-3">
             <button
                type="button"
                onClick={guardarClienteYActualizarConsecutivo}
                className="btn btn-primary"
                disabled={buttonDisabled} // Deshabilitar el botón si buttonDisabled es true
            >
                Guardar
            </button>
            </div>
            {formValues.savedSuccessfully && (
                <div className="text-green-600 mt-2">Guardado con éxito. Reiniciando formulario...</div>
            )}
        </form>
    );
};

export default FormClientes;
