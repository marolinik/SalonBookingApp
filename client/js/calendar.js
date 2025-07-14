// Global variables for mobile view
let currentDate = new Date();
let calendarViewMode = 'day';  // Preimenovano iz currentView
let selectedDate = null;
let selectedAppointmentDate = null;

// Calendar view functions

// Render calendar based on current view
async function renderCalendar() {
    const weekLegend = document.getElementById('week-legend');
    
    if (calendarViewMode === 'day') {
        weekLegend.classList.remove('active');
        await renderDayView();
    } else {
        weekLegend.classList.add('active');
        await renderWeekView();
    }
    updateDateDisplay();
    updateCurrentTimeLine();
}

// Update current time line every minute
setInterval(updateCurrentTimeLine, 60000);

function updateCurrentTimeLine() {
    // Remove existing line
    const existingLine = document.querySelector('.current-time-line');
    if (existingLine) existingLine.remove();
    
    // Only show if viewing today
    if (!isDateToday(currentDate) && calendarViewMode === 'day') return;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    // Only show during working hours (updated to 21:00)
    if (currentHour < 8 || currentHour >= 21) return;
    
    const minutesSince8 = (currentHour - 8) * 60 + currentMinutes;
    const pixelsPerMinute = 40 / 30; // 40px per 30 minutes
    const topPosition = minutesSince8 * pixelsPerMinute;
    
    const timeLine = document.createElement('div');
    timeLine.className = 'current-time-line';
    timeLine.style.top = `${topPosition}px`;
    
    if (calendarViewMode === 'day') {
        document.querySelector('.schedule-grid')?.appendChild(timeLine);
    } else {
        // For week view, add to today's column
        const today = new Date();
        const todayStr = formatDateISO(today);
        const todayColumn = document.querySelector(`.day-column[data-date="${todayStr}"]`);
        if (todayColumn) {
            todayColumn.appendChild(timeLine);
        }
    }
}

// Check if on mobile
function isMobile() {
    return window.innerWidth <= 768;
}

// Render day view
async function renderDayView() {
    // Setup headers
    const headerColumns = document.getElementById('header-columns');
    const scheduleHeader = document.getElementById('schedule-header');
    scheduleHeader.className = 'schedule-header';
    headerColumns.className = 'employee-columns';
    
    if (isMobile()) {
        // Mobile view - show toggle buttons and active employee
        headerColumns.innerHTML = `
            <div class="employee-header dragana">Dragana</div>
            <div class="employee-header snezana">Snežana</div>
        `;
    } else {
        // Desktop view - show both columns
        headerColumns.innerHTML = `
            <div class="employee-header dragana">Dragana</div>
            <div class="employee-header snezana">Snežana</div>
        `;
    }

    // Setup time grid
    const timeGrid = document.getElementById('time-grid');
    timeGrid.className = 'time-grid';
    
    renderTimeColumn();
    
    const scheduleGrid = document.getElementById('schedule-grid');
    scheduleGrid.className = 'schedule-grid';
    scheduleGrid.innerHTML = '';
    
    // Render employee columns
    const employeesToRender = ['dragana', 'snezana']; // Uvek prikaži oba zaposlena
    
    employeesToRender.forEach((employee, index) => {
        const column = document.createElement('div');
        column.className = 'employee-column';
        column.id = `${employee}-column`;
        
        // Create time slots (26 slots for 8:00-21:00)
        for (let i = 0; i < 26; i++) {
            const row = document.createElement('div');
            row.className = 'slot-row';
            row.dataset.time = `${(i * 0.5 + 8).toFixed(1)}`;
            row.dataset.employee = employee;
            row.onclick = (e) => {
                if (e.target === row) {
                    const hour = Math.floor(i * 0.5 + 8);
                    const minutes = (i % 2) * 30;
                    openNewAppointmentWithTime(hour, minutes, employee);
                }
            };
            column.appendChild(row);
        }
        
        scheduleGrid.appendChild(column);
    });
    
    // Load and render appointments
    await loadAppointments();
}

