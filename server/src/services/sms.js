const axios = require('axios');
const { runQuery } = require('../db/database');

class SMSService {
    constructor() {
        this.apiKey = process.env.SMS_API_KEY || 'test_key';
        this.apiUrl = process.env.SMS_API_URL || 'https://api.smsagent.rs/v1/sms/bulk';
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    // Pošalji SMS
    async sendSMS(phoneNumber, message) {
        try {
            if (!this.isProduction) {
                // U development modu samo loguj poruku
                console.log('📱 SMS (TEST MODE):', {
                    to: phoneNumber,
                    message: message
                });
                return { success: true, test: true };
            }

            // Pošalji pravi SMS u produkciji
            const response = await axios.post(this.apiUrl, {
                to: [phoneNumber],
                message: message,
                from: 'Helios'
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return { success: true, data: response.data };
        } catch (error) {
            console.error('Greška pri slanju SMS-a:', error);
            return { success: false, error: error.message };
        }
    }

    // Pošalji potvrdu termina
    async sendAppointmentConfirmation(appointment, client) {
        const message = `Poštovani/a ${client.ime},\nVaš termin za ${appointment.service_name} je zakazan za ${this.formatDate(appointment.datum_vreme)} u ${this.formatTime(appointment.datum_vreme)}h kod ${appointment.employee_name}.\nSalon Helios`;
        
        const result = await this.sendSMS(client.telefon, message);
        
        // Logiraj u bazu
        await runQuery(
            'INSERT INTO sms_log (appointment_id, tip_poruke, status) VALUES (?, ?, ?)',
            [appointment.id, 'confirmation', result.success ? 'sent' : 'failed']
        );
        
        return result;
    }

    // Pošalji podsetnik
    async sendAppointmentReminder(appointment, client) {
        const message = `Podsetnik: Imate zakazan termin za ${appointment.service_name} sutra u ${this.formatTime(appointment.datum_vreme)}h kod ${appointment.employee_name}.\nSalon Helios`;
        
        const result = await this.sendSMS(client.telefon, message);
        
        // Logiraj u bazu
        await runQuery(
            'INSERT INTO sms_log (appointment_id, tip_poruke, status) VALUES (?, ?, ?)',
            [appointment.id, 'reminder', result.success ? 'sent' : 'failed']
        );
        
        return result;
    }

    // Pošalji otkazivanje
    async sendAppointmentCancellation(appointment, client) {
        const message = `Vaš termin za ${appointment.service_name} zakazan za ${this.formatDate(appointment.datum_vreme)} u ${this.formatTime(appointment.datum_vreme)}h je otkazan.\nZa novi termin pozovite nas.\nSalon Helios`;
        
        const result = await this.sendSMS(client.telefon, message);
        
        // Logiraj u bazu
        await runQuery(
            'INSERT INTO sms_log (appointment_id, tip_poruke, status) VALUES (?, ?, ?)',
            [appointment.id, 'cancellation', result.success ? 'sent' : 'failed']
        );
        
        return result;
    }

    // Formatiraj datum
    formatDate(dateString) {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    // Formatiraj vreme
    formatTime(dateString) {
        const date = new Date(dateString);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }
}

module.exports = new SMSService(); 