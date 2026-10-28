/**
 * @file Utilidades para la lectura y validación segura de variables de entorno del cliente.
 * Garantiza que las URLs de los microservicios estén definidas antes de arrancar la aplicación.
 */

/**
 * Lee y valida una variable de entorno requerida de Vite.
 * @throws {Error} Si la variable no está definida en el entorno.
 * @param {keyof ImportMetaEnv} nombre Nombre de la variable de entorno a leer.
 * @returns {string} Valor de la variable de entorno.
 */

function leerVariable(nombre: keyof ImportMetaEnv): string {
  const valor = import.meta.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revisa el archivo .env (ver .env.example).`);
  }
  return valor;
}

/** URL base del microservicio de usuarios (users-service). */
export const USERS_API_URL = leerVariable('VITE_USERS_API_URL');

/** URL base del microservicio de catálogo (catalog-service). */
export const CATALOG_API_URL = leerVariable('VITE_CATALOG_API_URL');

/** URL base del microservicio de pedidos (orders-service). */
export const ORDERS_API_URL = leerVariable('VITE_ORDERS_API_URL');
  