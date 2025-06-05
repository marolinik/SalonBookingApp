const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Uzmi token iz header-a
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Pristup odbijen. Nema tokena.' });
    }

    try {
        // Verifikuj token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'helios_salon_secret_key_2024');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Nevažeći token.' });
    }
};

module.exports = authMiddleware; 