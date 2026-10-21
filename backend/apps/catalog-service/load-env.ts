/**
 * Inicializador de entorno para catalog-service.
 * Debe importarse obligatoriamente antes que cualquier otro módulo, 
 * ya que catalog-service.module.ts evalúa process.env al momento de inicializarse.
 */

import { existsSync } from 'node:fs';

// Debe importarse antes que cualquier otro módulo: catalog-service.module.ts lee process.env al evaluarse.
const envFile = 'apps/catalog-service/.env';
if (existsSync(envFile)) process.loadEnvFile(envFile);
