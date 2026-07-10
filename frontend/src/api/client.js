const BASE = '/api';

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function uploadConfigPhotos(files) {
  const fd = new FormData();
  files.forEach(f => fd.append('files', f));
  const res = await fetch(`${BASE}/config/photos`, { method: 'POST', body: fd });
  return res.json();
}

export async function runSetupAssistant(prompt) {
  const res = await fetch(`${BASE}/assistant/setup?prompt=${encodeURIComponent(prompt)}`, {
    method: 'POST',
  });
  return res.json();
}
