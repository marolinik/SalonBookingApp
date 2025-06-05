// Clients view functions

// Load client statistics
async function loadClientStats() {
    try {
        const stats = await clientsAPI.getStats();
        document.getElementById('total-clients').textContent = stats.totalClients;
        document.getElementById('new-clients').textContent = stats.newThisMonth;
        document.getElementById('week-appointments').textContent = stats.appointmentsThisWeek;
    } catch (error) {
        console.error('Error loading client stats:', error);
    }
}

// Render clients list
async function renderClients(searchQuery = '') {
    try {
        const clients = await clientsAPI.getAll(searchQuery);
        const container = document.getElementById('clients-list');
        container.innerHTML = '';
        
        if (clients.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--gray-500); grid-column: 1/-1;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                    <div>Nema klijenata</div>
                </div>
            `;
            return;
        }
        
        clients.forEach(client => {
            const card = createClientCard(client);
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading clients:', error);
        showToast('Greška pri učitavanju klijenata');
    }
}

// Create client card element
function createClientCard(client) {
    const card = document.createElement('div');
    card.className = 'client-card';
    
    const initials = client.ime.split(' ').map(n => n[0]).join('');
    const lastVisitDate = client.lastVisit ? formatDate(new Date(client.lastVisit)) : 'Nema poseta';
    
    card.innerHTML = `
        <div class="card-actions">
            <button class="btn-icon" onclick="editClient(${client.id})" title="Izmeni">✏️</button>
            <button class="btn-icon btn-delete" onclick="deleteClient(${client.id}, '${client.ime}')" title="Obriši">🗑️</button>
        </div>
        <div onclick="showClientDetails(${JSON.stringify(client).replace(/"/g, '&quot;')})">
            <div class="client-avatar">${initials}</div>
            <div class="client-name">${client.ime}</div>
            <div class="client-contact">📱 ${client.telefon}</div>
            ${client.email ? `<div class="client-contact">✉️ ${client.email}</div>` : ''}
            <div class="client-meta">
                <div class="meta-item">
                    Poseta: <span class="meta-value">${client.visits || 0}</span>
                </div>
                <div class="meta-item">
                    Poslednja: <span class="meta-value">${lastVisitDate}</span>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

// Search clients
function searchClients(query) {
    renderClients(query);
}

