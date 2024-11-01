/* 
Run command:
node seed.js
*/

import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  addDoc,
} from "firebase/firestore";
import { readFile } from "fs/promises";
import dotenv from "dotenv";


dotenv.config({path: "../.env"});


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_APIKEY,
  authDomain: process.env.VITE_AUTH_DOMAIN,
  projectId: process.env.VITE_PROJECT_ID,
  storageBucket: process.env.VITE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_APP_ID,
};


// Define function to parse json file
const loadJson = async (filePath) => {
  const data = await readFile(filePath, { encoding: "utf8" });
  const jsonData = JSON.parse(data);
  return jsonData;
};

const dummyData = await loadJson("../scripts/dummy-data.json");

const app = initializeApp(firebaseConfig);

// Configure Firestore to use the emulator
const db = getFirestore(app);
connectFirestoreEmulator(db, "localhost", 8080);

// Configure firebase auth
const auth = getAuth();
connectAuthEmulator(auth, "http://localhost:9199");


// Iterate through json data and load databases
const seedFirestore = async () => {
  const surveyRef = collection(db, "surveys");
  const surveyResponseRef = collection(db, "surveyResponses");
  const responsesRef = collection(db, "responses");
  const usersRef = collection(db, "users");
  const questionsRef = collection(db, "questions");

  for (let i = 0; i < 5; i++) {
    console.log("Iteration ", i);
    
    try {
        const authUser = await createUserWithEmailAndPassword(
        auth,
        dummyData.users[i].email,
        dummyData.users[i].password
      );
      const userId = authUser.user.uid;
      const userDoc = await addDoc(usersRef, {
        ...dummyData.users[i],
        id: userId,
      });
      const surveyDoc = await addDoc(surveyRef, {...dummyData.surveys[i],
        createdAt: new Date(),
      });
      const questionsDoc = await addDoc(questionsRef, {
        ...dummyData.questions[i],
        surveyId: surveyDoc.id,
      });
      const surveyResponseDoc = await addDoc(surveyResponseRef, {
        ...dummyData.surveyResponses[i],
        surveyId: surveyDoc.id,
        userId: userDoc.id,
      });
      await addDoc(responsesRef, {
        ...dummyData.responses[i],
        questionId: questionsDoc.id,
        surveyResponseId: surveyResponseDoc.id,
      });

      console.log(`Data added for iteration ${i + 1}`);
    }

   catch (error) {
      console.error("Error seeding Firestore:", error);
    }
  }
  console.log("Seeding completed.");
  process.exit(0);
};


seedFirestore();