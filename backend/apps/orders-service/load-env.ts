import { existsSync } from 'node:fs';

/**
 * Archivo de inicialización de entorno para orders-service.
 * Debe importarse antes que cualquier otro módulo, ya que orders-service.module.ts 
 * lee las variables de process.env al evaluarse.
 */
const envFile = 'apps/orders-service/.env';
if (existsSync(envFile)) process.loadEnvFile(envFile);
