/**
 * @file Definiciones de tipos globales para el entorno de Vite en TypeScript.
 */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USERS_API_URL: string;
  readonly VITE_CATALOG_API_URL: string;
  readonly VITE_ORDERS_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
