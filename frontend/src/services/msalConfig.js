/**
 * Configuração Microsoft Authentication Library (MSAL)
 * ──────────────────────────────────────────────────────
 * Os valores são lidos de variáveis de ambiente (arquivo .env).
 * Copie .env.example para .env e preencha VITE_OUTLOOK_CLIENT_ID e
 * VITE_OUTLOOK_REDIRECT_URI com os dados do seu app no Azure Portal.
 * https://portal.azure.com → App registrations
 */

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_OUTLOOK_CLIENT_ID,
    authority: "https://login.microsoftonline.com/common", // multi-tenant (contas pessoais + empresariais)
    redirectUri: import.meta.env.VITE_OUTLOOK_REDIRECT_URI,
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
