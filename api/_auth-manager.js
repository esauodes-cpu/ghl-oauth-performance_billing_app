// api/auth-manager.js
// Este archivo gestiona la autenticación automática en todas las plataformas.

export async function getPlatformAccessToken(platformName, contextData = {}) {
    try {
        // 1. Localización dinámica usando import() (estándar ESM)
        // La ruta es relativa a este archivo: ./ghl/auth/get-access-token.js
        const modulePath = `./${platformName}/auth/get-access-token.js`;
        
        // 2. Importación dinámica del módulo de la plataforma
        const platformModule = await import(modulePath);

        // 3. Delegación: Accedemos a la función exportada en get-access-token.js
        // Pasamos el 'contextData' (que contiene el location_id)
        return await platformModule.getAccessToken(contextData);

    } catch (error) {
        // Reportamos el error detallado para debug
        console.error(`[AuthManager Error]:`, error);
        throw new Error(`[AuthManager] Error en ${platformName}: ${error.message}`);
    }
}
