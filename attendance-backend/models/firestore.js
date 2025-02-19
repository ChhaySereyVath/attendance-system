const admin = require("firebase-admin");
const serviceAccount = require("../firebase-service-account.json");

// Prevent multiple Firebase initializations
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true }); 

// Batch Write Function
async function batchWriteAttendance(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
        console.warn("⚠️ No entries provided for batch write.");
        return;
    }

    const batch = db.batch();

    for (const entry of entries) {
        const { firstName, lastName, date, ...newData } = entry;
        const docRef = db.collection("attendance").doc(`${firstName}-${lastName}-${date}`);

        // Fetch existing document
        const docSnapshot = await docRef.get();
        let existingData = docSnapshot.exists ? docSnapshot.data() : {};

        const mergedData = {
            firstName,
            lastName,
            date,
            morningCheckIn: existingData.morningCheckIn || newData.morningCheckIn || null,
            morningCheckOut: existingData.morningCheckOut || newData.morningCheckOut || null,
            afternoonCheckIn: existingData.afternoonCheckIn || newData.afternoonCheckIn || null,
            afternoonCheckOut: existingData.afternoonCheckOut || newData.afternoonCheckOut || null,
            totalHours: newData.totalHours || existingData.totalHours || null,
            updatedAt: new Date().toISOString()
        };

        // Ensure updates don't erase existing values
        batch.set(docRef, mergedData, { merge: true });
    }

    await batch.commit();
    console.log(`✅ Batch write to Firestore completed (${entries.length} records)`);
}

module.exports = { db, batchWriteAttendance };
