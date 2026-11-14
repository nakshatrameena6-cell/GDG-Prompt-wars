/**
 * frontend/src/api.js - HTTP client wrapper for PlacementPilot API.
 * Uses relative /api base path handled by Vite dev proxy or production rewrite.
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = (data && data.message) || `HTTP ${res.status}: ${res.statusText}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    console.error(`[API Error] ${options.method || 'GET'} ${url}:`, err.message);
    throw err;
  }
}

export async function fetchCatalog() {
  return request('/catalog');
}

export async function fetchProfile(profileId = null) {
  const query = profileId ? `?id=${profileId}` : '';
  return request(`/profile${query}`);
}

export async function updateProfile(payload, profileId = null) {
  const query = profileId ? `?id=${profileId}` : '';
  return request(`/profile${query}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchState(profileId = null) {
  const endpoint = profileId ? `/state/${profileId}` : '/state';
  return request(endpoint);
}

export async function previewGoal(goal, profileId = null) {
  return request('/goal/preview', {
    method: 'POST',
    body: JSON.stringify({ goal, profile_id: profileId }),
  });
}

export async function changeGoal(goal, profileId = null) {
  return request('/goal', {
    method: 'POST',
    body: JSON.stringify({ goal, profile_id: profileId }),
  });
}

export async function completeModule(moduleId, profileId = null) {
  return request(`/modules/${encodeURIComponent(moduleId)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ profile_id: profileId }),
  });
}

export async function seedDemo() {
  return request('/demo/seed', {
    method: 'POST',
  });
}

export async function resetDemo() {
  return request('/demo/reset', {
    method: 'POST',
  });
}
