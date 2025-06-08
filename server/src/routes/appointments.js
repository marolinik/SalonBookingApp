const express = require('express');
const { getAll, getOne, runQuery } = require('../db/database');
const authMiddleware = require('../middleware/auth');
const smsService = require('../services/sms');

const router = express.Router();

// Svi termini za određeni datum ili period
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { date, startDate, endDate } = req.query;
        let query = `
            SELECT 
                a.*,
                s.naziv as service_name,
                s.trajanje as duration,
                s.is_group,
                u.ime as employee_name
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN users u ON a.user_id = u.id
        `;
        
        const params = [];
        
        if (date) {
            query += " WHERE DATE(a.datum_vreme) = DATE(?)";
            params.push(date);
        } else if (startDate && endDate) {
            query += " WHERE DATE(a.datum_vreme) BETWEEN DATE(?) AND DATE(?)";
            params.push(startDate, endDate);
        }
        
        query += " ORDER BY a.datum_vreme";
        
        const appointments = await getAll(query, params);
        
        // Za svaki termin, dohvati klijente posebno
        const formattedAppointments = await Promise.all(appointments.map(async (apt) => {
            const clients = await getAll(`
                SELECT c.id, c.ime, c.telefon 
                FROM clients c
                JOIN appointment_clients ac ON c.id = ac.client_id
                WHERE ac.appointment_id = ?
            `, [apt.id]);
            
            return {
                ...apt,
                clients
            };
        }));
        
        res.json(formattedAppointments);
    } catch (error) {
        console.error('Greška pri dohvatanju termina:', error);
        res.status(500).json({ error: 'Greška pri dohvatanju termina' });
    }
});

// Jedan termin
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const appointment = await getOne(`
            SELECT 
                a.*,
                s.naziv as service_name,
                s.trajanje as duration,
                s.is_group,
                u.ime as employee_name
            FROM appointments a
            LEFT JOIN services s ON a.service_id = s.id
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.id = ?
        `, [req.params.id]);
        
        if (!appointment) {
            return res.status(404).json({ error: 'Termin nije pronađen' });
        }
        
        // Dohvati klijente
        const clients = await getAll(`
            SELECT c.* FROM clients c
            JOIN appointment_clients ac ON c.id = ac.client_id
            WHERE ac.appointment_id = ?
        `, [req.params.id]);
        
        appointment.clients = clients;
        
        res.json(appointment);
    } catch (error) {
        console.error('Greška pri dohvatanju termina:', error);
        res.status(500).json({ error: 'Greška pri dohvatanju termina' });
    }
});

// Kreiraj novi termin
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { 
            service_id, 
            datum_vreme, 
            clients, 
            user_id 
        } = req.body;
        
        console.log('Creating appointment with data:', { service_id, datum_vreme, clients, user_id });
        
        // Validacija
        if (!service_id || !datum_vreme || !clients || clients.length === 0) {
            return res.status(400).json({ error: 'Svi podaci su obavezni' });
        }
        
        // Dohvati uslugu
        console.log('Fetching service with ID:', service_id);
        const service = await getOne('SELECT * FROM services WHERE id = ?', [service_id]);
        console.log('Service found:', service);
        if (!service) {
            return res.status(404).json({ error: 'Usluga nije pronađena' });
        }
        
        // Proveri da li je grupna usluga
        if (service.is_group && clients.length > service.max_participants) {
            return res.status(400).json({ 
                error: `Maksimalan broj učesnika je ${service.max_participants}` 
            });
        }
        
        // Kreiraj termin
        console.log('Creating appointment with values:', {
            naziv_termina: service.naziv,
            service_id,
            user_id: user_id || req.user.id,
            datum_vreme,
            max_ucesnika: service.max_participants
        });
        
        const result = await runQuery(`
            INSERT INTO appointments (
                naziv_termina, service_id, user_id, datum_vreme, max_ucesnika
            ) VALUES (?, ?, ?, ?, ?)
        `, [
            service.naziv,
            service_id,
            user_id || req.user.id,
            datum_vreme,
            service.max_participants
        ]);
        
        console.log('Appointment created, result:', result);
        const appointmentId = result.id;
        
        // Dodaj klijente
        for (const client of clients) {
            console.log('Processing client:', client);
            let clientId;
            
            // Proveri da li klijent već postoji
            const existingClient = await getOne(
                'SELECT id FROM clients WHERE telefon = ?', 
                [client.telefon]
            );
            console.log('Existing client check:', existingClient);
            
            if (existingClient) {
                clientId = existingClient.id;
                // Ažuriraj ime ako je potrebno
                await runQuery(
                    'UPDATE clients SET ime = ? WHERE id = ?',
                    [client.ime, clientId]
                );
            } else {
                // Kreiraj novog klijenta
                const clientResult = await runQuery(
                    'INSERT INTO clients (ime, telefon, email) VALUES (?, ?, ?)',
                    [client.ime, client.telefon, client.email || null]
                );
                clientId = clientResult.id;
            }
            
            // Poveži klijenta sa terminom
            await runQuery(
                'INSERT INTO appointment_clients (appointment_id, client_id) VALUES (?, ?)',
                [appointmentId, clientId]
            );
            
            // Pošalji SMS potvrdu
            console.log('Preparing SMS data, req.user:', req.user);
            const appointmentData = {
                id: appointmentId,
                service_name: service.naziv,
                datum_vreme,
                employee_name: req.user.ime
            };
            
            await smsService.sendAppointmentConfirmation(appointmentData, client);
        }
        
        res.status(201).json({ 
            id: appointmentId, 
            message: 'Termin uspešno kreiran' 
        });
        
    } catch (error) {
        console.error('Greška pri kreiranju termina:', error);
        res.status(500).json({ error: 'Greška pri kreiranju termina' });
    }
});

