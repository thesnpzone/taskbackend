const jwt = require('jsonwebtoken');


const verifyStudentToken = (req, res, next) => {
    const token = req.cookies.studentSession;

    if (!token) {
        return res.status(401).json({ message: "Unauthorized! Token missing." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.student = decoded; // Attach student info to the request
        next();
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized! Invalid token." });
    }
};

module.exports = verifyStudentToken;