// Render week view with improved layout
async function renderWeekView() {
    // Calculate week start
    const weekStart = new Date(currentDate);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    
    // Setup headers
    const headerColumns = document.getElementById('header-columns');
    const scheduleHeader = document.getElementById('schedule-header');
    scheduleHeader.className = 'schedule-header week-view';
    headerColumns.className = 'employee-columns week-view';
    headerColumns.innerHTML = '';
    
    const daysOfWeek = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];
    const employees = ['Dragana', 'Snežana'];
    
    // Create day headers with employee sub-headers
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const isToday = isDateToday(date);
        
        const dayHeader = document.createElement('div');
        dayHeader.className = `day-header ${isToday ? 'today' : ''}`;
        dayHeader.innerHTML = `
            <div class="day-label">${daysOfWeek[i]}</div>
            <div class="day-date">${date.getDate()}</div>
        `;
        headerColumns.appendChild(dayHeader);
    }
    
    // Setup time grid
    const timeGrid = document.getElementById('time-grid');
    timeGrid.className = 'time-grid week-view';
    
    renderTimeColumn();
    
    const scheduleGrid = document.getElementById('schedule-grid');
    scheduleGrid.className = 'schedule-grid week-view';
    scheduleGrid.innerHTML = '';
    
    // Render day columns with employee sub-columns
    for (let d = 0; d < 7; d++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + d);
        
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        dayColumn.dataset.date = formatDateISO(date);
        
        // Create two sub-columns for employees
        const employeeColumns = document.createElement('div');
        employeeColumns.className = 'week-employee-columns';
        
        ['dragana', 'snezana'].forEach((employee) => {
            const subColumn = document.createElement('div');
            subColumn.className = 'week-employee-column';
            subColumn.dataset.employee = employee;
            subColumn.dataset.date = formatDateISO(date);
            
            // Create time slots (26 slots for 8:00-21:00)
            for (let i = 0; i < 26; i++) {
                const row = document.createElement('div');
                row.className = 'slot-row';
                row.dataset.time = `${(i * 0.5 + 8).toFixed(1)}`;
                row.dataset.date = formatDateISO(date);
                row.dataset.employee = employee;
                row.onclick = (e) => {
                    if (e.target === row) {
                        currentDate = new Date(date);
                        const hour = Math.floor(i * 0.5 + 8);
                        const minutes = (i % 2) * 30;
                        openNewAppointmentWithTime(hour, minutes, employee);
                    }
                };
                subColumn.appendChild(row);
            }
            
            employeeColumns.appendChild(subColumn);
        });
        
        dayColumn.appendChild(employeeColumns);
        scheduleGrid.appendChild(dayColumn);
    }
    
    // Load and render appointments for the week
    await loadWeekAppointments(weekStart);
}

// Render time column
function renderTimeColumn() {
    const timeColumn = document.getElementById('time-column');
    timeColumn.innerHTML = '';
    
    // Updated to show times until 21:00 (8:00-21:00)
    for (let hour = 8; hour <= 20; hour++) {
        for (let min = 0; min < 60; min += 30) {
            if (hour === 20 && min === 30) continue; // Skip 20:30
            
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.textContent = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
            timeColumn.appendChild(slot);
        }
    }
}

// Load appointments for day view
async function loadAppointments() {
    try {
        const dateStr = formatDateISO(currentDate);
        const appointments = await appointmentsAPI.getAll({ date: dateStr });
        
        appointments.forEach(appointment => {
            renderAppointment(appointment);
        });
    } catch (error) {
        console.error('Error loading appointments:', error);
        showToast('Greška pri učitavanju termina');
    }
}

// Load appointments for week view
async function loadWeekAppointments(weekStart) {
    try {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const appointments = await appointmentsAPI.getAll({
            startDate: formatDateISO(weekStart),
            endDate: formatDateISO(weekEnd)
        });
        
        appointments.forEach(appointment => {
            renderWeekAppointment(appointment);
        });
    } catch (error) {
        console.error('Error loading week appointments:', error);
        showToast('Greška pri učitavanju termina');
    }
}

// Render single appointment in day view
function renderAppointment(appointment) {
    const employee = appointment.user_id === 1 ? 'dragana' : 'snezana';
    const column = document.getElementById(`${employee}-column`);
    if (!column) return;
    
    const date = createLocalDate(appointment.datum_vreme);
    const startHour = date.getHours();
    const startMinutes = date.getMinutes();
    
    // Calculate exact position based on minutes
    const minutesSince8AM = (startHour - 8) * 60 + startMinutes;
    const pixelsPerMinute = 40 / 30; // 40px per 30 minutes
    const topPosition = minutesSince8AM * pixelsPerMinute;
    
    // Calculate height based on duration
    const heightInPixels = appointment.duration * pixelsPerMinute - 4;
    
    const appointmentEl = createAppointmentElement(appointment, employee);
    appointmentEl.style.top = `${topPosition}px`;
    appointmentEl.style.height = `${heightInPixels}px`;
    
    column.appendChild(appointmentEl);
}

