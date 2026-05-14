import firebase from "firebase/app";
import "firebase/firestore";

// Inicializar Firebase si no está inicializado (server-side)
const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebase.apps.length) {
    firebase.initializeApp(config);
}

const db = firebase.firestore();

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { clienteNombre, titulo, mensaje } = req.body;

    if (!clienteNombre || !mensaje) {
        return res.status(400).json({ error: "Faltan campos: clienteNombre, mensaje" });
    }

    const fcmServerKey = process.env.FCM_SERVER_KEY;
    if (!fcmServerKey) {
        return res.status(500).json({ error: "FCM_SERVER_KEY no configurada" });
    }

    try {
        // Buscar tokens del cliente por nombre
        const tokensSnap = await db
            .collection("tokensCliente")
            .where("clienteNombre", "==", clienteNombre)
            .get();

        if (tokensSnap.empty) {
            return res.status(200).json({
                sent: false,
                reason: "Cliente no tiene token de push registrado"
            });
        }

        const tokens = tokensSnap.docs.map(doc => doc.data().token).filter(Boolean);

        if (tokens.length === 0) {
            return res.status(200).json({
                sent: false,
                reason: "No se encontraron tokens válidos"
            });
        }

        // Enviar a cada token via FCM legacy API
        const results = await Promise.allSettled(
            tokens.map(async (token) => {
                const response = await fetch("https://fcm.googleapis.com/fcm/send", {
                    method: "POST",
                    headers: {
                        "Authorization": `key=${fcmServerKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        to: token,
                        notification: {
                            title: titulo || "Jorge Minnesota Logistic",
                            body: mensaje,
                            sound: "default",
                        },
                        data: {
                            clienteNombre,
                            tipo: "cambioEstatus",
                        },
                    }),
                });
                return response.json();
            })
        );

        const exitosos = results.filter(r => r.status === "fulfilled").length;

        return res.status(200).json({
            sent: true,
            tokensEnviados: exitosos,
            total: tokens.length,
        });
    } catch (error) {
        console.error("Error enviando push:", error);
        return res.status(500).json({ error: "Error enviando notificación" });
    }
}
