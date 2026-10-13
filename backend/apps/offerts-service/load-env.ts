import { existsSync } from 'node:fs';

// Debe importarse antes que cualquier otro módulo: offerts-service.module.ts lee process.env al evaluarse.
const envFile = 'apps/offerts-service/.env';
if (existsSync(envFile)) process.loadEnvFile(envFile);
