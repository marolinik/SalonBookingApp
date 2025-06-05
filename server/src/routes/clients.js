const express = require('express');
const { getAll, getOne, runQuery } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Svi klijenti sa pretragom
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT * FROM clients';
        const params = [];
        
        if (search) {
            query += ' WHERE ime LIKE ? OR telefon LIKE ? OR email LIKE ?';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }
        
        query += ' ORDER BY ime';
        
        const clients = await getAll(query, params);
        
        // Dodaj statistiku za svakog klijenta
        const clientsWithStats = await Promise.all(clients.map(async (client) => {
            // Broj poseta
            const visitCount = await getOne(`
                SELECT COUNT(*) as count 
                FROM appointment_clients ac
                JOIN appointments a ON ac.appointment_id = a.id
                WHERE ac.client_id = ? AND a.status = 'finished'
            `, [client.id]);
            
            // Poslednja poseta
            const lastVisit = await getOne(`
                SELECT MAX(a.datum_vreme) as last_visit
                FROM appointment_clients ac
                JOIN appointments a ON ac.appointment_id = a.id
                WHERE ac.client_id = ? AND a.status = 'finished'
            `, [client.id]);
            
            return {
                ...client,
                visits: visitCount.count,
                lastVisit: lastVisit.last_visit
            };
        }));
        
        res.json(clientsWithStats);
    } catch (error) {
        console.error('Greška pri dohvatanju klijenata:', error);
        res.status(500).json({ error: 'Greška pri dohvatanju klijenata' });
    }
});

// Jedan klijent sa istorijom
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const client = await getOne('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        
        if (!client) {
            return res.status(404).json({ error: 'Klijent nije pronađen' });
        }
        
        // Dohvati istoriju termina
        const appointments = await getAll(`
            SELECT 
                a.*,
                s.naziv as service_name,
                u.ime as employee_name
            FROM appointments a
            JOIN appointment_clients ac ON a.id = ac.appointment_id
            JOIN services s ON a.service_id = s.id
            JOIN users u ON a.user_id = u.id
            WHERE ac.client_id = ?
            ORDER BY a.datum_vreme DESC
        `, [req.params.id]);
        
        client.appointments = appointments;
        
        res.json(client);
    } catch (error) {
        console.error('Greška pri dohvatanju klijenta:', error);
        res.status(500).json({ error: 'Greška pri dohvatanju klijenta' });
    }
});

// Kreiraj novog klijenta
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { ime, telefon, email } = req.body;
        
        // Validacija
        if (!ime || !telefon) {
            return res.status(400).json({ error: 'Ime i telefon su obavezni' });
        }
        
        // Proveri da li klijent već postoji
        const existing = await getOne('SELECT id FROM clients WHERE telefon = ?', [telefon]);
        if (existing) {
            return res.status(400).json({ error: 'Klijent sa ovim brojem telefona već postoji' });
        }
        
        // Kreiraj klijenta
        const result = await runQuery(
            'INSERT INTO clients (ime, telefon, email) VALUES (?, ?, ?)',
            [ime, telefon, email || null]
        );
        
        res.status(201).json({ 
            id: result.id, 
            message: 'Klijent uspešno kreiran' 
        });
        
    } catch (error) {
        console.error('Greška pri kreiranju klijenta:', error);
        res.status(500).json({ error: 'Greška pri kreiranju klijenta' });
    }
});

// Ažuriraj klijenta
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { ime, telefon, email } = req.body;
        const clientId = req.params.id;
        
        // Proveri da li klijent postoji
        const client = await getOne('SELECT * FROM clients WHERE id = ?', [clientId]);
        if (!client) {
            return res.status(404).json({ error: 'Klijent nije pronađen' });
        }
        
        // Pripremi update
        const updates = [];
        const params = [];
        
        if (ime !== undefined) {
            updates.push('ime = ?');
            params.push(ime);
        }
        
        if (telefon !== undefined) {
            // Proveri da li novi broj već postoji kod drugog klijenta
            const existing = await getOne(
                'SELECT id FROM clients WHERE telefon = ? AND id != ?', 
                [telefon, clientId]
            );
            if (existing) {
                return res.status(400).json({ 
                    error: 'Klijent sa ovim brojem telefona već postoji' 
                });
            }
            updates.push('telefon = ?');
            params.push(telefon);
        }
        
        if (email !== undefined) {
            updates.push('email = ?');
            params.push(email);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nema podataka za ažuriranje' });
        }
        
        params.push(clientId);
        
        await runQuery(
            `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`,
            params
        );
        
        res.json({ message: 'Klijent uspešno ažuriran' });
        
    } catch (error) {
        console.error('Greška pri ažuriranju klijenta:', error);
        res.status(500).json({ error: 'Greška pri ažuriranju klijenta' });
    }
});

// Obriši klijenta
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const clientId = req.params.id;
        
        // Proveri da li klijent postoji
        const client = await getOne('SELECT * FROM clients WHERE id = ?', [clientId]);
        if (!client) {
            return res.status(404).json({ error: 'Klijent nije pronađen' });
        }
        
        // Proveri da li klijent ima termine
        const hasAppointments = await getOne(
            'SELECT COUNT(*) as count FROM appointment_clients WHERE client_id = ?',
            [clientId]
        );
        
        if (hasAppointments.count > 0) {
            return res.status(400).json({ 
                error: 'Ne možete obrisati klijenta koji ima termine' 
            });
        }
        
        await runQuery('DELETE FROM clients WHERE id = ?', [clientId]);
        
        res.json({ message: 'Klijent uspešno obrisan' });
        
    } catch (error) {
        console.error('Greška pri brisanju klijenta:', error);
        res.status(500).json({ error: 'Greška pri brisanju klijenta' });
    }
});

// Statistika klijenata
router.get('/stats/overview', authMiddleware, async (req, res) => {
    try {
        // Ukupan broj klijenata
        const totalClients = await getOne('SELECT COUNT(*) as count FROM clients');
        
        // Novi klijenti ovog meseca
        const newClientsThisMonth = await getOne(`
            SELECT COUNT(*) as count FROM clients 
            WHERE ${process.env.DATABASE_URL ? 
            "TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM')" :
            "strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"}
        `);
        
        // Broj termina ove nedelje
        const appointmentsThisWeek = await getOne(`
            SELECT COUNT(DISTINCT a.id) as count 
            FROM appointments a
                    WHERE ${process.env.DATABASE_URL ?
            "DATE(a.datum_vreme) >= DATE_TRUNC('week', CURRENT_DATE) AND DATE(a.datum_vreme) < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'" :
            "DATE(a.datum_vreme) >= DATE('now', 'weekday 0', '-7 days') AND DATE(a.datum_vreme) < DATE('now', 'weekday 0')"}
        `);
        
        res.json({
            totalClients: totalClients.count,
            newThisMonth: newClientsThisMonth.count,
            appointmentsThisWeek: appointmentsThisWeek.count
        });
        
    } catch (error) {
        console.error('Greška pri dohvatanju statistike:', error);
        res.status(500).json({ error: 'Greška pri dohvatanju statistike' });
    }
});

module.exports = router; 