// Ažuriraj termin
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { status, datum_vreme, placeno } = req.body;
        const appointmentId = req.params.id;
        
        // Proveri da li termin postoji
        const appointment = await getOne(
            'SELECT * FROM appointments WHERE id = ?', 
            [appointmentId]
        );
        
        if (!appointment) {
            return res.status(404).json({ error: 'Termin nije pronađen' });
        }
        
        // Pripremi update query
        const updates = [];
        const params = [];
        
        if (status !== undefined) {
            updates.push('status = ?');
            params.push(status);
        }
        
        if (datum_vreme !== undefined) {
            updates.push('datum_vreme = ?');
            params.push(datum_vreme);
        }
        
        if (placeno !== undefined) {
            updates.push('placeno = ?');
            params.push(placeno ? 1 : 0);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nema podataka za ažuriranje' });
        }
        
        params.push(appointmentId);
        
        await runQuery(
            `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
            params
        );
        
        // Ako je termin otkazan, pošalji SMS
        if (status === 'cancelled') {
            const clients = await getAll(`
                SELECT c.* FROM clients c
                JOIN appointment_clients ac ON c.id = ac.client_id
                WHERE ac.appointment_id = ?
            `, [appointmentId]);
            
            const appointmentData = await getOne(`
                SELECT a.*, s.naziv as service_name, u.ime as employee_name
                FROM appointments a
                JOIN services s ON a.service_id = s.id
                JOIN users u ON a.user_id = u.id
                WHERE a.id = ?
            `, [appointmentId]);
            
            for (const client of clients) {
                await smsService.sendAppointmentCancellation(appointmentData, client);
            }
        }
        
        res.json({ message: 'Termin uspešno ažuriran' });
        
    } catch (error) {
        console.error('Greška pri ažuriranju termina:', error);
        res.status(500).json({ error: 'Greška pri ažuriranju termina' });
    }
});

// Obriši termin
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const appointmentId = req.params.id;
        
        // Proveri da li termin postoji
        const appointment = await getOne(
            'SELECT * FROM appointments WHERE id = ?', 
            [appointmentId]
        );
        
        if (!appointment) {
            return res.status(404).json({ error: 'Termin nije pronađen' });
        }
        
        // Obriši termin (appointment_clients će se obrisati automatski zbog CASCADE)
        await runQuery('DELETE FROM appointments WHERE id = ?', [appointmentId]);
        
        res.json({ message: 'Termin uspešno obrisan' });
        
    } catch (error) {
        console.error('Greška pri brisanju termina:', error);
        res.status(500).json({ error: 'Greška pri brisanju termina' });
    }
});

module.exports = router; 