import { existsSync } from 'node:fs';

/**
 * Archivo de inicialización de entorno.
 * Verifica la existencia del archivo `.env` del microservicio y lo carga 
 * en el proceso antes de que se evalúen los módulos de NestJS.
 */
// Debe importarse antes que cualquier otro módulo: users-service.module.ts lee process.env al evaluarse.
const envFile = 'apps/users-service/.env';
if (existsSync(envFile)) process.loadEnvFile(envFile);
