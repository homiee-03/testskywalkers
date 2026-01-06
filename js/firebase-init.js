const firebaseConfig = {
  apiKey: "AIzaSyAk8H5KXBGc16OveSbTIzrrRQtaUua9T",
  authDomain: "ssc-skywalkers.firebaseapp.com",
  projectId: "ssc-skywalkers",
  storageBucket: "ssc-skywalkers.appspot.com",
  messagingSenderId: "21796057492",
  appId: "1:21796057492:web:54cf47e623dfd04fe28281",
  measurementId: "G-ZX7VX3Y36H"
};

if (!window.firebaseApp) {
  window.firebaseApp = firebase.initializeApp(firebaseConfig);
  window.firebaseAuth = firebase.auth();
  window.firebaseDb = firebase.firestore();
}
