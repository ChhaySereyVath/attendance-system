const express = require("express");
const router = express.Router();
const { batchWriteAttendance } = require("../models/firestore");
const { queueGoogleSheetUpdate } = require("../models/googleSheets");
const moment = require("moment-timezone");
const admin = require("firebase-admin");

const db = admin.firestore();

// ✅ Middleware to Log Incoming Requests
router.use((req, res, next) => {
    console.log(`📥 Incoming request: ${req.method} ${req.url}`);
    console.log(`📦 Request Body:`, req.body);
    next();
});



// ✅ Check-In Route
router.post("/check-in", async (req, res) => {
    try {
        const { firstName, lastName, checkInTime } = req.body;
        if (!firstName || !lastName || !checkInTime) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const today = new Date().toISOString().split("T")[0];

        const checkInTimeObj = moment.utc(checkInTime).tz("Asia/Phnom_Penh"); 
        const formattedCheckInTime = checkInTimeObj.format(); 
        const checkInHour = checkInTimeObj.hour();
        
        let columnToUpdate = checkInHour < 12 ? "Morning Check-In" : "Afternoon Check-In";

        const entry = {
            firstName,
            lastName,
            date: today,
            morningCheckIn: checkInHour < 12 ? formattedCheckInTime : null, 
            afternoonCheckIn: checkInHour >= 12 ? formattedCheckInTime : null, 
            morningCheckOut: null,
            afternoonCheckOut: null,
            totalHours: null,
            updatedAt: new Date().toISOString(),
        };

        // ✅ Batch Write to Firestore
        await batchWriteAttendance([entry]);

        // ✅ Queue Update for Google Sheets
        await queueGoogleSheetUpdate(entry);

        res.status(201).json({ message: `✅ ${columnToUpdate} recorded successfully!` });
    } catch (error) {
        console.error("❌ Error in Check-In:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// ✅ heck-Out Route
router.post("/check-out", async (req, res) => {
    try {
        const { firstName, lastName, checkOutTime } = req.body;
        if (!firstName || !lastName || !checkOutTime) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        console.log("📥 Incoming Check-Out Request:", req.body);

        const today = new Date().toISOString().split("T")[0];

        const checkOutTimeLocal = moment.utc(checkOutTime).tz("Asia/Phnom_Penh"); 
        const formattedCheckOutTime = checkOutTimeLocal.format(); 
        const checkOutHour = checkOutTimeLocal.hour(); 

        //  Get existing check-in record
        const docRef = db.collection("attendance").doc(`${firstName}-${lastName}-${today}`);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Check-in record not found" });
        }

        const data = doc.data();
        let totalHours = 0;

        //  Assign Check-Out Correctly Based on Local Time
        if (checkOutHour < 12 && data.morningCheckIn) {
            console.log(`☀️ Morning Check-Out Recorded: ${formattedCheckOutTime}`);
            data.morningCheckOut = formattedCheckOutTime;
        } else if (checkOutHour >= 12 && data.afternoonCheckIn) {
            console.log(`🌆 Afternoon Check-Out Recorded: ${formattedCheckOutTime}`);
            data.afternoonCheckOut = formattedCheckOutTime;
        } else {
            return res.status(400).json({ error: "No valid check-in found for check-out" });
        }

        // Calculate total hours correctly
        if (data.morningCheckIn && data.morningCheckOut) {
            totalHours += moment(data.morningCheckOut).diff(moment(data.morningCheckIn), "hours", true);
        }
        if (data.afternoonCheckIn && data.afternoonCheckOut) {
            totalHours += moment(data.afternoonCheckOut).diff(moment(data.afternoonCheckIn), "hours", true);
        }

        // Format total work time
        const totalHoursFormatted = `${Math.floor(totalHours)}h ${Math.floor((totalHours % 1) * 60)}m`;
        data.totalHours = totalHoursFormatted;

        // Save updates
        await docRef.update(data);
        await queueGoogleSheetUpdate(data);

        res.status(201).json({ 
            message: "✅ Check-Out Successful!", 
            checkOutTime: formattedCheckOutTime, 
            totalHours: totalHoursFormatted 
        });

    } catch (error) {
        console.error("❌ Error in Check-Out:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});



module.exports = router;
