const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json"); // Ensure this path is correct

// ✅ Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function deleteCollection(collectionPath) {
    const collectionRef = db.collection(collectionPath);
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
        console.log("✅ Collection is already empty.");
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();
    console.log(`✅ Deleted all documents from ${collectionPath}`);
}

deleteCollection("attendance").catch(console.error);
