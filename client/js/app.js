// Global state
let currentUser = null;
let services = [];
let currentDate = new Date();
let currentView = 'day';
let participantCount = 0;

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    const token = getToken();
    if (token) {
        try {
            const response = await authAPI.verify();
            currentUser = response.user;
            showApp();
        } catch (error) {
            showLogin();
        }
    } else {
        showLogin();
    }

    // Setup all form event listeners
    setupFormListeners();
});

// Setup form event listeners
function setupFormListeners() {
    // Setup login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Setup appointment form
    const appointmentForm = document.getElementById('appointment-form');
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', handleAppointmentSubmit);
    }
    
    // Setup client form
    const clientForm = document.getElementById('client-form');
    if (clientForm) {
        clientForm.addEventListener('submit', handleClientSubmit);
        console.log('Client form listener added');
    }
    
    // Note: Service form submission is handled via onsubmit in HTML to avoid timing issues
}

// Login handling
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const response = await authAPI.login(username, password);
        currentUser = response.user;
        errorDiv.textContent = '';
        showApp();
    } catch (error) {
        errorDiv.textContent = error.message || 'Greška pri prijavljivanju';
    }
}

// Show/hide login and app
function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    
    // Update user info
    document.getElementById('user-name').textContent = currentUser.ime.split(' ')[0];
    document.getElementById('user-avatar').textContent = currentUser.ime.charAt(0);
    
    // Set employee dropdown default
    if (currentUser.username === 'snezana') {
        document.getElementById('employee').value = '2';
    }
    
    // Initialize app
    initializeApp();
}

// Initialize app components
async function initializeApp() {
    try {
        // Load services
        services = await servicesAPI.getAll();
        populateServiceDropdown();
        
        // Load initial data based on current view
        const activeTab = document.querySelector('.nav-tab.active');
        const viewName = activeTab.textContent.toLowerCase();
        
        if (viewName.includes('kalendar')) {
            await loadCalendarView();
        } else if (viewName.includes('klijenti')) {
            await loadClientsView();
        } else if (viewName.includes('usluge')) {
            await loadServicesView();
        }
        
    } catch (error) {
        showToast('Greška pri učitavanju podataka');
        console.error(error);
    }
}

// Logout
function logout() {
    authAPI.logout();
}

// View switching
function switchView(viewName) {
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    event.target.closest('.nav-tab').classList.add('active');
    
    // Update views
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(`${viewName}-view`).classList.add('active');
    
    // Load view data
    switch(viewName) {
        case 'calendar':
            loadCalendarView();
            break;
        case 'clients':
            loadClientsView();
            break;
        case 'services':
            loadServicesView();
            break;
    }
}

// Load calendar view
async function loadCalendarView() {
    await renderCalendar();
}

// Load clients view
async function loadClientsView() {
    await loadClientStats();
    await renderClients();
}

// Load services view
async function loadServicesView() {
    await renderServices();
}

// Populate service dropdown
function populateServiceDropdown() {
    const select = document.getElementById('service');
    select.innerHTML = '<option value="">Izaberite uslugu</option>';
    
    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = `${service.naziv} (${service.trajanje} min)`;
        option.dataset.duration = service.trajanje;
        option.dataset.group = service.is_group ? 'true' : 'false';
        option.dataset.max = service.max_participants || 8;
        select.appendChild(option);
    });
}

// Modal functions
function openNewAppointment() {
    resetForm();
    loadClientsDropdown();
    
    // Initialize time selectors if not already done
    if (document.getElementById('appointment-hour').options.length <= 1) {
        initializeTimeSelectors();
    }
    
    document.getElementById('appointment-modal').classList.add('active');
}

function openNewAppointmentWithTime(hour, minutes, employee = null) {
    resetForm();
    loadClientsDropdown();
    const datetime = new Date(currentDate);
    datetime.setHours(hour, minutes, 0, 0);
    
    // Set date
    selectedAppointmentDate = new Date(datetime);
    document.getElementById('appointment-date').value = formatDateForInput(selectedAppointmentDate);
    
    // Set time
    document.getElementById('appointment-hour').value = hour.toString().padStart(2, '0');
    document.getElementById('appointment-minute').value = minutes.toString().padStart(2, '0');
    
    if (employee) {
        document.getElementById('employee').value = employee === 'dragana' ? '1' : '2';
    }
    document.getElementById('appointment-modal').classList.add('active');
}

