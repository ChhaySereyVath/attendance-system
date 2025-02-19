require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');
const fs = require('fs');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const CREDENTIALS_PATH = './google-sheets-key.json';

// Queue to store pending Google Sheets updates
const sheetQueue = [];

async function accessSheet() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error(`❌ Missing Google Sheets credentials file at ${CREDENTIALS_PATH}`);
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

    await doc.useServiceAccountAuth({
        client_email: credentials.client_email,
        private_key: credentials.private_key.replace(/\\n/g, '\n'),
    });

    await doc.loadInfo();
    console.log('✅ Successfully connected to Google Sheets');

    return doc;
}

// Queue and Process Google Sheets Updates
async function queueGoogleSheetUpdate(entry) {
    sheetQueue.push(entry);

    if (sheetQueue.length === 1) {
        processGoogleSheetUpdates();
    }
}

async function processGoogleSheetUpdates() {
    if (sheetQueue.length === 0) return;

    try {
        const doc = await accessSheet();
        const sheet = doc.sheetsByIndex[0];
        await sheet.loadHeaderRow();
        const rows = await sheet.getRows();

        while (sheetQueue.length > 0) {
            const batchEntries = sheetQueue.splice(0, 10);  

            for (const entry of batchEntries) {
                const { firstName, lastName, date, morningCheckIn, morningCheckOut, afternoonCheckIn, afternoonCheckOut, totalHours } = entry;
                let userRow = rows.find(row => row.FirstName === firstName && row.LastName === lastName && row.Date === date);

                if (!userRow) {
                    await sheet.addRow({
                        FirstName: firstName,
                        LastName: lastName,
                        Date: date,
                        "Morning Check-In": morningCheckIn || "",
                        "Morning Check-Out": morningCheckOut || "",
                        "Afternoon Check-In": afternoonCheckIn || "",
                        "Afternoon Check-Out": afternoonCheckOut || "",
                        "Total Hours": totalHours || "0",
                    });
                } else {
                    if (morningCheckIn) userRow["Morning Check-In"] = morningCheckIn;
                    if (morningCheckOut) userRow["Morning Check-Out"] = morningCheckOut;
                    if (afternoonCheckIn) userRow["Afternoon Check-In"] = afternoonCheckIn;
                    if (afternoonCheckOut) userRow["Afternoon Check-Out"] = afternoonCheckOut;
                    if (totalHours) userRow["Total Hours"] = totalHours;
                    await userRow.save();
                }
            }

            console.log(`✅ Processed batch of ${batchEntries.length} updates.`);
            await new Promise(resolve => setTimeout(resolve, 1000));  
        }

        console.log("✅ Google Sheets batch update completed");
    } catch (error) {
        console.error("❌ Google Sheets Batch Update Error:", error);
    }
}


module.exports = { queueGoogleSheetUpdate };
