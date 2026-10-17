function leerVariable(nombre: keyof ImportMetaEnv): string {
  const valor = import.meta.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Revisa el archivo .env (ver .env.example).`);
  }
  return valor;
}

export const USERS_API_URL = leerVariable('VITE_USERS_API_URL');
export const CATALOG_API_URL = leerVariable('VITE_CATALOG_API_URL');
export const ORDERS_API_URL = leerVariable('VITE_ORDERS_API_URL');
