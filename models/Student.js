const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    fullName: { type: String },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    password: { type: String },
    otp: { type: String },
    otpExpiresAt: { type: Date, index: { expires: '3m' } },
    dob: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    currentCity: { type: String },
    homeCity: { type: String },
    skills: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);