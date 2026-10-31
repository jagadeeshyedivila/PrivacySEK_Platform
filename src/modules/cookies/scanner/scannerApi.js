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

export const scannerApi = {
  async checkHealth() {
    try {
      return await request('/api/scanner/health');
    } catch {
      return null;
    }
  },

  async startScan(params) {
    return await request('/api/scanner/scan', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getScanStatus(scanId) {
    return await request(`/api/scanner/scan/${scanId}`);
  },

  async getScanReport(scanId) {
    return await request(`/api/scanner/scan/${scanId}/report`);
  },

  async cancelScan(scanId) {
    return await request(`/api/scanner/scan/${scanId}/cancel`, {
      method: 'POST',
    });
  },

  async updateScanCookie(scanId, cookieData) {
    return await request(`/api/scanner/scan/${scanId}/cookie`, {
      method: 'PATCH',
      body: JSON.stringify(cookieData),
    });
  },

  async getHistory(params = {}) {
    const q = new URLSearchParams();
    if (params.page) q.append('page', params.page);
    if (params.pageSize || params.limit) q.append('pageSize', params.pageSize || params.limit);
    if (params.search) q.append('search', params.search);
    if (params.status && params.status !== 'all') q.append('status', params.status);
    if (params.sortBy) q.append('sortBy', params.sortBy);
    if (params.sortOrder) q.append('sortOrder', params.sortOrder);
    if (params.paginate != null) q.append('paginate', params.paginate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return await request(`/api/scanner/history${qs}`);
  },

  async deleteScan(scanId) {
    return await request(`/api/scanner/scan/${scanId}`, {
      method: 'DELETE',
    });
  },

  async compareScans(baseScanId, targetScanId) {
    return await request('/api/scanner/compare', {
      method: 'POST',
      body: JSON.stringify({ baseScanId, targetScanId }),
    });
  },

  async getSchedules() {
    return await request('/api/scanner/schedules');
  },

  async createSchedule(schedule) {
    return await request('/api/scanner/schedules', {
      method: 'POST',
      body: JSON.stringify(schedule),
    });
  },

  async deleteSchedule(id) {
    return await request(`/api/scanner/schedules/${id}`, {
      method: 'DELETE',
    });
  },

  async runSchedule(id) {
    return await request(`/api/scanner/schedules/${id}/run`, {
      method: 'POST',
    });
  },
};
