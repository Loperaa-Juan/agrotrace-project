import { existsSync } from 'node:fs';

// Debe importarse antes que cualquier otro módulo: catalog-service.module.ts lee process.env al evaluarse.
const envFile = 'apps/catalog-service/.env';
if (existsSync(envFile)) process.loadEnvFile(envFile);
