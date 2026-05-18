/**
 * Implementação de PKCE (Proof Key for Code Exchange)
 * Requerido pela Microsoft para OAuth em contas pessoais/multi-tenant
 */

// Gera uma string aleatória segura
function generateRandomString(length = 43) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Gera o hash SHA256 da string
async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Converte para base64url
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashString = String.fromCharCode.apply(null, hashArray);
  return btoa(hashString)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function generatePKCE() {
  const codeVerifier = generateRandomString();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  return { codeVerifier, codeChallenge };
}

export function storePKCE(pkce) {
  sessionStorage.setItem("pkce_verifier", pkce.codeVerifier);
}

export function getPKCEVerifier() {
  return sessionStorage.getItem("pkce_verifier");
}

export function clearPKCE() {
  sessionStorage.removeItem("pkce_verifier");
}
