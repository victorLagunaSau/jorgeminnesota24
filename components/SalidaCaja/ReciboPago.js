import React, {useRef} from "react";
import ReactToPrint from "react-to-print";
import moment from "moment";
import {toWords} from "number-to-words";

const ComponentToPrint = React.forwardRef(({pagoData}, ref) => {
    const timestamp = moment().format("DD/MM/YYYY HH:mm:ss");

    const parseNumberOrZero = (value) => parseFloat(value) || 0;

    const montoPago = parseNumberOrZero(pagoData.monto);
    const sobrePeso = parseNumberOrZero(pagoData.sobrePeso);
    const gastosExtra = parseNumberOrZero(pagoData.gastosExtra);
    const montoTotal = parseNumberOrZero(montoPago + sobrePeso + gastosExtra);

    const montoEnPalabras = toWords(montoTotal).toUpperCase() + " DLL";

    const tipoPagoMap = {
        SPC: "Pago Viaje",
        SPS: "Pago Servicio",
        SPA: "Pago Autorizado",
    };

    const Recibo = ({title}) => (
        <div className="border-gray-300 border-2 p-4">
            <div className="w-full flex justify-between pt-1">
                <img src="/assets/Logoprint.png" className="w-15 mr-1" alt="Logo"/>
                <strong>RECIBO DE ENTREGA DE EFECTIVO </strong>
                <p>
                    Fecha:{" "}
                    {moment(timestamp).format("DD/MM/YYYY HH:mm")}
                </p>
                <p className="text-gray-400">{title}</p>
            </div>
            <div className="flex">
                <div className="w-2/3 text-gray-400 p-2">
                    <p>
                        <p>Recibe:</p>{" "}
                        <strong className="text-3xl">{pagoData.nombreReceptor}</strong>
                    </p>
                    <p>
                        <p>Concepto de Pago:</p>{" "}
                        <strong className="text-2xl">{pagoData.conceptoPago}</strong>
                    </p>
                    <p>
                        <p>Tipo de Pago:</p>{" "}
                        <strong>{tipoPagoMap[pagoData.tipoPago] || "Tipo desconocido"}</strong>
                    </p>
                    <p>
                        <strong>Paga:</strong> {pagoData.usuarioPaga}
                    </p>
                </div>
                <div className="w-1/3 border-gray-300 p-2">
                    <p>
                        <p>Monto a pagar:</p>{" "}
                        <strong className="text-3xl">${montoPago} DLL</strong>
                    </p>
                    <p>({montoEnPalabras})</p>
                    <p className="mt-12 pt-2">
                        _______________
                        <br/>
                        <strong>Firma del Receptor</strong>
                    </p>
                </div>
            </div>
            <p>Motivo de pago: <strong>{pagoData.motivoPago} </strong></p>
        </div>
    );
    return (
        <div ref={ref} className="m-4" style={{maxWidth: "90%", marginLeft: "auto", marginRight: "auto"}}>
            <Recibo title="Copia: Cliente"/>
            <Recibo title="Copia: Oficina"/>
        </div>
    );
});

const ReciboPago = ({
                        onClose,
                        tipoPago,
                        monto,
                        conceptoPago,
                        nombreReceptor,
                        motivoPago,
                        usuario,
                    }) => {
    const pagoData = {
        monto: monto || 0,
        conceptoPago: conceptoPago || "N/A",
        tipoPago: tipoPago || "N/A",
        nombreReceptor: nombreReceptor || "N/A",
        usuarioPaga: usuario, // Puedes agregar valores dinámicos si es necesario
        timestamp: new Date().toISOString(),
        motivoPago: motivoPago || "Sin motivo de pago",
    };

    const componentRef = useRef(null);

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50 bg-black-500">
    <div className="rounded shadow-lg w-3/4 bg-white-500">
        <div className="navbar bg-neutral text-neutral-content">
            <div className="flex justify-between items-center w-full px-4">
                {/* Botón de Cerrar a la izquierda */}
                <button
                    className="btn btn-sm btn-ghost"
                    onClick={onClose} // Vinculando correctamente onClose
                >
                    Cerrar
                </button>

                {/* Botón de Imprimir a la derecha */}
                <ReactToPrint
                    trigger={() => (
                        <button className="btn btn-sm btn-ghost">
                            Imprimir
                        </button>
                    )}
                    content={() => componentRef.current}
                />
            </div>
        </div>
        <ComponentToPrint ref={componentRef} pagoData={pagoData} />
    </div>
</div>
    );
};

export default ReciboPago;
