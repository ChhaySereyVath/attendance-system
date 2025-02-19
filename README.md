#Ministry Attendance System

Overview:
The attendance system is a web-based attendance management system desgined for the employees to check-in and check-out on mobile phone during the work. It uses Google Sheets for storing records, FireStore for real-time data processing, and Ionic-Angular frontend for user experience.
The system provides:
- Check-In & Check-Out with real-time data updates.
- Location Validation to ensure employees are within the ministry's location.
- Google Sheets Integration to maintain attendance records.
- Firestore for Backend Processing to ensure fast and error-free updates.

#Project Structure:
/attendance-system
│── /attendance-app (Frontend)
│── /attendance-backend (Backend)
│── README.md

#Frontend (Ionic-Angular)
- Employees check in/out through an Ionic-Angular web app.
- Geolocation validation ensures they are at the ministry before logging attendance.
- UI displays real-time check-in/check-out times.

#Backend (Node.js & Firebase)
- Firestore manages check-in/out data.
- Google Sheets serves as an Excel-like database for attendance tracking.
- The backend processes requests from the frontend and updates Firestore/Google Sheets.



