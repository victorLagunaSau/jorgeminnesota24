import React from "react";
import Head from "next/head";

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <Head>
                <title>Política de Privacidad | Jorge Minnesota Logistic LLC</title>
            </Head>
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">Política de Privacidad</h1>
                <p className="text-sm text-gray-500 mb-8">Última actualización: 13 de mayo de 2026</p>

                <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-2">1. Información que recopilamos</h2>
                        <p>Jorge Minnesota Logistic LLC (&quot;nosotros&quot;) recopila la siguiente información cuando usas nuestra aplicación:</p>
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li><strong>Datos de registro:</strong> nombre, teléfono, correo electrónico, ciudad, estado y país.</li>
                            <li><strong>Foto de licencia de conducir:</strong> proporcionada voluntariamente durante el registro para verificación de identidad.</li>
                            <li><strong>Datos de solicitudes:</strong> información de vehículos solicitados (lote, marca, modelo, ubicación).</li>
                            <li><strong>Tokens de notificación:</strong> identificadores de dispositivo para enviar notificaciones push sobre el estado de tus solicitudes.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-2">2. Cómo usamos tu información</h2>
                        <ul className="list-disc ml-6 space-y-1">
                            <li>Verificar tu identidad y aprobar tu cuenta.</li>
                            <li>Procesar y dar seguimiento a tus solicitudes de vehículos.</li>
                            <li>Enviarte notificaciones sobre cambios de estado de tus solicitudes y vehículos.</li>
                            <li>Comunicarnos contigo respecto a tu cuenta o servicios.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-2">3. Almacenamiento y seguridad</h2>
                        <p>Tu información se almacena de forma segura en servidores de Google Firebase con encriptación en tránsito y en reposo. No vendemos, alquilamos ni compartimos tu información personal con terceros, excepto cuando sea necesario para proporcionar nuestros servicios o cuando la ley lo requiera.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-2">4. Permisos del dispositivo</h2>
                        <ul className="list-disc ml-6 space-y-1">
                            <li><strong>Cámara:</strong> para tomar foto de tu licencia de conducir durante el registro.</li>
                            <li><strong>Galería de fotos:</strong> para seleccionar una foto existente de tu licencia.</li>
                            <li><strong>Notificaciones push:</strong> para informarte sobre actualizaciones de tus solicitudes y vehículos.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-2">5. Tus derechos</h2>
                        <p>Puedes solicitar la eliminación de tu cuenta y todos tus datos en cualquier momento contactándonos. Al eliminar tu cuenta, se borrarán todos tus datos personales, incluyendo la foto de tu licencia.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-2">6. Cambios a esta política</h2>
                        <p>Podemos actualizar esta política de privacidad periódicamente. Te notificaremos de cualquier cambio significativo a través de la aplicación.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-800 mb-2">7. Contacto</h2>
                        <p>Si tienes preguntas sobre esta política de privacidad, contáctanos en:</p>
                        <p className="mt-2 font-bold">Jorge Minnesota Logistic LLC</p>
                        <p>Email: jorgeminnesota19@hotmail.com</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
