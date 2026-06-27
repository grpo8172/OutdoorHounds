const BASE = '/api';

export async function getItems() {
  const res = await fetch(`${BASE}/items`);
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

export async function runSetupAssistant(prompt) {
  const res = await fetch(`${BASE}/assistant/setup?prompt=${encodeURIComponent(prompt)}`, {
    method: 'POST',
  });
  return res.json();
}
