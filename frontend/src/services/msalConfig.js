/**
 * Configuração Microsoft Authentication Library (MSAL)
 * ──────────────────────────────────────────────────────
 * Substitua CLIENT_ID e TENANT_ID pelos valores do seu app no Azure Portal.
 * https://portal.azure.com → App registrations
 */

export const msalConfig = {
  auth: {
    clientId: "00000003-0000-0000-c000-000000000000", // Application (client) ID
    authority: "https://login.microsoftonline.com/common",
    redirectUri: "http://localhost:5173",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Permissões solicitadas ao usuário
export const calendarScopes = {
  scopes: ["Calendars.Read", "User.Read"],
};
