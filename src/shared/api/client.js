// Token storage utilities
const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token) {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function api(path, opts = {}) {
  const token = getAccessToken();
  const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData;
  const headers = isFormData ? { ...(opts.headers || {}) } : { "Content-Type": "application/json", ...(opts.headers || {}) };
  
  // Add Bearer token if available
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Prepare body - stringify JSON, leave FormData as-is
  let body = opts.body;
  if (!isFormData && body && typeof body === "object") {
    body = JSON.stringify(body);
  }
  
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(import.meta.env.VITE_API + path, {
        ...opts,
        headers,
        body,
      });
      
      if (!res.ok) {
        // If it's a 401/403, don't retry
        if (res.status === 401 || res.status === 403) {
          const errorText = await res.text();
          let errorMessage = errorText;
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.message) {
              errorMessage = errorJson.message;
            } else if (errorJson.error) {
              errorMessage = errorJson.error;
            }
          } catch {
            // If not JSON, use the text as-is
          }
          throw new Error(errorMessage);
        }
        
        // For other errors, retry if not last attempt
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
        
        // Last attempt - parse error and throw
        const errorText = await res.text();
        let errorMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          } else if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch {
          // If not JSON, use the text as-is
        }
        throw new Error(errorMessage);
      }
      
      // Handle 204 No Content (empty response)
      if (res.status === 204) {
        return null;
      }
      
      // Check if response has content before parsing JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        return text ? JSON.parse(text) : null;
      }
      
      const text = await res.text();
      if (!text || text.trim() === '') {
        return null;
      }
      
      return JSON.parse(text);
    } catch (error) {
      // If it's a network error or server disconnected, retry
      if (attempt < maxRetries - 1 && (
        error.message.includes("disconnected") ||
        error.message.includes("NetworkError") ||
        error.message.includes("Failed to fetch")
      )) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }
      
      // If it's the last attempt or not a retryable error, throw
      throw error;
    }
  }
}
