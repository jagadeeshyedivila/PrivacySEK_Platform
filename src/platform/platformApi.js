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

export const platformApi = {
  // Load initial dataset from MongoDB
  async fetchInitData() {
    return await request('/api/platform/init');
  },

  // ROPA
  async registerRopaActivity(activity) {
    return await request('/api/platform/ropa', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  },

  // Rights Requests / DSAR Step Advancement
  async advanceRightsStep(id, step) {
    return await request(`/api/platform/rights/${id}/step`, {
      method: 'PUT',
      body: JSON.stringify({ step }),
    });
  },

  // Purpose Guard Approvals
  async submitGuardDecision(id, decision) {
    return await request(`/api/platform/guard/approvals/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
  },

  // Discovery Finding Remediation
  async remediateFinding(assetPath) {
    return await request(`/api/platform/discovery/findings/${encodeURIComponent(assetPath)}/remediate`, {
      method: 'POST',
    });
  },

  // Proof Ledger
  async getLedger(scope = 'All') {
    return await request(`/api/platform/ledger?scope=${encodeURIComponent(scope)}`);
  },

  async addLedgerEntry(event, context) {
    return await request('/api/platform/ledger', {
      method: 'POST',
      body: JSON.stringify({ event, context }),
    });
  },
};