// Show client details
async function showClientDetails(client) {
    try {
        const fullClient = await clientsAPI.getOne(client.id);
        
        const modalBody = document.getElementById('client-modal-body');
        modalBody.innerHTML = `
            <div class="client-detail-header">
                <div class="client-avatar" style="width: 80px; height: 80px; font-size: 2rem;">
                    ${client.ime.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                    <h2>${fullClient.ime}</h2>
                    <p style="color: var(--gray-600);">📱 ${fullClient.telefon}</p>
                    ${fullClient.email ? `<p style="color: var(--gray-600);">✉️ ${fullClient.email}</p>` : ''}
                </div>
            </div>
            
            <div style="margin-top: 2rem;">
                <h3 style="margin-bottom: 1rem;">Istorija termina</h3>
                <div class="appointments-history">
                    ${fullClient.appointments && fullClient.appointments.length > 0 ? 
                        fullClient.appointments.map(apt => `
                            <div class="appointment-history-item" style="
                                padding: 1rem;
                                background: var(--gray-100);
                                border-radius: var(--radius-sm);
                                margin-bottom: 0.5rem;
                            ">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div>
                                        <strong>${apt.service_name}</strong>
                                        <div style="color: var(--gray-600); font-size: 0.875rem;">
                                            ${formatDate(new Date(apt.datum_vreme))} u ${formatTime(apt.datum_vreme)}
                                        </div>
                                        <div style="color: var(--gray-600); font-size: 0.875rem;">
                                            Kod: ${apt.employee_name}
                                        </div>
                                    </div>
                                    <div>
                                        <span class="badge ${apt.status}" style="
                                            padding: 0.25rem 0.75rem;
                                            border-radius: var(--radius-xs);
                                            font-size: 0.75rem;
                                            font-weight: 600;
                                            background: ${apt.status === 'finished' ? 'var(--success)' : 
                                                         apt.status === 'cancelled' ? 'var(--danger)' : 
                                                         'var(--primary)'};
                                            color: white;
                                        ">
                                            ${apt.status === 'finished' ? 'Završen' : 
                                              apt.status === 'cancelled' ? 'Otkazan' : 
                                              'Zakazan'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `).join('') : 
                        '<p style="text-align: center; color: var(--gray-500);">Nema prethodnih termina</p>'
                    }
                </div>
            </div>
            
            <div class="btn-group" style="margin-top: 2rem;">
                <button class="btn btn-primary" onclick="bookAppointmentForClient(${client.id}, '${client.ime}', '${client.telefon}')">
                    Zakaži novi termin
                </button>
                <button class="btn btn-secondary" onclick="closeClientModal()">
                    Zatvori
                </button>
            </div>
        `;
        
        document.getElementById('client-modal-title').textContent = 'Detalji klijenta';
        document.getElementById('client-modal').classList.add('active');
        
    } catch (error) {
        showToast('Greška pri učitavanju detalja klijenta');
    }
}

// Book appointment for specific client
function bookAppointmentForClient(clientId, clientName, clientPhone) {
    closeClientModal();
    openNewAppointment();
    
    // Pre-fill client data
    setTimeout(() => {
        document.getElementById('client-name').value = clientName;
        document.getElementById('client-phone').value = clientPhone;
    }, 100);
}

// Client Form Functions
function openNewClient() {
    document.getElementById('client-form-title').textContent = 'Novi klijent';
    document.getElementById('client-form').reset();
    document.getElementById('client-id').value = '';
    document.getElementById('client-form-modal').classList.add('active');
}

function closeClientFormModal() {
    document.getElementById('client-form-modal').classList.remove('active');
}

async function editClient(clientId) {
    try {
        const client = await clientsAPI.getOne(clientId);
        document.getElementById('client-form-title').textContent = 'Izmeni klijenta';
        document.getElementById('client-id').value = client.id;
        document.getElementById('client-form-name').value = client.ime;
        document.getElementById('client-form-phone').value = client.telefon;
        document.getElementById('client-form-email').value = client.email || '';
        document.getElementById('client-form-modal').classList.add('active');
    } catch (error) {
        showToast('Greška pri učitavanju podataka klijenta');
    }
}

// Make sure handleClientSubmit is available globally
window.handleClientSubmit = async function(event) {
    event.preventDefault();
    
    const clientId = document.getElementById('client-id').value;
    const clientData = {
        ime: document.getElementById('client-form-name').value,
        telefon: document.getElementById('client-form-phone').value,
        email: document.getElementById('client-form-email').value || null
    };
    
    try {
        if (clientId) {
            // Update existing client
            await clientsAPI.update(clientId, clientData);
            showToast('Klijent uspešno ažuriran');
        } else {
            // Create new client
            await clientsAPI.create(clientData);
            showToast('Novi klijent uspešno dodat');
        }
        
        closeClientFormModal();
        await renderClients();
        await loadClientStats();
    } catch (error) {
        showToast(error.message || 'Greška pri čuvanju klijenta');
    }
}

async function deleteClient(clientId, clientName) {
    if (confirm(`Da li ste sigurni da želite da obrišete klijenta "${clientName}"?`)) {
        try {
            await clientsAPI.delete(clientId);
            showToast('Klijent uspešno obrisan');
            await renderClients();
            await loadClientStats();
        } catch (error) {
            showToast(error.message || 'Greška pri brisanju klijenta');
        }
    }
}

// Service Functions
async function renderServices() {
    try {
        const services = await servicesAPI.getAll();
        const container = document.getElementById('services-list');
        container.innerHTML = '';
        
        services.forEach(service => {
            const card = createServiceCard(service);
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading services:', error);
        showToast('Greška pri učitavanju usluga');
    }
}

// Create service card element
function createServiceCard(service) {
    const card = document.createElement('div');
    card.className = 'service-card';
    
    // Service icons mapping
    const icons = {
        'manikir': '💅',
        'pedikir': '🦶',
        'masaža': '💆‍♀️',
        'tretman': '✨',
        'depilacija': '🪒',
        'trening': '🏃‍♀️',
        'yoga': '🧘‍♀️',
        'pilates': '🤸‍♀️'
    };
    
    // Find matching icon
    let icon = '💅';
    for (const [key, value] of Object.entries(icons)) {
        if (service.naziv.toLowerCase().includes(key)) {
            icon = value;
            break;
        }
    }
    
    card.innerHTML = `
        <div class="card-actions">
            <button class="btn-icon" onclick="editService(${service.id})" title="Izmeni">✏️</button>
            <button class="btn-icon btn-delete" onclick="deleteService(${service.id}, '${service.naziv}')" title="Obriši">🗑️</button>
        </div>
        <div class="service-icon">${icon}</div>
        <div class="service-name">${service.naziv}</div>
        ${service.is_group ? `<div style="color: var(--gray-600); font-size: 0.875rem;">Grupna usluga (max ${service.max_participants || 8} učesnika)</div>` : ''}
        <div class="service-details">
            <div class="service-duration">⏱ ${service.trajanje} min</div>
            <div class="service-price">${service.cena.toLocaleString()} RSD</div>
        </div>
    `;
    
    return card;
}

// Service Form Functions
function openNewService() {
    document.getElementById('service-form-title').textContent = 'Nova usluga';
    document.getElementById('service-form').reset();
    document.getElementById('service-id').value = '';
    document.getElementById('max-participants-group').style.display = 'none';
    document.getElementById('service-form-max').disabled = true; // Disable by default
    document.getElementById('service-form-modal').classList.add('active');
}

function closeServiceFormModal() {
    document.getElementById('service-form-modal').classList.remove('active');
}

async function editService(serviceId) {
    try {
        console.log('Fetching service with ID:', serviceId); // Debug log
        const service = await servicesAPI.getOne(serviceId);
        console.log('Service data received:', service); // Debug log
        
        // Check if all elements exist before setting values
        const titleEl = document.getElementById('service-form-title');
        const idEl = document.getElementById('service-id');
        const nameEl = document.getElementById('service-form-name');
        const durationEl = document.getElementById('service-form-duration');
        const priceEl = document.getElementById('service-form-price');
        const groupEl = document.getElementById('service-form-group');
        const maxEl = document.getElementById('service-form-max');
        const modalEl = document.getElementById('service-form-modal');
        
        if (!titleEl || !idEl || !nameEl || !durationEl || !priceEl || !groupEl || !maxEl || !modalEl) {
            console.error('One or more form elements not found');
            showToast('Greška: Forma nije potpuno učitana');
            return;
        }
        
        titleEl.textContent = 'Izmeni uslugu';
        idEl.value = service.id;
        nameEl.value = service.naziv;
        
        // Set duration select value
        durationEl.value = service.trajanje.toString();
        
        priceEl.value = service.cena;
        groupEl.checked = Boolean(service.is_group);
        maxEl.value = service.max_participants || 1;
        
        toggleGroupOptions();
        modalEl.classList.add('active');
    } catch (error) {
        console.error('Error in editService:', error); // Better debug log
        showToast('Greška pri učitavanju podataka usluge');
    }
}

// Make sure handleServiceSubmit is available globally
window.handleServiceSubmit = async function(event) {
    event.preventDefault();
    console.log('handleServiceSubmit called'); // Debug log
    
    try {
        // Check form validity
        const form = document.getElementById('service-form');
        if (!form.checkValidity()) {
            console.error('Form is not valid');
            form.reportValidity();
            return;
        }
        
        const serviceId = document.getElementById('service-id').value;
        const isGroup = document.getElementById('service-form-group').checked;
        
        // Build service data
        const serviceData = {
            naziv: document.getElementById('service-form-name').value.trim(),
            trajanje: parseInt(document.getElementById('service-form-duration').value),
            cena: parseFloat(document.getElementById('service-form-price').value),
            is_group: isGroup
        };
        
        // Validate data
        if (!serviceData.naziv) {
            showToast('Naziv usluge je obavezan');
            return;
        }
        
        if (isNaN(serviceData.cena) || serviceData.cena < 0) {
            showToast('Cena mora biti pozitivan broj');
            return;
        }
        
        // Only add max_participants if it's a group service
        if (isGroup) {
            const maxParticipants = parseInt(document.getElementById('service-form-max').value);
            if (isNaN(maxParticipants) || maxParticipants < 2) {
                showToast('Maksimalan broj učesnika mora biti najmanje 2');
                return;
            }
            serviceData.max_participants = maxParticipants;
        } else {
            serviceData.max_participants = 1;
        }
        
        console.log('Service data:', serviceData); // Debug log
        console.log('Service ID:', serviceId); // Debug log
        
        if (serviceId) {
            // Update existing service
            console.log('Updating service with ID:', serviceId); // Debug log
            await servicesAPI.update(serviceId, serviceData);
            showToast('Usluga uspešno ažurirana');
        } else {
            // Create new service
            console.log('Creating new service'); // Debug log
            await servicesAPI.create(serviceData);
            showToast('Nova usluga uspešno dodata');
        }
        
        closeServiceFormModal();
        await renderServices();
        
        // Update services dropdown in appointment form
        if (typeof populateServiceDropdown === 'function' && typeof services !== 'undefined') {
            services = await servicesAPI.getAll();
            populateServiceDropdown();
        }
    } catch (error) {
        console.error('Error in handleServiceSubmit:', error); // Debug log
        showToast(error.message || 'Greška pri čuvanju usluge');
    }
}

async function deleteService(serviceId, serviceName) {
    if (confirm(`Da li ste sigurni da želite da obrišete uslugu "${serviceName}"?`)) {
        try {
            await servicesAPI.delete(serviceId);
            showToast('Usluga uspešno obrisana');
            await renderServices();
            
            // Update services dropdown in appointment form
            if (typeof populateServiceDropdown === 'function' && typeof services !== 'undefined') {
                services = await servicesAPI.getAll();
                populateServiceDropdown();
            }
        } catch (error) {
            showToast(error.message || 'Greška pri brisanju usluge');
        }
    }
} 