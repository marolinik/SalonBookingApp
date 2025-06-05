// Services management functions

// This file is deprecated - all service functions are now in clients.js
// to avoid conflicts and maintain consistency

// Only keep the toggleGroupOptions function which is referenced in HTML
function toggleGroupOptions() {
    const isGroup = document.getElementById('service-form-group').checked;
    const maxParticipantsGroup = document.getElementById('max-participants-group');
    const maxParticipantsInput = document.getElementById('service-form-max');
    
    if (isGroup) {
        maxParticipantsGroup.style.display = 'block';
        maxParticipantsInput.disabled = false;
    } else {
        maxParticipantsGroup.style.display = 'none';
        maxParticipantsInput.disabled = true;
        maxParticipantsInput.value = '1';
    }
} 