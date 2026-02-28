// api/auth-manager.js
// Este archivo gestiona la autenticación automática en todas las plataformas por medio de la base de datos central, y lo hace derivando dinámicamente la obtención de tokens al archivo específico de cada plataforma.

async function getPlatformAccessToken(platformName, contextData = {}) {
    try {
        // 1. Localización dinámica del módulo (Ruta según la estructura de proyecto)
        const modulePath = `./${platformName}/auth/get-access-token.js`;
        const platformModule = require(modulePath);

        // 2. Delegación total: Pasamos el 'contextData' tal cual 
        // Cada plataforma decidirá si necesita el location_id, tokens de la DB, etc.
        return await platformModule.getAccessToken(contextData);

    } catch (error) {
        // El manager solo reporta que la delegación falló
        throw new Error(`[AuthManager] Error en ${platformName}: ${error.message}`);
    }
}
