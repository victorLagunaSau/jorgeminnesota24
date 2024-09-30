import React, {useState, useEffect} from "react";
import {useRouter} from "next/router";
import {auth, firestore} from "../firebase/firebaseIni";
import ConsultaMisViajes from "../components/MisViajes/ConsultaMisViajes";
import SeoHead from "../components/SeoHead";

const MisViajes = () => {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    useEffect(() => {
        const unsubscribe = auth().onAuthStateChanged((user) => {
            if (user) {
                dataUser(user.uid);
            } else {
                setLoading(false);
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
                    if (userData.tipo && (userData.tipo.includes("admin") || userData.tipo.includes("chofer"))) {
                        setUser(userData);
                    } else {
                        auth().signOut().then(() => {
                            router.push("/");
                        });
                    }
                }
                setLoading(false);
            })
            .catch((error) => {
                console.error("Error getting user data:", error);
                setLoading(false);
            });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const userCredential = await auth().signInWithEmailAndPassword(username, password);
            dataUser(userCredential.user.uid);
            setLoginError('');
        } catch (error) {
            console.error("Error logging in:", error);
            setLoginError('Usuario o contraseña incorrectos');
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return (
            <div className="p-4 bg-primary min-h-screen flex flex-col items-center">
                <img src="/assets/LogoW.png" className="w-auto m-5" alt=""/>
                <div className="flex items-center justify-center w-full">
                    <div className="bg-gray-300 p-6 rounded-lg shadow-md w-full max-w-md">
                        <h2 className="text-2xl font-bold text-black-500 mb-4">Iniciar Sesión</h2>
                        {loginError && <p className="text-black-500 mb-4">{loginError}</p>}
                        <form onSubmit={handleLogin}>
                            <div className="mb-4">
                                <label className="block text-black-500 ">Usuario</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-black-500">Contraseña</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-white-500 text-white py-2 rounded-lg text-black-500 shadow-md"
                            >
                                Iniciar Sesión
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <SeoHead title='Viajes - Jorge Minnesota Logistic LLC'/>
            <ConsultaMisViajes user={user}/>
        </div>
    );
};

export default MisViajes;