// Load clients into dropdown
async function loadClientsDropdown() {
    try {
        const clients = await clientsAPI.getAll();
        const select = document.getElementById('client-select');
        select.innerHTML = '<option value="">Izaberite klijenta</option><option value="new">➕ Dodaj novog klijenta</option>';
        
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.ime} - ${client.telefon}`;
            option.dataset.phone = client.telefon;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

// Handle client selection
function onClientSelect() {
    const select = document.getElementById('client-select');
    const clientDetails = document.getElementById('client-details');
    const clientName = document.getElementById('client-name');
    const clientPhone = document.getElementById('client-phone');
    
    if (select.value === 'new') {
        // Show fields for new client
        clientDetails.style.display = 'block';
        clientName.value = '';
        clientPhone.value = '';
        clientName.required = true;
        clientPhone.required = true;
    } else if (select.value) {
        // Existing client selected
        clientDetails.style.display = 'none';
        clientName.required = false;
        clientPhone.required = false;
        
        // Get client data from selected option
        const selectedOption = select.options[select.selectedIndex];
        const phone = selectedOption.dataset.phone;
        
        // Store client data for later use
        clientName.value = selectedOption.textContent.split(' - ')[0];
        clientPhone.value = phone;
    } else {
        // No selection
        clientDetails.style.display = 'none';
        clientName.required = false;
        clientPhone.required = false;
    }
}

function closeModal() {
    document.getElementById('appointment-modal').classList.remove('active');
}

function closeClientModal() {
    document.getElementById('client-modal').classList.remove('active');
}

function resetForm() {
    document.getElementById('appointment-form').reset();
    document.getElementById('single-client-section').style.display = 'block';
    document.getElementById('group-clients-section').style.display = 'none';
    document.getElementById('client-details').style.display = 'none';
    document.getElementById('participants-list').innerHTML = '';
    participantCount = 0;
    
    // Clear date selection
    selectedAppointmentDate = null;
    document.getElementById('appointment-date').value = '';
    
    // Set default employee based on current user
    if (currentUser) {
        document.getElementById('employee').value = currentUser.id;
    }
}

// Service change handler
function onServiceChange() {
    const select = document.getElementById('service');
    const option = select.options[select.selectedIndex];
    const isGroup = option.dataset.group === 'true';
    
    if (isGroup) {
        document.getElementById('single-client-section').style.display = 'none';
        document.getElementById('group-clients-section').style.display = 'block';
        document.getElementById('max-participants').textContent = option.dataset.max || '8';
        if (participantCount === 0) {
            addParticipant();
        }
    } else {
        document.getElementById('single-client-section').style.display = 'block';
        document.getElementById('group-clients-section').style.display = 'none';
    }
}

// Participants management for group appointments
function addParticipant() {
    const maxParticipants = parseInt(document.getElementById('max-participants').textContent);
    if (participantCount >= maxParticipants) {
        showToast(`Maksimalan broj učesnika je ${maxParticipants}`);
        return;
    }
    
    participantCount++;
    const participantsList = document.getElementById('participants-list');
    const participantDiv = document.createElement('div');
    participantDiv.className = 'participant-item';
    
    // Create select with existing clients
    let selectOptions = '<option value="">Izaberite klijenta</option><option value="new">➕ Novi klijent</option>';
    
    // We'll populate this async
    participantDiv.innerHTML = `
        <select class="form-select participant-select" onchange="onParticipantSelect(this)">
            ${selectOptions}
        </select>
        <div class="participant-details" style="display: none;">
            <input type="text" placeholder="Ime učesnika ${participantCount}" class="participant-name">
            <input type="tel" placeholder="Telefon" class="participant-phone">
        </div>
        <button type="button" class="btn-remove" onclick="removeParticipant(this)">×</button>
    `;
    
    participantsList.appendChild(participantDiv);
    updateParticipantCount();
    
    // Load clients for this participant select
    loadParticipantClients(participantDiv.querySelector('.participant-select'));
}

// Load clients for participant dropdown
async function loadParticipantClients(select) {
    try {
        const clients = await clientsAPI.getAll();
        
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.ime} - ${client.telefon}`;
            option.dataset.name = client.ime;
            option.dataset.phone = client.telefon;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading clients for participant:', error);
    }
}

