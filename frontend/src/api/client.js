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

export async function verifyAdminToken() {
  const token = getAdminToken();
  if (!token) return false;
  try {
    const res = await fetch(`${BASE}/audit`, { headers: adminHeaders() });
    if (res.ok) return true;
    if (res.status === 401) clearAdminToken();
    return false;
  } catch {
    return false;
  }
}

// `tenantSlug` is omitted entirely on the default/root site (`/`) so those
// requests are byte-identical to the pre-multi-tenancy API — no regression
// risk to the already-shipped mobile app deep link or existing links.
function tenantParam(tenantSlug) {
  return tenantSlug ? `?tenant_slug=${encodeURIComponent(tenantSlug)}` : '';
}

export async function getItems(tenantSlug) {
  const res = await fetch(`${BASE}/items${tenantParam(tenantSlug)}`);
  return res.json();
}

export async function getItem(id, tenantSlug) {
  const res = await fetch(`${BASE}/items/${id}${tenantParam(tenantSlug)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createEnquiry(itemId, message) {
  // Tenant is derived server-side from the item being enquired about — no
  // slug needed here.
  const res = await fetch(`${BASE}/enquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_id: itemId, message }),
  });
  return res.json();
}

export async function getConfig(tenantSlug) {
  const res = await fetch(`${BASE}/config${tenantParam(tenantSlug)}`);
  return res.json();
}

// Authenticated equivalents — resolve to the logged-in admin's OWN tenant
// via their token, used on /setup and /admin (which stay slug-less URLs).
export async function getMyConfig() {
  const res = await fetch(`${BASE}/admin/config`, { headers: adminHeaders() });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  return res.json();
}

export async function getMyItems() {
  const res = await fetch(`${BASE}/admin/items`, { headers: adminHeaders() });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  return res.json();
}

export async function addListing(data) {
  const res = await fetch(`${BASE}/admin/items`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(data),
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
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

export async function trackEvent(eventType, details = '', tenantSlug) {
  try {
    await fetch(`${BASE}/track${tenantParam(tenantSlug)}`, {
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
