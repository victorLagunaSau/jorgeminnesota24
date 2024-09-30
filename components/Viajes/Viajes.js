import React, {useState, useEffect} from "react";
import {motion} from "framer-motion";
import FormViajes from "./FormViajes";
import TablaViajes from "./TablaViajes";

const Viajes = ({user}) => {

    return (
        <div className="max-w-screen-xl mt-5 xl:px-16 mx-auto" id="clientes">
            <h3 className="justify-center text-3xl lg:text-3xl font-mediumtext-black-500">
                <strong>Pago de viajes</strong>.
            </h3>
            <div className="flex flex-col w-full my-4 ">
                <motion.h3 className="text-2xl sm:text-3xl lg:text-4xl font-medium text-black-100 mx-auto text-center">
                    <button
                        className="btn btn-outline btn-error"
                        onClick={() => document.getElementById("viajesModal").showModal()}
                    >
                        + Pagar Viaje
                    </button>
                </motion.h3>

                <dialog id="viajesModal" className="modal ">
                    <div className="modal-box w-11/12 max-w-5xl bg-white-100">
                        <FormViajes user={user}/>
                    </div>
                </dialog>
            </div>
            <div className="flex flex-col w-full my-0 ">
                <TablaViajes />
            </div>
        </div>
    );
};

export default Viajes;
