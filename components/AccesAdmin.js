import {useState, useEffect} from "react";
import {firestore, auth} from "../firebase/firebaseIni";
import {useRouter} from "next/router";

const AccesAdmin = ({withoutAccess, levelAccess}) => {
	const router = useRouter(); // Obtener el objeto de router
	const [userData, setUserData] = useState(null);

	useEffect(() => {
		// Función que se ejecuta cuando cambia el estado de autenticación del usuario
		const unsubscribe = auth().onAuthStateChanged((user) => {
			if (user) {
				// Si el usuario está autenticado, se obtienen sus datos
				dataUser(user.uid);
			} else {
				// Si el usuario no está autenticado, se redirige a la página sin acceso
				router.push(withoutAccess);
			}
		});
		return () => unsubscribe();
	}, []);

	const dataUser = (userId) => {
		firestore()
			.collection("users")
			.doc(userId)
			.get()
			.then((doc) => {
				if (doc.exists) {
					const userData = doc.data();

                    if (!userData.access || !userData.access.includes(levelAccess)) {
                        router.push(withoutAccess);
                        console.error("No cuentas con acceso para esta herramienta, contacta con soporte");
                    } else {
                        setUserData(userData);
                    }

				}
			})
			.catch((error) => {
				console.error("Error getting user data:", error);
			});
	};

	return userData;
};

export default AccesAdmin;
