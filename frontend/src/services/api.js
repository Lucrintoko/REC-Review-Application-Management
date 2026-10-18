/**
 * Centralized API Client Service
 * Interacts with PHP backend endpoints
 */

const API_BASE_URL = '/api';

async function parseResponse(response) {
  const responseText = await response.text();
  let payload;

  try {
    const jsonStart = responseText.indexOf("{");
    const jsonEnd = responseText.lastIndexOf("}");
    const jsonText = jsonStart >= 0 && jsonEnd >= jsonStart
      ? responseText.slice(jsonStart, jsonEnd + 1)
      : responseText;
    payload = jsonText ? JSON.parse(jsonText) : {};
  } catch {
    throw new Error(`Server returned an invalid response (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(payload.message || `Request failed with status ${response.status}.`);
  }

  return payload;
}

export const apiClient = {
  async get(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
    return parseResponse(response);
  },

  async post(endpoint, data, isFormData = false) {
    const headers = {
      'Accept': 'application/json',
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isFormData ? data : JSON.stringify(data),
    });
    return parseResponse(response);
  },

  async delete(endpoint, data = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseResponse(response);
  },
};
