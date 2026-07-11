const BASE = '/api';

const TOKEN_KEY = 'oh_admin_token';
export const getAdminToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setAdminToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearAdminToken = () => localStorage.removeItem(TOKEN_KEY);

function adminHeaders() {
  const token = getAdminToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function adminLogin(password) {
  const res = await fetch(`${BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error('Incorrect password');
  const data = await res.json();
  setAdminToken(data.token);
  return data;
}

export async function getItems() {
  const res = await fetch(`${BASE}/items`);
  return res.json();
}

export async function getItem(id) {
  const res = await fetch(`${BASE}/items/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createEnquiry(itemId, message) {
  const res = await fetch(`${BASE}/enquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_id: itemId, message }),
  });
  return res.json();
}

export async function getConfig() {
  const res = await fetch(`${BASE}/config`);
  return res.json();
}

export async function updateConfig(data) {
  const res = await fetch(`${BASE}/config`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  return res.json();
}

export async function uploadConfigPhotos(files) {
  const fd = new FormData();
  files.forEach(f => fd.append('files', f));
  const token = getAdminToken();
  const res = await fetch(`${BASE}/config/photos`, {
    method: 'POST',
    body: fd,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  return res.json();
}

export async function trackEvent(eventType, details = '') {
  try {
    await fetch(`${BASE}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, details }),
    })
  } catch { /* non-critical */ }
}

export async function getAuditEvents() {
  const res = await fetch(`${BASE}/audit`, { headers: adminHeaders() })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  return res.json()
}

export async function getPendingItems() {
  const res = await fetch(`${BASE}/items/pending`, { headers: adminHeaders() })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  return res.json()
}

export async function approveItem(id) {
  const res = await fetch(`${BASE}/items/${id}/approve`, { method: 'POST', headers: adminHeaders() })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  return res.json()
}

export async function getEnquiries() {
  const res = await fetch(`${BASE}/enquiries`, { headers: adminHeaders() })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  return res.json()
}

export async function decideEnquiry(id, approve) {
  const res = await fetch(`${BASE}/enquiries/${id}/decide?approve=${approve}`, { method: 'POST', headers: adminHeaders() })
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  return res.json()
}

export async function runSetupAssistant(prompt) {
  const res = await fetch(`${BASE}/assistant/setup?prompt=${encodeURIComponent(prompt)}`, {
    method: 'POST',
  });
  return res.json();
}
