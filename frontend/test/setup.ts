import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.stubEnv('VITE_USERS_API_URL', 'http://users.test');
vi.stubEnv('VITE_CATALOG_API_URL', 'http://catalog.test');
vi.stubEnv('VITE_ORDERS_API_URL', 'http://orders.test');
