import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebase/storage";
import "firebase/functions";

const config = {
  apiKey: "AIzaSyDJGBFa9gVwJpIedfidnFxotapD-uY1J9M",
  authDomain: "jorgeminnesota-bd031.firebaseapp.com",
  projectId: "jorgeminnesota-bd031",
  storageBucket: "jorgeminnesota-bd031.appspot.com",
  messagingSenderId: "272499240779",
  appId: "1:272499240779:web:a573fbb54a23ca6d2502ce",
  measurementId: "G-TF3NWJ353X"
};

if (typeof window !== "undefined" && !firebase.apps.length) {
  firebase.initializeApp(config);
}

const auth = firebase.auth;
const firestore = firebase.firestore;
const functions = firebase.functions;
const storage = firebase.storage;

export { auth, firestore, storage, functions };

