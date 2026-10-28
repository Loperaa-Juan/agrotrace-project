/**
 * Inicializador de entorno para orders-service. Carga el archivo .env específico
 * antes de que los módulos intenten evaluar process.env.
 */
import { existsSync } from 'node:fs';

// Debe importarse antes que cualquier otro módulo: orders-service.module.ts lee process.env al evaluarse.
const envFile = 'apps/orders-service/.env';
if (existsSync(envFile)) process.loadEnvFile(envFile);
