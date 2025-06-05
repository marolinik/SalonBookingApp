const express = require('express');
const { getAll, getOne, runQuery } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Sve usluge
router.get('/', authMiddleware, async (req, res) => {
    try {
        const services = await getAll('SELECT * FROM services ORDER BY naziv');
        res.json(services);
    } catch (error) {
        console.error('Greška pri dohvatanju usluga:', error);
        res.status(500).json({ error: 'Greška pri dohvatanju usluga' });
    }
});

// Jedna usluga
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const service = await getOne('SELECT * FROM services WHERE id = ?', [req.params.id]);
        
        if (!service) {
            return res.status(404).json({ error: 'Usluga nije pronađena' });
        }
        
        res.json(service);
    } catch (error) {
        console.error('Greška pri dohvatanju usluge:', error);
        res.status(500).json({ error: 'Greška pri dohvatanju usluge' });
    }
});

// Kreiraj novu uslugu
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { naziv, trajanje, cena, is_group, max_participants } = req.body;
        
        // Validacija
        if (!naziv || !trajanje || !cena) {
            return res.status(400).json({ 
                error: 'Naziv, trajanje i cena su obavezni' 
            });
        }
        
        // Proveri da li usluga već postoji
        const existing = await getOne('SELECT id FROM services WHERE naziv = ?', [naziv]);
        if (existing) {
            return res.status(400).json({ 
                error: 'Usluga sa ovim nazivom već postoji' 
            });
        }
        
        // Kreiraj uslugu
        const result = await runQuery(
            `INSERT INTO services (naziv, trajanje, cena, is_group, max_participants) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                naziv, 
                trajanje, 
                cena, 
                is_group ? 1 : 0, 
                is_group ? (max_participants || 8) : 1
            ]
        );
        
        res.status(201).json({ 
            id: result.id, 
            message: 'Usluga uspešno kreirana' 
        });
        
    } catch (error) {
        console.error('Greška pri kreiranju usluge:', error);
        res.status(500).json({ error: 'Greška pri kreiranju usluge' });
    }
});

// Ažuriraj uslugu
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { naziv, trajanje, cena, is_group, max_participants } = req.body;
        const serviceId = req.params.id;
        
        // Proveri da li usluga postoji
        const service = await getOne('SELECT * FROM services WHERE id = ?', [serviceId]);
        if (!service) {
            return res.status(404).json({ error: 'Usluga nije pronađena' });
        }
        
        // Pripremi update
        const updates = [];
        const params = [];
        
        if (naziv !== undefined) {
            // Proveri da li novi naziv već postoji
            const existing = await getOne(
                'SELECT id FROM services WHERE naziv = ? AND id != ?', 
                [naziv, serviceId]
            );
            if (existing) {
                return res.status(400).json({ 
                    error: 'Usluga sa ovim nazivom već postoji' 
                });
            }
            updates.push('naziv = ?');
            params.push(naziv);
        }
        
        if (trajanje !== undefined) {
            updates.push('trajanje = ?');
            params.push(trajanje);
        }
        
        if (cena !== undefined) {
            updates.push('cena = ?');
            params.push(cena);
        }
        
        if (is_group !== undefined) {
            updates.push('is_group = ?');
            params.push(is_group ? 1 : 0);
        }
        
        if (max_participants !== undefined) {
            updates.push('max_participants = ?');
            params.push(max_participants);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nema podataka za ažuriranje' });
        }
        
        params.push(serviceId);
        
        await runQuery(
            `UPDATE services SET ${updates.join(', ')} WHERE id = ?`,
            params
        );
        
        res.json({ message: 'Usluga uspešno ažurirana' });
        
    } catch (error) {
        console.error('Greška pri ažuriranju usluge:', error);
        res.status(500).json({ error: 'Greška pri ažuriranju usluge' });
    }
});

// Obriši uslugu
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const serviceId = req.params.id;
        
        // Proveri da li usluga postoji
        const service = await getOne('SELECT * FROM services WHERE id = ?', [serviceId]);
        if (!service) {
            return res.status(404).json({ error: 'Usluga nije pronađena' });
        }
        
        // Proveri da li usluga ima termine
        const hasAppointments = await getOne(
            'SELECT COUNT(*) as count FROM appointments WHERE service_id = ?',
            [serviceId]
        );
        
        if (hasAppointments.count > 0) {
            return res.status(400).json({ 
                error: 'Ne možete obrisati uslugu koja ima zakazane termine' 
            });
        }
        
        await runQuery('DELETE FROM services WHERE id = ?', [serviceId]);
        
        res.json({ message: 'Usluga uspešno obrisana' });
        
    } catch (error) {
        console.error('Greška pri brisanju usluge:', error);
        res.status(500).json({ error: 'Greška pri brisanju usluge' });
    }
});

module.exports = router; 