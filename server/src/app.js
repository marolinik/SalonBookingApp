require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

// Import database
const { initDatabase, getAll } = require('./db/database');

// Import routes
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const clientRoutes = require('./routes/clients');
const serviceRoutes = require('./routes/services');

// Import services
const smsService = require('./services/sms');

// Create Express app
const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../../client')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/services', serviceRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Nešto je pošlo po zlu!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Schedule SMS reminders - every day at 18:00
cron.schedule('0 18 * * *', async () => {
    console.log('🔔 Pokrećem slanje SMS podsetnika...');
    
    try {
        // Dohvati sve termine za sutra
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = formatDateISO(tomorrow);
        
        const appointments = await getAll(`
            SELECT 
                a.*,
                s.naziv as service_name,
                u.ime as employee_name
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            JOIN users u ON a.user_id = u.id
            WHERE DATE(a.datum_vreme) = DATE(?)
            AND a.status = 'scheduled'
        `, [tomorrowStr]);
        
        // Pošalji podsetnik za svaki termin
        for (const appointment of appointments) {
            const clients = await getAll(`
                SELECT c.* FROM clients c
                JOIN appointment_clients ac ON c.id = ac.client_id
                WHERE ac.appointment_id = ?
            `, [appointment.id]);
            
            for (const client of clients) {
                await smsService.sendAppointmentReminder(appointment, client);
            }
        }
        
        console.log(`✅ Poslato ${appointments.length} podsetnika`);
    } catch (error) {
        console.error('❌ Greška pri slanju podsetnika:', error);
    }
});

// Helper function for date formatting
function formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Initialize database and start server
initDatabase();

app.listen(PORT, () => {
    console.log(`
🚀 Helios Server je pokrenut!
📍 Port: ${PORT}
🌐 URL: http://localhost:${PORT}
📱 API: http://localhost:${PORT}/api
🔐 Korisnici: dragana (dragana123), snezana (snezana123)
    `);
}); 