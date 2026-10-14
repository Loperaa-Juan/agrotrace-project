import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LoginPage } from '../../src/routes/auth/login';
import { SesionProvider } from '../../src/routes/session-context';

// eslint-disable-next-line react-refresh/only-export-components
function Ubicacion() {
  return <p data-testid="ubicacion">{useLocation().pathname}</p>;
}

export function renderPagina(ruta: string) {
  render(
    <SesionProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Ubicacion />} />
        </Routes>
      </MemoryRouter>
    </SesionProvider>,
  );
}

export function respuestaFetch(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

export const SESION = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-456',
  user: {
    userId: 'c270fc1a',
    name: 'Juan Pérez',
    email: 'juan@agrotrace.com',
    role: 'Agricultor',
  },
};