// Render appointment in week view
function renderWeekAppointment(appointment) {
    const date = createLocalDate(appointment.datum_vreme);
    const dateStr = formatDateISO(date);
    const employee = appointment.user_id === 1 ? 'dragana' : 'snezana';
    
    const column = document.querySelector(`.week-employee-column[data-date="${dateStr}"][data-employee="${employee}"]`);
    if (!column) return;
    
    const startHour = date.getHours();
    const startMinutes = date.getMinutes();
    
    // Calculate exact position based on minutes
    const minutesSince8AM = (startHour - 8) * 60 + startMinutes;
    const pixelsPerMinute = 40 / 30; // 40px per 30 minutes
    const topPosition = minutesSince8AM * pixelsPerMinute;
    
    // Calculate height based on duration
    const heightInPixels = appointment.duration * pixelsPerMinute - 4;
    
    const appointmentEl = createAppointmentElement(appointment, employee);
    appointmentEl.style.top = `${topPosition}px`;
    appointmentEl.style.height = `${heightInPixels}px`;
    
    column.appendChild(appointmentEl);
}

// Create appointment element
function createAppointmentElement(appointment, employee) {
    const div = document.createElement('div');
    div.className = `appointment-card ${appointment.status} ${appointment.is_group ? 'group' : ''} ${employee}`;
    div.onclick = () => showAppointmentDetails(appointment);
    
    // Check if we're in week view
    const isWeekView = calendarViewMode === 'week';
    
    // Get client name(s)
    let clientName = 'Nepoznat';
    let fullClientName = 'Nepoznat klijent';
    if (appointment.clients && appointment.clients.length > 0) {
        fullClientName = appointment.clients[0].ime;
        if (appointment.is_group) {
            // For group appointments, show first name + count
            const firstName = appointment.clients[0].ime.split(' ')[0];
            clientName = appointment.clients.length > 1 ? 
                `${firstName} +${appointment.clients.length - 1}` : 
                firstName;
        } else {
            // For single appointments - use only first name
            clientName = appointment.clients[0].ime.split(' ')[0];
        }
    }
    
    // Get service name - shorten if needed
    let serviceName = appointment.service_name || 'Usluga';
    const fullServiceName = serviceName;
    // Remove common words to save space
    serviceName = serviceName.replace('Masaža ', 'Maž. ')
                           .replace('Tretman ', 'Tret. ')
                           .replace('Grupni ', 'Gr. ')
                           .replace('medicinska', 'med.')
                           .replace('relaks', 'rel.')
                           .replace('Depilacija', 'Depil.');
    
    // Build HTML - combine service and client name
    let displayText = `${clientName}, ${serviceName}`;
    
    // Add title for full text tooltip
    div.title = `${fullClientName}\n${fullServiceName}\n${formatTime(appointment.datum_vreme)}`;
    
    let html = `<div class="appointment-text">${displayText}</div>`;
    
    // Add badge for group appointments
    if (appointment.is_group && appointment.clients) {
        html += `<div class="appointment-badge">${appointment.clients.length}/${appointment.max_ucesnika || 8}</div>`;
    }
    
    div.innerHTML = html;
    
    return div;
}

// Show appointment details
async function showAppointmentDetails(appointment) {
    try {
        const fullAppointment = await appointmentsAPI.getOne(appointment.id);
        
        const clientsList = fullAppointment.clients.map(c => `${c.ime} (${c.telefon})`).join('\n');
        const status = fullAppointment.status === 'finished' ? 'Završen' : 
                      fullAppointment.status === 'cancelled' ? 'Otkazan' : 'Zakazan';
        
        const actions = confirm(`
${fullAppointment.service_name}
Vreme: ${formatTime(fullAppointment.datum_vreme)} - ${calculateEndTime(fullAppointment.datum_vreme, fullAppointment.duration)}
Status: ${status}
Zaposleni: ${fullAppointment.employee_name}

Klijenti:
${clientsList}

${fullAppointment.is_group ? `Učesnika: ${fullAppointment.clients.length}/${fullAppointment.max_ucesnika}` : ''}

Želite li da promenite status termina?
OK = Označi kao završen | Cancel = Otkaži termin
        `);
        
        if (actions !== null) {
            if (actions) {
                // Mark as finished
                await appointmentsAPI.update(fullAppointment.id, { 
                    status: 'finished',
                    placeno: true 
                });
                showToast('Termin označen kao završen');
            } else {
                // Cancel appointment
                if (confirm('Da li ste sigurni da želite da otkažete termin?')) {
                    await appointmentsAPI.update(fullAppointment.id, { 
                        status: 'cancelled' 
                    });
                    showToast('Termin je otkazan');
                }
            }
            await renderCalendar();
        }
    } catch (error) {
        showToast('Greška pri učitavanju detalja termina');
    }
}

