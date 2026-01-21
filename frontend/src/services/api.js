const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function fetchApi(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  // Cards
  getCards: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/cards${queryString ? `?${queryString}` : ''}`);
  },

  getCard: (id) => fetchApi(`/cards/${id}`),

  getRarities: () => fetchApi('/cards/meta/rarities'),

  // Sets
  getSets: () => fetchApi('/sets'),

  getSet: (id) => fetchApi(`/sets/${id}`),

  getSetEV: (id, boxPrice = null) => {
    const params = boxPrice ? `?box_price=${boxPrice}` : '';
    return fetchApi(`/sets/${id}/ev${params}`);
  },

  getSetCards: (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/sets/${id}/cards${queryString ? `?${queryString}` : ''}`);
  },

  // Valuation
  getUndervaluedCards: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/valuation/undervalued${queryString ? `?${queryString}` : ''}`);
  },

  getOvervaluedCards: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return fetchApi(`/valuation/overvalued${queryString ? `?${queryString}` : ''}`);
  },

  getSummary: () => fetchApi('/valuation/summary'),

  getTrending: (direction = 'up', limit = 20) =>
    fetchApi(`/valuation/trending?direction=${direction}&limit=${limit}`),

  // Sync
  triggerSync: () => fetchApi('/sync/trigger', { method: 'POST' }),

  // Health
  healthCheck: () => fetchApi('/health'),
};

export default api;
