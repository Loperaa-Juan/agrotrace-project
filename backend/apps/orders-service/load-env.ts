import { existsSync } from 'node:fs';

// Debe importarse antes que cualquier otro módulo: orders-service.module.ts lee process.env al evaluarse.
const envFile = 'apps/orders-service/.env';
if (existsSync(envFile)) process.loadEnvFile(envFile);
