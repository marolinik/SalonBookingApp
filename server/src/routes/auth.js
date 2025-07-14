const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getOne } = require('../db/database');

const router = express.Router();

// Login ruta
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('Login pokušaj za korisnika:', username);

        // Validacija
        if (!username || !password) {
            return res.status(400).json({ error: 'Username i password su obavezni' });
        }

        // Pronađi korisnika
        console.log('Tražim korisnika sa username:', username);
        const user = await getOne('SELECT * FROM users WHERE username = ?', [username]);
        console.log('Rezultat pretrage:', user ? `Korisnik pronađen: ${user.username}` : 'Korisnik nije pronađen');

        if (!user) {
            return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka' });
        }

        // Proveri lozinku
        console.log('Provera lozinke za korisnika:', user.username);
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('Lozinka validna:', isValidPassword);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka' });
        }

        // Kreiraj token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                ime: user.ime 
            },
            process.env.JWT_SECRET || 'helios_salon_secret_key_2024',
            { expiresIn: '7d' }
        );

        // Vrati korisnika i token
        res.json({
            token,
            user: {
                id: user.id,
                ime: user.ime,
                username: user.username
            }
        });

    } catch (error) {
        console.error('Login greška:', error);
        res.status(500).json({ error: 'Greška pri prijavljivanju' });
    }
});

// Proveri token
router.get('/verify', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Nema tokena' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'helios_salon_secret_key_2024');
        const user = await getOne('SELECT id, ime, username FROM users WHERE id = ?', [decoded.id]);

        if (!user) {
            return res.status(401).json({ error: 'Korisnik ne postoji' });
        }

        res.json({ user });

    } catch (error) {
        res.status(401).json({ error: 'Nevažeći token' });
    }
});

module.exports = router; 