// Calculate end time
function calculateEndTime(startTime, duration) {
    const start = createLocalDate(startTime);
    const endDate = new Date(start);
    endDate.setMinutes(start.getMinutes() + duration);
    
    const hours = endDate.getHours().toString().padStart(2, '0');
    const minutes = endDate.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Calendar navigation
function setCalendarView(view) {
    // Prevent week view on mobile/tablets
    if (view === 'week' && window.innerWidth < 1024) {
        showToast('Nedeljni prikaz dostupan samo na velikim ekranima');
        return;
    }
    
    calendarViewMode = view;
    document.querySelectorAll('.view-toggle button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderCalendar();
}

function changeDate(direction) {
    if (calendarViewMode === 'day') {
        currentDate.setDate(currentDate.getDate() + direction);
    } else {
        currentDate.setDate(currentDate.getDate() + (direction * 7));
    }
    renderCalendar();
}

function goToToday() {
    currentDate = new Date();
    renderCalendar();
}

function updateDateDisplay() {
    const dateElement = document.getElementById('current-date');
    
    if (calendarViewMode === 'day') {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = currentDate.toLocaleDateString('sr-Latn-RS', options);
        const isToday = isDateToday(currentDate);
        
        dateElement.textContent = isToday ? `Danas, ${dateStr}` : dateStr;
    } else {
        // Week view - show week range
        const weekStart = new Date(currentDate);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
        weekStart.setDate(diff);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'];
        
        if (weekStart.getMonth() === weekEnd.getMonth()) {
            dateElement.textContent = `${weekStart.getDate()}. - ${weekEnd.getDate()}. ${monthNames[weekStart.getMonth()]} ${weekStart.getFullYear()}.`;
        } else if (weekStart.getFullYear() === weekEnd.getFullYear()) {
            dateElement.textContent = `${weekStart.getDate()}. ${monthNames[weekStart.getMonth()]} - ${weekEnd.getDate()}. ${monthNames[weekEnd.getMonth()]} ${weekStart.getFullYear()}.`;
        } else {
            dateElement.textContent = `${weekStart.getDate()}. ${monthNames[weekStart.getMonth()]} ${weekStart.getFullYear()}. - ${weekEnd.getDate()}. ${monthNames[weekEnd.getMonth()]} ${weekEnd.getFullYear()}.`;
        }
    }
}

function isDateToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

// Date Picker functionality
let pickerDate = new Date();

function openDatePicker() {
    pickerDate = new Date(currentDate);
    renderDatePicker();
    document.getElementById('date-picker-modal').classList.add('active');
}

function closeDatePicker() {
    document.getElementById('date-picker-modal').classList.remove('active');
}

function renderDatePicker() {
    const monthNames = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 
                       'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
    
    // Update month/year display
    document.getElementById('picker-month-year').textContent = 
        `${monthNames[pickerDate.getMonth()]} ${pickerDate.getFullYear()}`;
    
    // Get first day of month
    const firstDay = new Date(pickerDate.getFullYear(), pickerDate.getMonth(), 1);
    const lastDay = new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 0);
    
    // Calculate starting day (0 = Sunday, adjust for Monday start)
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Monday-based
    
    const daysContainer = document.getElementById('date-picker-days');
    daysContainer.innerHTML = '';
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'date-picker-day empty';
        daysContainer.appendChild(emptyDay);
    }
    
    // Add days of the month
    const today = new Date();
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'date-picker-day';
        dayDiv.textContent = day;
        
        const dayDate = new Date(pickerDate.getFullYear(), pickerDate.getMonth(), day);
        
        // Highlight today
        if (dayDate.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }
        
        // Highlight selected date
        if (dayDate.toDateString() === currentDate.toDateString()) {
            dayDiv.classList.add('selected');
        }
        
        dayDiv.onclick = () => selectDate(dayDate);
        daysContainer.appendChild(dayDiv);
    }
}

