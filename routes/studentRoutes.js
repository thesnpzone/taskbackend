const express = require("express");
const bcrypt = require("bcryptjs");
const dns = require("dns");
const axios = require("axios");
const emailExistence = require("email-existence");
const jwt = require("jsonwebtoken");

const Student = require("../models/Student");

const verifyStudentToken = require('../Middleware/verifyStudentToken');

const transporter = require("../utils/mailer");
require("dotenv").config();

const router = express.Router();

// ---------------------- Helper Functions ---------------------- //

async function isDisposableEmail(email) {
    try {
        const response = await axios.get(
            `https://disposable.debounce.io/?email=${email}`
        );
        return response.data.disposable === "true";
    } catch (error) {
        console.error("Error checking disposable email:", error);
        return false;
    }
}

function checkEmailDomain(email) {
    return new Promise((resolve) => {
        const domain = email.split("@")[1];
        dns.resolveMx(domain, (err, addresses) => {
            resolve(!err && addresses && addresses.length > 0);
        });
    });
}

async function verifyEmailExists(email) {
    return new Promise((resolve) => {
        emailExistence.check(email, (err, exists) => {
            if (err) {
                console.error("Error verifying email existence:", err);
                resolve(false);
            } else {
                resolve(exists);
            }
        });
    });
}



// ---------------------- Utility Funcation ---------------------- //

function generateOtp() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// ======================
// Routes: Student Registration
// ======================

router.post("/register", async(req, res) => {
    try {
        const { email, mobile } = req.body;

        if (!email ||
            !mobile
        ) {
            return res
                .status(400)
                .json({ message: "All fields are required including reCAPTCHA token" });
        }

        if (!/^\d{10}$/.test(mobile)) {
            return res.status(400).json({ message: "Invalid mobile number" });
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }



        const alreadyRegisteredByEmail = await Student.findOne({ email });
        if (alreadyRegisteredByEmail) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const alreadyRegisteredByPhone = await Student.findOne({ mobile });
        if (alreadyRegisteredByPhone) {
            return res
                .status(400)
                .json({ message: "Mobile Number already registered" });
        }

        const isDisposable = await isDisposableEmail(email);
        if (isDisposable) {
            return res.status(400).json({ message: "Disposable email not allowed" });
        }

        const domainValid = await checkEmailDomain(email);
        if (!domainValid) {
            return res.status(400).json({ message: "Invalid email domain" });
        }

        const emailExists = await verifyEmailExists(email);
        if (!emailExists) {
            return res.status(400).json({ message: "Email does not exist" });
        }

        const otpCode = generateOtp();

        const newStudent = new Student({

            email,
            mobile,
            otp: otpCode,
            otpExpiresAt: new Date(Date.now() + 180 * 1000),
        });

        await newStudent.save();

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "OTP for ClueMatrix Registration",
            html: `<p>Hello user,</p><p>Your OTP is <strong>${otpCode}</strong>. It is valid for 3 minutes.</p>`,
        });

        res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Server error during registration" });
    }
});

// ======================
// Routes: Verify Register Student mail  bby OTP
// ======================

router.post("/verify-otp", async(req, res) => {
    try {
        const { email, otp, password } = req.body;

        // Validate input
        if (!email || !otp || !password) {
            return res
                .status(400)
                .json({ message: "Email, OTP, and password are required" });
        }

        // Find the student record with the provided email

        const student = await Student.findOne({ email });


        if (!student) {
            return res.status(404).json({ message: "Student not found, Try Again" });
        }

        // Check if OTP matches
        if (student.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP. Please try again." });
        }

        // password secuser using hash

        const hashedPassword = await bcrypt.hash(password, 10);

        // Save password and remove OTP fields

        await Student.updateOne({ email }, {
            $set: { password: hashedPassword },

            $unset: { otp: 1, otpExpiresAt: 1 },
        });
        res
            .status(200)
            .json({ message: "OTP verified and password set successfully" });
    } catch (error) {
        console.error("OTP verify error:", error);
        res.status(500).json({ message: "Server error during OTP verification" });
    }
});

// ==========================
// Routes: Student Session Check
// ==========================

router.get("/check-session", (req, res) => {
    const token = req.cookies.studentSession;

    console.log(token);

    if (!token) {
        return res.json({ isLoggedIn: false });
    }

    return res.json({ isLoggedIn: true });
});

// ======================
// Routes: Student Login
// ======================

router.post("/login", async(req, res) => {
    try {
        const { email, password } = req.body;

        // Check if student exists in the database
        const student = await Student.findOne({ email });
        if (!student) {
            return res.status(400).json({ message: "Invalid email or password!" });
        }

        // Compare the provided password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password!" });
        }

        // Generate JWT token for authentication
        const token = jwt.sign({ id: student._id, email: student.email },
            process.env.JWT_SECRET, { expiresIn: "2h" }
        );

        // Set JWT token as an HttpOnly cookie
        res.cookie("studentSession", token, {
            maxAge: 7200000, // 2 hours
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
            domain: process.env.NODE_ENV === "production" ? "" : "localhost",
            path: "/",
        });

        console.log(token);

        res.json({ message: "Login successful!", token });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error!" });
    }
});

// ==========================
// Routes: Student Dashboard
// ==========================

router.get("/dashboard", verifyStudentToken, async(req, res) => {
    try {
        const studentId = req.student.id;
        const student = await Student.findById(studentId);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json({
            fullName: student.fullName,
            email: student.email,
            mobile: student.mobile,
            createdAt: student.createdAt,
            updatedAt: student.updatedAt,
            dob: student.dob || null,
            gender: student.gender || null,
            currentCity: student.currentCity || null,
            homeCity: student.homeCity || null,
            skills: student.skills || [],
        });
    } catch (error) {
        console.error("Error fetching student details:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================
// Route: Update Student Profile
// ==========================

router.put("/update-details", verifyStudentToken, async(req, res) => {
    try {
        const { fullName, dob, gender, currentCity, homeCity, skills } = req.body;

        // Validate DOB - Must be 18+ years
        const dobDate = new Date(dob);
        const today = new Date();
        const age = today.getFullYear() - dobDate.getFullYear();
        const hasBirthdayPassed =
            today.getMonth() > dobDate.getMonth() ||
            (today.getMonth() === dobDate.getMonth() && today.getDate() >= dobDate.getDate());

        const actualAge = hasBirthdayPassed ? age : age - 1;
        if (actualAge < 18) {
            return res.status(400).json({ message: "You must be at least 18 years old." });
        }

        const updatedStudent = await Student.findByIdAndUpdate(
            req.student.id, {
                fullName,
                dob,
                gender,
                currentCity,
                homeCity,
                skills,
            }, { new: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({ message: "Student not found." });
        }

        res.json({ message: "Profile updated successfully!", student: updatedStudent });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ message: "Server error!" });
    }
});



module.exports = router;