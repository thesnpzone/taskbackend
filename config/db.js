const mongoose = require('mongoose');

const connectDB = async() => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/student_auth');
        console.log("✅ MongoDB Connected");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1); // Exit the process with failure
    }
};

module.exports = connectDB;