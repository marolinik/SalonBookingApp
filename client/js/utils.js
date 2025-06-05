// Utility functions

// Format time for display in 24h format
function formatTime(dateStr) {
    const date = createLocalDate(dateStr);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sr-RS', {
        day: 'numeric',
        month: 'numeric', 
        year: 'numeric',
        timeZone: 'Europe/Belgrade'
    });
}

// Convert local datetime to ISO string preserving local time
function toLocalISOString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Create date in local timezone
function createLocalDate(dateStr) {
    // Handle both ISO format with Z and without timezone
    if (!dateStr) return new Date();
    
    // Remove Z suffix if present (we want to treat as local time)
    dateStr = dateStr.replace('Z', '');
    
    // Parse the date string as local time, not UTC
    if (dateStr.includes('T')) {
        const [datePart, timePart] = dateStr.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const timeComponents = timePart.split(':').map(Number);
        const hours = timeComponents[0] || 0;
        const minutes = timeComponents[1] || 0;
        const seconds = Math.floor(timeComponents[2] || 0);
        
        return new Date(year, month - 1, day, hours, minutes, seconds);
    } else {
        // Handle date-only strings
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
}

// Convert date to local ISO string for sending to server
function toLocalDateTimeString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

// Format date as YYYY-MM-DD without timezone conversion
function formatDateISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
} 