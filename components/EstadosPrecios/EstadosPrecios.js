import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FormEstadosPrecios from "./FormEstadosPrecios";

import { firestore } from "../../firebase/firebaseIni";
import TablaEstadoPrecios from "./TablaEstadoPrecios";

const EstadosPrecios = () => {
  const [estados, setEstados] = useState([]);

  useEffect(() => {
    const fetchEstados = async () => {
      try {
        const estadosSnapshot = await firestore()
          .collection("province")
          .get();
        const estadosData = estadosSnapshot.docs.map((doc) => ({
          id: doc.id,
          state: doc.data().state,
          regions: Array.from(doc.data().regions.values()),
          regionslength: doc.data().regions.length, // Contar el número de regiones
        }));
       setEstados(Object.values(estadosData));
      } catch (error) {
        console.error("Error fetching estados:", error);
      }
    };

    fetchEstados();
  }, []);

  return (
    <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto" id="home">
      <h3 className="justify-center text-3xl lg:text-3xl font-mediumtext-black-500">
        Estados y <strong>Regiones</strong>.
      </h3>
      <div className="flex flex-col w-full my-0 ">
        <motion.h3 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-black-100 mx-auto text-center">
          <button
            className="btn btn-outline btn-error"
            onClick={() => document.getElementById("precios").showModal()}
          >
            + Registrar Estado
          </button>
        </motion.h3>

        <dialog id="precios" className="modal">
          <div className="modal-box bg-white-500">
            <form method="dialog">
              {/* if there is a button in form, it will close the modal */}
              <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                ✕
              </button>
              <FormEstadosPrecios />
            </form>
          </div>
        </dialog>
      </div>
      <div className="flex flex-col w-full my-0 ">
        <TablaEstadoPrecios estados={estados}/>
      </div>
    </div>
  );
};

export default EstadosPrecios;
