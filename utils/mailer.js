// utils/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // your Gmail address
        pass: process.env.EMAIL_PASS, // your Gmail App Password (not your normal password!)
    },
});

// Verify transporter
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ SMTP configuration error:', error);
    } else {
        console.log('✅ SMTP transporter is ready');
    }
});

module.exports = transporter;