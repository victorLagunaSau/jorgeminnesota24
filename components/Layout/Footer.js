import React from "react";
// import Facebook from "../../public/assets/Icon/facebook.svg";
// import Twitter from "../../public/assets/Icon/twitter.svg";
// import Instagram from "../../public/assets/Icon/instagram.svg";
const Footer = () => {
  return (
    <div className="bg-white-100 pt-44 pb-24">
      <div className="max-w-screen-xl w-full mx-auto px-6 sm:px-8 lg:px-16 grid grid-rows-6 sm:grid-rows-1 grid-flow-row sm:grid-flow-col grid-cols-3 sm:grid-cols-12 gap-4">
        <div className="row-span-2 sm:col-span-4 col-start-1 col-end-4 sm:col-end-5 flex flex-col items-start ">
           <img src="/assets/Logo.png" className="w-auto p-2" alt=""/>
          {/*<LogoVPN className="h-8 w-auto mb-6" />*/}
          <p className="mb-4">
            <strong className="font-medium">Jorge Minnesota </strong> ofrece una red privada virtual especializada en el transporte de autos, con características únicas y una alta seguridad.
          </p>
          <div className="flex w-full mt-2 mb-8 -mx-2">
            <div className="mx-2 bg-white-500 rounded-full items-center justify-center flex p-2 shadow-md">
              {/*<Facebook className="h-6 w-6" />*/}
            </div>
            <div className="mx-2 bg-white-500 rounded-full items-center justify-center flex p-2 shadow-md">
              {/*<Twitter className="h-6 w-6" />*/}
            </div>
            <div className="mx-2 bg-white-500 rounded-full items-center justify-center flex p-2 shadow-md">
              {/*<Instagram className="h-6 w-6" />*/}
            </div>
          </div>
          {/*<p className="text-gray-400">©{new Date().getFullYear()} - LaslesVPN</p>*/}
        </div>
        <div className=" row-span-2 sm:col-span-2 sm:col-start-7 sm:col-end-9 flex flex-col">
          <p className="text-black-600 mb-4 font-medium text-lg">Producto</p>
          <ul className="text-black-500 ">
            <li className="my-2 hover:text-primary cursor-pointer transition-all">
              Precios{" "}
            </li>
            <li className="my-2 hover:text-primary cursor-pointer transition-all">
              Ubicaciones{" "}
            </li>
            <li className="my-2 hover:text-primary cursor-pointer transition-all">
              Servidor{" "}
            </li>
            <li className="my-2 hover:text-primary cursor-pointer transition-all">
              Países{" "}
            </li>
            <li className="my-2 hover:text-primary cursor-pointer transition-all">
              Blog{" "}
            </li>
          </ul>
        </div>
        <div className="row-span-2 sm:col-span-2 sm:col-start-9 sm:col-end-11 flex flex-col">
          <p className="text-black-600 mb-4 font-medium text-lg">Herramientas</p>
          <ul className="text-black-500">
            <li className="my-2 hover:text-primary cursor-pointer transition-all">
              ¿Jorge Minnesota?{" "}
            </li>
            <li className="my-2 hover:text-primary cursor-pointer transition-all">
              Preguntas Frecuentes{" "}
            </li>
            <li className="my-2 hover:text-primary cursor-pointer transition-all">
              Sobre Nosotros{" "}
            </li>
            <li className="my-2 hover:text-primary cursor-pointer transition-all">
              Política de Privacidad{" "}
            </li>
            <li className="my-2 hover:text-primary cursor-pointer transition-all">
              Términos de Servicio{" "}
            </li>
          </ul>
        </div>
        <div className="row-span-2 sm:col-span-2 sm:col-start-11 sm:col-end-13 flex flex-col">
          <p className="text-black-600 mb-4 font-medium text-lg">Registrate como:</p>
          <ul className="text-black-500">
            <li className="my-2 hover:text-primary cursor-pointer transition-all">
              Cliente{" "}
            </li>
            <li className="my-2 hover:text-primary cursor-pointer transition-all">
              Transportista{" "}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Footer;
