const API_BASE = import.meta.env?.VITE_SCANNER_API_URL || '';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMsg = data?.error || data?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(errorMsg);
  }
  return data;
}

export const cookieApi = {
  // Load comprehensive state from MongoDB
  async getState() {
    return await request('/api/cookies/state');
  },

  // Inventory
  async getInventory(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.party) params.append('party', filters.party);
    if (filters.search) params.append('search', filters.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await request(`/api/cookies/inventory${qs}`);
  },

  async createCookie(cookieData) {
    return await request('/api/cookies/inventory', {
      method: 'POST',
      body: JSON.stringify(cookieData),
    });
  },

  async updateCookie(id, cookieData) {
    return await request(`/api/cookies/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cookieData),
    });
  },

  async deleteCookie(id) {
    return await request(`/api/cookies/inventory/${id}`, {
      method: 'DELETE',
    });
  },

  // Banner Config & Versions
  async getBanner() {
    return await request('/api/cookies/banner');
  },

  async saveDraft(draft) {
    return await request('/api/cookies/banner/draft', {
      method: 'PUT',
      body: JSON.stringify(draft),
    });
  },

  async publishBanner(payload = {}) {
    return await request('/api/cookies/banner/publish', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getVersions() {
    return await request('/api/cookies/banner/versions');
  },

  async resetBanner() {
    return await request('/api/cookies/banner/reset', {
      method: 'POST',
    });
  },

  // Tags & Blocking
  async getTags() {
    return await request('/api/cookies/tags');
  },

  async createTag(tagData) {
    return await request('/api/cookies/tags', {
      method: 'POST',
      body: JSON.stringify(tagData),
    });
  },

  async updateTag(id, tagData) {
    return await request(`/api/cookies/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tagData),
    });
  },

  async deleteTag(id) {
    return await request(`/api/cookies/tags/${id}`, {
      method: 'DELETE',
    });
  },

  // Consent Records
  async getRecords(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return await request(`/api/cookies/records${qs ? `?${qs}` : ''}`);
  },

  async recordConsent(receipt) {
    return await request('/api/cookies/records', {
      method: 'POST',
      body: JSON.stringify(receipt),
    });
  },
};
