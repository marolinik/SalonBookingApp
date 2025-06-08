const jwt = require('jsonwebtoken');
const { getOne } = require('../db/database');

const authMiddleware = async (req, res, next) => {
    // Uzmi token iz header-a
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Pristup odbijen. Nema tokena.' });
    }

    try {
        // Verifikuj token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'helios_salon_secret_key_2024');
        
        // Učitaj prave podatke korisnika iz baze
        const user = await getOne('SELECT id, username, ime FROM users WHERE id = ?', [decoded.id]);
        
        if (!user) {
            return res.status(401).json({ error: 'Korisnik ne postoji.' });
        }
        
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Nevažeći token.' });
    }
};

module.exports = authMiddleware; 