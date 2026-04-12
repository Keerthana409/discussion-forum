// Core Relative API URL strictly tracking deployed host natively
const API_URL = '/api';

const api = {
    getToken: () => localStorage.getItem('nexus_token'),
    getUser: () => JSON.parse(localStorage.getItem('nexus_user') || 'null'),
    
    request: async (endpoint, options = {}) => {
        const token = api.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const config = {
            ...options,
            headers
        };

        const res = await fetch(`${API_URL}${endpoint}`, config);
        
        if (!res.ok) {
            let errorMsg = 'Server Error';
            try {
                const errData = await res.json();
                errorMsg = errData.msg || errorMsg;
            } catch(e) {
                // Not json
            }
            throw new Error(errorMsg);
        }
        
        return res.json();
    }
};

window.api = api;
