// src/firebase.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

// Firebaseの設定情報をここに記入
const firebaseConfig = {
  apiKey: "AIzaSyCGhZCSjt1aZHUDNRe3O5PrFPSsyZuiv-M",
  authDomain: "relic-project-63e31.firebaseapp.com",
  projectId: "relic-project-63e31",
  storageBucket: "relic-project-63e31.firebasestorage.app",
  messagingSenderId: "807827850631",
  appId: "1:807827850631:web:aef0927f98dfd26ce53f22"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Firestoreのインスタンスを取得
const db = getFirestore(app);

export { db, collection, addDoc, getDocs };
