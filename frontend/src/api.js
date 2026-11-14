/**
 * frontend/src/api.js - HTTP client wrapper for QUANTA Career Intelligence Platform.
 * 
 * Interacts with FastAPI backend via relative `/api` base path, proxied seamlessly
 * in Vite development mode or rewritten in production environments.
 */

const API_BASE = '/api';

/**
 * Executes a JSON fetch request against the backend with standardized error formatting.
 *
 * @param {string} endpoint - API path relative to `/api`.
 * @param {RequestInit} [options={}] - Standard fetch configuration options.
 * @returns {Promise<any>} Parsed JSON response from the server.
 * @throws {Error} Enhanced error object containing HTTP status and server error payload.
 */
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

/**
 * Builds a clean query string from an object of key-value pairs.
 * 
 * @param {Record<string, string|number|boolean|null|undefined>} params
 * @returns {string} Query string starting with `?` or empty string if no valid params.
 */
function buildQuery(params) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

/**
 * Retrieves the complete static catalogue (skills, target roles, resources).
 * @returns {Promise<{skills: Array, roles: Array, resources: Array}>}
 */
export async function fetchCatalog() {
  return request('/catalog');
}

/**
 * Fetches the active student profile metadata.
 * @param {string|null} [profileId=null]
 * @returns {Promise<Object>}
 */
export async function fetchProfile(profileId = null) {
  return request(`/profile${buildQuery({ id: profileId })}`);
}

/**
 * Updates learner profile fields (name, interests, claimed skill ratings).
 * @param {Object} payload
 * @param {string|null} [profileId=null]
 * @returns {Promise<Object>}
 */
export async function updateProfile(payload, profileId = null) {
  return request(`/profile${buildQuery({ id: profileId })}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetches the comprehensive unified application state (profile, gaps, roadmap, summary).
 * @param {string|null} [profileId=null]
 * @returns {Promise<Object>}
 */
export async function fetchState(profileId = null) {
  const endpoint = profileId ? `/state/${encodeURIComponent(profileId)}` : '/state';
  return request(endpoint);
}

/**
 * Previews the impact of switching target career goals before committing.
 * @param {string} goal - Target role identifier.
 * @param {string|null} [profileId=null]
 * @returns {Promise<Object>}
 */
export async function previewGoal(goal, profileId = null) {
  return request('/goal/preview', {
    method: 'POST',
    body: JSON.stringify({ goal, profile_id: profileId }),
  });
}

/**
 * Switches the learner's active target career goal.
 * @param {string} goal - Target role identifier.
 * @param {string|null} [profileId=null]
 * @returns {Promise<Object>}
 */
export async function changeGoal(goal, profileId = null) {
  return request('/goal', {
    method: 'POST',
    body: JSON.stringify({ goal, profile_id: profileId }),
  });
}

/**
 * Marks a specific learning module as completed.
 * @param {string} moduleId - Identifier of module being completed.
 * @param {string|null} [profileId=null]
 * @returns {Promise<Object>}
 */
export async function completeModule(moduleId, profileId = null) {
  return request(`/modules/${encodeURIComponent(moduleId)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ profile_id: profileId }),
  });
}

/**
 * Seeds pre-populated evaluation learner profile.
 * @returns {Promise<Object>}
 */
export async function seedDemo() {
  return request('/demo/seed', {
    method: 'POST',
  });
}

/**
 * Resets application database to clean baseline state.
 * @returns {Promise<Object>}
 */
export async function resetDemo() {
  return request('/demo/reset', {
    method: 'POST',
  });
}

/**
 * Retrieves technical assessment question bank, optionally filtered by skill.
 * @param {string|null} [skill=null]
 * @returns {Promise<{questions: Array}>}
 */
export async function fetchTechnicalQuestions(skill = null) {
  return request(`/assessment/questions${buildQuery({ skill })}`);
}

/**
 * Submits assessment answers for objective grading and root-cause analysis.
 * @param {Array<Object>} responses
 * @param {string|null} [profileId=null]
 * @returns {Promise<Object>}
 */
export async function submitAssessment(responses, profileId = null) {
  return request('/assessment/submit', {
    method: 'POST',
    body: JSON.stringify({ responses, profile_id: profileId }),
  });
}

/**
 * Fetches the multi-agent activity audit trail.
 * @param {string|null} [profileId=null]
 * @returns {Promise<{timeline: Array}>}
 */
export async function fetchAgentTimeline(profileId = null) {
  return request(`/agents/timeline${buildQuery({ profile_id: profileId })}`);
}

/**
 * Sends a natural language query to the AI mentor orchestrator.
 * @param {string} queryText
 * @param {string|null} [profileId=null]
 * @returns {Promise<{reply: string, sources: Array, agent: string}>}
 */
export async function sendMentorQuery(queryText, profileId = null) {
  return request('/mentor/chat', {
    method: 'POST',
    body: JSON.stringify({ query: queryText, profile_id: profileId }),
  });
}

/**
 * Fetches placement readiness and curriculum completion progress metrics.
 * @param {string|null} [profileId=null]
 * @returns {Promise<Object>}
 */
export async function fetchProgress(profileId = null) {
  return request(`/progress${buildQuery({ profile_id: profileId })}`);
}
