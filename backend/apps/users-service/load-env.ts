import { existsSync } from 'node:fs';

// Debe importarse antes que cualquier otro módulo: users-service.module.ts lee process.env al evaluarse.
const envFile = 'apps/users-service/.env';
if (existsSync(envFile)) process.loadEnvFile(envFile);