// Handle participant selection
function onParticipantSelect(select) {
    const participantItem = select.closest('.participant-item');
    const details = participantItem.querySelector('.participant-details');
    const nameInput = participantItem.querySelector('.participant-name');
    const phoneInput = participantItem.querySelector('.participant-phone');
    
    if (select.value === 'new') {
        details.style.display = 'block';
        nameInput.value = '';
        phoneInput.value = '';
        nameInput.required = true;
        phoneInput.required = true;
    } else if (select.value) {
        details.style.display = 'none';
        nameInput.required = false;
        phoneInput.required = false;
        
        // Store client data
        const selectedOption = select.options[select.selectedIndex];
        nameInput.value = selectedOption.dataset.name;
        phoneInput.value = selectedOption.dataset.phone;
    } else {
        details.style.display = 'none';
        nameInput.required = false;
        phoneInput.required = false;
    }
}

function removeParticipant(button) {
    button.parentElement.remove();
    participantCount--;
    updateParticipantCount();
}

function updateParticipantCount() {
    document.getElementById('participant-count').textContent = participantCount;
}

// Handle appointment form submission
async function handleAppointmentSubmit(e) {
    e.preventDefault();
    
    const service = document.getElementById('service');
    const selectedOption = service.options[service.selectedIndex];
    const isGroup = selectedOption.dataset.group === 'true';
    
    let clientsData = [];
    
    if (isGroup) {
        // Handle group clients
        const participants = document.querySelectorAll('.participant-item');
        participants.forEach(p => {
            const select = p.querySelector('.participant-select');
            const nameInput = p.querySelector('.participant-name');
            const phoneInput = p.querySelector('.participant-phone');
            
            if (select.value || (nameInput.value && phoneInput.value)) {
                clientsData.push({
                    ime: nameInput.value,
                    telefon: phoneInput.value
                });
            }
        });
    } else {
        // Handle single client
        const clientSelect = document.getElementById('client-select');
        
        if (clientSelect.value === 'new' || clientSelect.value === '') {
            // New client or manual entry
            const name = document.getElementById('client-name').value;
            let phone = document.getElementById('client-phone').value;
            
            if (!name || !phone) {
                showToast('Molimo unesite podatke klijenta');
                return;
            }
            
            // Normalize phone number - remove spaces and ensure it starts with 0
            phone = phone.replace(/\s/g, '');
            if (phone.length === 9 && !phone.startsWith('0')) {
                phone = '0' + phone;
            }
            
            clientsData.push({ ime: name, telefon: phone });
        } else {
            // Existing client
            const name = document.getElementById('client-name').value;
            let phone = document.getElementById('client-phone').value;
            
            // Normalize phone number
            phone = phone.replace(/\s/g, '');
            if (phone.length === 9 && !phone.startsWith('0')) {
                phone = '0' + phone;
            }
            
            clientsData.push({ ime: name, telefon: phone });
        }
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
    
    const employeeId = document.getElementById('employee').value;
    
    const appointmentData = {
        service_id: parseInt(service.value),
        datum_vreme: toLocalDateTimeString(datetime),
        clients: clientsData,
        user_id: parseInt(employeeId)
    };
    
    try {
        console.log('Sending appointment data:', appointmentData);
        await appointmentsAPI.create(appointmentData);
        closeModal();
        showToast('Termin uspešno zakazan! SMS potvrda poslata.');
        await renderCalendar(); // Refresh calendar
    } catch (error) {
        console.error('Error creating appointment:', error);
        showToast(error.message || 'Greška pri zakazivanju termina');
    }
}

// Toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Touch support for mobile
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    if (Math.abs(touchEndX - touchStartX) < 50) return;
    
    if (document.getElementById('calendar-view').classList.contains('active')) {
        if (touchEndX < touchStartX) {
            changeDate(1); // Swipe left - next day
        } else if (touchEndX > touchStartX) {
            changeDate(-1); // Swipe right - previous day
        }
    }
}

// Utility functions
function formatDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

// Format time helper
function formatTime(dateStr) {
    const date = new Date(dateStr);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
} 