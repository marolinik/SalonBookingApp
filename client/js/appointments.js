// Appointments helper functions

// Quick appointment actions
async function quickFinishAppointment(appointmentId) {
    try {
        await appointmentsAPI.update(appointmentId, { 
            status: 'finished',
            placeno: true 
        });
        showToast('Termin označen kao završen');
        await renderCalendar();
    } catch (error) {
        showToast('Greška pri ažuriranju termina');
    }
}

async function quickCancelAppointment(appointmentId) {
    if (confirm('Da li ste sigurni da želite da otkažete termin?')) {
        try {
            await appointmentsAPI.update(appointmentId, { 
                status: 'cancelled' 
            });
            showToast('Termin je otkazan');
            await renderCalendar();
        } catch (error) {
            showToast('Greška pri otkazivanju termina');
        }
    }
}

// Edit appointment
async function editAppointment(appointmentId) {
    try {
        const appointment = await appointmentsAPI.getOne(appointmentId);
        
        // Open modal with appointment data
        document.getElementById('modal-title').textContent = 'Izmeni termin';
        document.getElementById('appointment-modal').classList.add('active');
        
        // Pre-fill form
        document.getElementById('service').value = appointment.service_id;
        onServiceChange(); // Trigger service change to show correct fields
        
        const datetime = new Date(appointment.datum_vreme);
        
        // Set date
        selectedAppointmentDate = new Date(datetime);
        document.getElementById('appointment-date').value = formatDateForInput(selectedAppointmentDate);
        
        // Set time
        document.getElementById('appointment-hour').value = datetime.getHours().toString().padStart(2, '0');
        const minutes = datetime.getMinutes();
        // Round to nearest 5 minutes
        const roundedMinutes = Math.round(minutes / 5) * 5;
        document.getElementById('appointment-minute').value = roundedMinutes.toString().padStart(2, '0');
        
        document.getElementById('employee').value = appointment.user_id;
        
        // Fill client data
        if (appointment.is_group) {
            appointment.clients.forEach((client, index) => {
                if (index > 0) addParticipant();
                const participantItems = document.querySelectorAll('.participant-item');
                const lastItem = participantItems[participantItems.length - 1];
                lastItem.querySelector('input[type="text"]').value = client.ime;
                lastItem.querySelector('input[type="tel"]').value = client.telefon;
            });
        } else {
            document.getElementById('client-name').value = appointment.clients[0].ime;
            document.getElementById('client-phone').value = appointment.clients[0].telefon;
        }
        
        // Change form submission to update instead of create
        const form = document.getElementById('appointment-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await updateAppointment(appointmentId);
        };
        
    } catch (error) {
        showToast('Greška pri učitavanju termina');
    }
}

// Update appointment
async function updateAppointment(appointmentId) {
    const service = document.getElementById('service');
    const selectedOption = service.options[service.selectedIndex];
    const isGroup = selectedOption.dataset.group === 'true';
    
    let clientsData = [];
    if (isGroup) {
        const participants = document.querySelectorAll('.participant-item');
        participants.forEach(p => {
            const name = p.querySelector('input[type="text"]').value;
            const phone = p.querySelector('input[type="tel"]').value;
            if (name && phone) {
                clientsData.push({ ime: name, telefon: phone });
            }
        });
    } else {
        const name = document.getElementById('client-name').value;
        const phone = document.getElementById('client-phone').value;
        clientsData.push({ ime: name, telefon: phone });
    }
    
    // Get date and time separately
    const hour = document.getElementById('appointment-hour').value;
    const minute = document.getElementById('appointment-minute').value;
    
    if (!selectedAppointmentDate || !hour || !minute) {
        showToast('Molimo izaberite datum i vreme');
        return;
    }
    
    // Combine date and time
    const datetime = new Date(selectedAppointmentDate);
    datetime.setHours(parseInt(hour), parseInt(minute), 0, 0);
    
    try {
        await appointmentsAPI.update(appointmentId, {
            datum_vreme: toLocalDateTimeString(datetime)
        });
        
        closeModal();
        showToast('Termin uspešno ažuriran');
        await renderCalendar();
        
        // Reset form submission back to create
        document.getElementById('appointment-form').onsubmit = handleAppointmentSubmit;
        
    } catch (error) {
        showToast(error.message || 'Greška pri ažuriranju termina');
    }
}

// Get appointment color based on status and employee
function getAppointmentColor(appointment) {
    if (appointment.status === 'cancelled') {
        return 'var(--danger)';
    } else if (appointment.status === 'finished') {
        return 'var(--success)';
    } else if (appointment.is_group) {
        return 'var(--warning)';
    } else if (appointment.user_id === 1) {
        return 'var(--dragana)';
    } else {
        return 'var(--snezana)';
    }
}

// Format appointment duration
function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes} min`;
    } else {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
} 