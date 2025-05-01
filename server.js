const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');
// ============================================ //
// **** Import Routes vaaala section Start **** //
// ============================================ //

const studentRoutes = require("./routes/studentRoutes");

// ============================================ //
// **** Import DB connection section start **** //
// =========================================== //

const connectDB = require("./config/db");


// =========================================================== //
// **** Custome Vareable Or TRhe funcation Vaala section **** //
// ========================================================= //

const app = express();
app.use(cookieParser());
const PORT = process.env.PORT;

// ============================================ //
// ********* Middleware section Start ********* //
// =========================================== //

// ======================
// Initialize CORS
// ======================

app.use(
    cors({
        origin: "https://cluematrixtask.netlify.app",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true,
    })
);

// ======================
// Initialize Body Parser
// ======================

app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "150mb" }));

// ======================
// Initialize MongoDB Connection
// ======================

connectDB();

// ============================================ //
// ********** Routes  section Start ********** //
// =========================================== //

// ======================
// Initialize Student Routes
// ======================

app.use("/api/students", studentRoutes);

app.get("/", (req, res) => {
    res.send("Hello from the serversss!");
});

// Start Server

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});