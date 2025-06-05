// API Configuration
const API_BASE_URL = '/api';

// Token management
const getToken = () => localStorage.getItem('token');
const setToken = (token) => localStorage.setItem('token', token);
const removeToken = () => localStorage.removeItem('token');

// API helper function
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        if (response.status === 401) {
            // Token expired or invalid
            removeToken();
            window.location.href = '/';
            return;
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API greška');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Auth API
const authAPI = {
    login: async (username, password) => {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        setToken(data.token);
        return data;
    },
    
    verify: async () => {
        return await apiRequest('/auth/verify');
    },
    
    logout: () => {
        removeToken();
        window.location.href = '/';
    }
};

// Appointments API
const appointmentsAPI = {
    getAll: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return await apiRequest(`/appointments${queryString ? '?' + queryString : ''}`);
    },
    
    getOne: async (id) => {
        return await apiRequest(`/appointments/${id}`);
    },
    
    create: async (appointmentData) => {
        return await apiRequest('/appointments', {
            method: 'POST',
            body: JSON.stringify(appointmentData)
        });
    },
    
    update: async (id, updateData) => {
        return await apiRequest(`/appointments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    },
    
    delete: async (id) => {
        return await apiRequest(`/appointments/${id}`, {
            method: 'DELETE'
        });
    }
};

// Clients API
const clientsAPI = {
    getAll: async (search = '') => {
        const params = search ? { search } : {};
        const queryString = new URLSearchParams(params).toString();
        return await apiRequest(`/clients${queryString ? '?' + queryString : ''}`);
    },
    
    getOne: async (id) => {
        return await apiRequest(`/clients/${id}`);
    },
    
    create: async (clientData) => {
        return await apiRequest('/clients', {
            method: 'POST',
            body: JSON.stringify(clientData)
        });
    },
    
    update: async (id, updateData) => {
        return await apiRequest(`/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    },
    
    delete: async (id) => {
        return await apiRequest(`/clients/${id}`, {
            method: 'DELETE'
        });
    },
    
    getStats: async () => {
        return await apiRequest('/clients/stats/overview');
    }
};

// Services API
const servicesAPI = {
    getAll: async () => {
        return await apiRequest('/services');
    },
    
    getOne: async (id) => {
        return await apiRequest(`/services/${id}`);
    },
    
    create: async (serviceData) => {
        return await apiRequest('/services', {
            method: 'POST',
            body: JSON.stringify(serviceData)
        });
    },
    
    update: async (id, updateData) => {
        return await apiRequest(`/services/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    },
    
    delete: async (id) => {
        return await apiRequest(`/services/${id}`, {
            method: 'DELETE'
        });
    }
}; 