function changePickerMonth(direction) {
    pickerDate.setMonth(pickerDate.getMonth() + direction);
    renderDatePicker();
}

function selectDate(date) {
    currentDate = new Date(date);
    closeDatePicker();
    renderCalendar();
}

function selectToday() {
    currentDate = new Date();
    closeDatePicker();
    renderCalendar();
}

// Add functions to global scope
window.openDatePicker = openDatePicker;
window.closeDatePicker = closeDatePicker;
window.changePickerMonth = changePickerMonth;
window.selectToday = selectToday;

// Appointment Date Picker functionality
let appointmentPickerDate = new Date();

function openAppointmentDatePicker() {
    appointmentPickerDate = selectedAppointmentDate ? new Date(selectedAppointmentDate) : new Date();
    renderAppointmentDatePicker();
    document.getElementById('appointment-date-picker-modal').classList.add('active');
}

function closeAppointmentDatePicker() {
    document.getElementById('appointment-date-picker-modal').classList.remove('active');
}

function renderAppointmentDatePicker() {
    const monthNames = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 
                       'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
    
    // Update month/year display
    document.getElementById('appointment-picker-month-year').textContent = 
        `${monthNames[appointmentPickerDate.getMonth()]} ${appointmentPickerDate.getFullYear()}`;
    
    // Get first day of month
    const firstDay = new Date(appointmentPickerDate.getFullYear(), appointmentPickerDate.getMonth(), 1);
    const lastDay = new Date(appointmentPickerDate.getFullYear(), appointmentPickerDate.getMonth() + 1, 0);
    
    // Calculate starting day (0 = Sunday, adjust for Monday start)
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Monday-based
    
    const daysContainer = document.getElementById('appointment-date-picker-days');
    daysContainer.innerHTML = '';
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'date-picker-day empty';
        daysContainer.appendChild(emptyDay);
    }
    
    // Add days of the month
    const today = new Date();
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'date-picker-day';
        dayDiv.textContent = day;
        
        const dayDate = new Date(appointmentPickerDate.getFullYear(), appointmentPickerDate.getMonth(), day);
        
        // Highlight today
        if (dayDate.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }
        
        // Highlight selected date
        if (selectedAppointmentDate && dayDate.toDateString() === selectedAppointmentDate.toDateString()) {
            dayDiv.classList.add('selected');
        }
        
        dayDiv.onclick = () => selectAppointmentDate(dayDate);
        daysContainer.appendChild(dayDiv);
    }
}

function changeAppointmentPickerMonth(direction) {
    appointmentPickerDate.setMonth(appointmentPickerDate.getMonth() + direction);
    renderAppointmentDatePicker();
}

function selectAppointmentDate(date) {
    selectedAppointmentDate = new Date(date);
    const dateStr = formatDateForInput(selectedAppointmentDate);
    document.getElementById('appointment-date').value = dateStr;
    closeAppointmentDatePicker();
}

function selectAppointmentToday() {
    selectAppointmentDate(new Date());
}

function formatDateForInput(date) {
    const dayNames = ['Nedelja', 'Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota'];
    const monthNames = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 
                       'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName}, ${day}. ${month} ${year}.`;
}

// Initialize time selectors
function initializeTimeSelectors() {
    const hourSelect = document.getElementById('appointment-hour');
    const minuteSelect = document.getElementById('appointment-minute');
    
    // Clear existing options
    hourSelect.innerHTML = '<option value="">Sat</option>';
    minuteSelect.innerHTML = '<option value="">Min</option>';
    
    // Add hours (0-23)
    for (let i = 0; i < 24; i++) {
        const option = document.createElement('option');
        option.value = i.toString().padStart(2, '0');
        option.textContent = i.toString().padStart(2, '0');
        hourSelect.appendChild(option);
    }
    
    // Add minutes (0-59, in 5-minute intervals)
    for (let i = 0; i < 60; i += 5) {
        const option = document.createElement('option');
        option.value = i.toString().padStart(2, '0');
        option.textContent = i.toString().padStart(2, '0');
        minuteSelect.appendChild(option);
    }
}

// Add functions to global scope
window.openAppointmentDatePicker = openAppointmentDatePicker;
window.closeAppointmentDatePicker = closeAppointmentDatePicker;
window.changeAppointmentPickerMonth = changeAppointmentPickerMonth;
window.selectAppointmentToday = selectAppointmentToday;

// Initialize time selectors when DOM is ready
document.addEventListener('DOMContentLoaded', initializeTimeSelectors); 