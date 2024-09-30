import React, { useState, useEffect } from "react";

import { firestore } from "../../firebase/firebaseIni";
import CardsCatalogo from "./cardsCatalogo";

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
          regions: doc.data().regions,
          regionslength: doc.data().regions.length, // Contar el número de regiones
        }));
          setEstados(estadosData);
      } catch (error) {
        console.error("Error fetching estados:", error);
      }
    };

    fetchEstados();
  }, []);

  return (
    <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto m-3 p-3" id="cobertura">
      <h3 className="justify-center text-3xl lg:text-3xl font-mediumtext-black-500">
        <strong>Estados</strong> y Regiones.
      </h3>
      <div className="flex flex-col w-full my-0 ">

      </div>
      <div className="flex flex-col w-full my-0 ">
        <CardsCatalogo estados={estados}/>
      </div>
    </div>
  );
};

export default EstadosPrecios;
