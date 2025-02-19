require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// ✅ Middleware
app.use(cors());
app.use(express.json()); // 

// ✅ Import Routes
const attendanceRoutes = require('./routes/attendanceRoutes'); 
app.use('/attendance', attendanceRoutes);

// ✅ Base Route
app.get('/', (req, res) => {
    res.send('✅ Attendance Backend Running with Google Sheets!');
});

// ✅ Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
