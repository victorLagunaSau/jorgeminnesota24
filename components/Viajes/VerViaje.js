import React, { useRef } from "react";
import { ReactToPrint } from "react-to-print";
import EditarViaje from "./EditarViaje";

const ComponentToPrint = React.forwardRef(({ idViajeModificar }, ref) => {
    console.log(idViajeModificar)
  return (
  <div ref={ref} className="m-4 mb-10" style={{ maxWidth: "90%", marginLeft: "auto", marginRight: "auto" }}>
        <EditarViaje idViajeModificar={idViajeModificar}/>
    </div>
  );
});

const FichaPathbook = ({ idViajeModificar }) => {
  const componentRef = useRef(null);

  return (
    <div className="max-w-6xl bg-white-100">
      <div className="max-w-6xl">
        <div className="navbar bg-neutral text-neutral-content">
          <div className="navbar-center hidden lg:flex">
            <ul className="menu menu-horizontal">
              <li className="m-2">
                <ReactToPrint
                  trigger={() => (
                    <a>
                      Imprimir
                    </a>
                  )}
                  content={() => componentRef.current}
                />
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white-100  m-4 " style={{ overflowY: "auto", maxHeight: "calc(100vh - 3rem)" }}>
        <ComponentToPrint idViajeModificar={idViajeModificar} ref={componentRef} />
      </div>
    </div>
  );
};

export default FichaPathbook;
