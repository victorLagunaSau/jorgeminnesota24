import React from "react";
import {firestore} from "../../firebase/firebaseIni";

const EstadosPrecios = () => {
    const [estados, setEstados] = React.useState([]);
    const [searchTerm, setSearchTerm] = React.useState("");

    React.useEffect(() => {
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

                // Ordenar los estados según la cantidad de regiones de mayor a menor
                estadosData.sort((a, b) => b.regionslength - a.regionslength);

                setEstados(estadosData);
            } catch (error) {
                console.error("Error fetching estados:", error);
            }
        };

        fetchEstados();
    }, []);

    const filteredEstados = estados.filter((estado) =>
        estado.regions.some((region) =>
            region.city.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const handleSearchTermChange = (event) => {
        setSearchTerm(event.target.value);
    };

    return (
        <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto p-3" id="home">
            <div className="flex flex-col items-center w-full my-0">
                <p className="text-center">Busca aquí la región de donde quieres traer tu vehículo</p>
                <input
                    type="text"
                    placeholder="Buscar región..."
                    value={searchTerm}
                    onChange={handleSearchTermChange}
                    className="input input-bordered input-error w-full max-w-xs bg-white-500 m-2"
                />
            </div>
            <div className="flex flex-wrap mt-4">
                {filteredEstados.map((estado, index) => (
                    <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/3 p-2 min-w-[320px]" key={index}>
                        <div className="rounded-lg shadow-md  bg-gray-300">
                            <div className="p-4">
                                <h3 className="text-3xl font-medium text-gray-800 ">{estado.state}</h3>
                                <p className="text-sm text-gray-600 ml-4 mb-2">Regiones: {estado.regionslength}</p>
                            </div>
                            <ul className="list-disc" key={estado.id}>
                                {estado.regions
                                    .filter((region) =>
                                        region.city.toLowerCase().includes(searchTerm.toLowerCase())
                                    )
                                    .map((region, index) => (
                                        <div className={index % 2 === 0 ? "bg-white-100 p-2 " : "bg-gray-200 p-2 "}
                                             key={index}>
                                            <div>
                                                <li key={index} className="flex justify-between">
                                                    <div className="text-black-500 indicator m-2">{region.city}
                                                        {region.isNew && (
                                                            <span
                                                                className="indicator-item badge badge-warning p-1"
                                                                style={{position: 'relative', left: '10px'}}
                                                            >
                                                                Nuevo
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="bg-warning shadow-md p-1">${region.price}</div>
                                                </li>
                                            </div>

                                        </div>
                                    ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


export default EstadosPrecios;
