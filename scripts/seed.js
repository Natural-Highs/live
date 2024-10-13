// Import the functions you need from the SDKs you need
// import type { ServiceAccount } from "firebase-admin";
import admin from "firebase-admin";
import { readFile } from "fs/promises";
// import { getAuth, connectAuthEmulator } from "firebase/auth";



// // Your web app's Firebase configuration
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_APIKEY,
//   authDomain: import.meta.env.VITE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_APP_ID,
// };

const loadJson = async (filePath) => {
  const data = await readFile(filePath, {encoding: "utf8"});
  const jsonData = JSON.parse(data);
  return jsonData;
}

const serviceAccount = await loadJson("../serviceAccount.json");
const dummyData = await loadJson("../scripts/dummy-data.json");


console.log("loading json files");


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


// Configure Firestore to use the emulator


const firestoreEmulatorHost = "localhost:8080"; // Default port for Firestore emulator
admin.firestore().settings({
  host: firestoreEmulatorHost,
  ssl: false,
});

// If running the Firebase Auth emulator, set the emulator host
if (process.env.MODE === 'development') {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'; // replace 9099 with your emulator port if it's different
}

// Export the Firestore and Auth instances for use in your application


const db = admin.firestore();

/*
const surveyTemplate = {
    name: "testTemplate",
    description: "Allows users to enter their personal information",
};

const survey = {
  createdAt: new Date(),
}

const question = {
  questionText: "What is your age?",
  questionType: "Personal",
  isUniqueResponse: true,
}

const user = {
  name: "Alex Savard",
  email: "alex.savard20@icloud.com",
  emergencyContact: "911",
  isAdmin: true,

}

const surveyResponse = {
  isComplete: true,
  createdAt: new Date(),
}

const response = {
  createdAt: new Date(),
  responseText: "20",
}
*/



const seedFirestore = async () => {
    const surveyTemplateRef = db.collection("surveyTemplates");
    const surveyRef = db.collection("surveys");
    const surveyResponseRef = db.collection("surveyResponses");
    const responsesRef = db.collection("responses");
    const usersRef = db.collection("users");
    const questionsRef = db.collection("questions");

    for(let i = 0; i < 5; i++) 
    {
      console.log("Iteration ", i);
      try {
        const surveyTemplateSnapshot = await surveyTemplateRef.add(dummyData.surveyTemplates[i]);
        const questionsSnapshot = await questionsRef.add({...dummyData.questions[i], surveyTemplateId: surveyTemplateSnapshot.id});
        const surveySnapshot = await surveyRef.add({createdAt: new Date(), templateId: surveyTemplateSnapshot.id});
        const userSnapshot = await usersRef.add(dummyData.users[i]);
        const surveyResponseSnapshot = await surveyResponseRef.add({...dummyData.surveyResponses[i], surveyId: surveySnapshot.id, userId: userSnapshot.id});
        const responseSnapshot = await responsesRef.add({...dummyData.responses[i], questionId: questionsSnapshot.id, surveyResponseId: surveyResponseSnapshot.id});
      } catch(error) {
        console.log(error);
      }

    }
    /*
    try {
        const surveyTemplateSnapshot = await surveyTemplateRef.add(surveyTemplate);
        const questionsSnapshot = await questionsRef.add({...question, surveyTemplateId: surveyTemplateSnapshot.id});
        const surveySnapshot = await surveyRef.add({...survey, templateId: surveyTemplateSnapshot.id});
        const userSnapshot = await usersRef.add(user);
        const surveyResponseSnapshot = await surveyResponseRef.add({...surveyResponse, surveyId: surveySnapshot.id, userId: userSnapshot.id});
        const responseSnapshot = await responsesRef.add({...response, questionId: questionsSnapshot.id, surveyResponseId: surveyResponseSnapshot.id});

    } catch(error) {
        console.log(error);
    }
    */
    
}

seedFirestore();