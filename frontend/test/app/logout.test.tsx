import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from '../../src/routes/app/app-layout';
import { ExplorarPage } from '../../src/routes/app/explore';
import { PerfilPage } from '../../src/routes/app/profile';
import { SesionProvider } from '../../src/routes/session-context';
import { respuestaFetch, SESION } from '../auth/utils';

const LOGOUT_URL = 'http://localhost:3000/auth/logout';

function iniciarSesion() {
  localStorage.setItem('accessToken', SESION.accessToken);
  localStorage.setItem('refreshToken', SESION.refreshToken);
  localStorage.setItem('usuario', JSON.stringify(SESION.user));
}

function Ubicacion() {
  return <p data-testid="ubicacion">{useLocation().pathname}</p>;
}

function renderPerfil(ruta = '/perfil') {
  render(
    <SesionProvider>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/perfil" element={<PerfilPage />} />
            <Route path="/explorar" element={<ExplorarPage />} />
          </Route>
          <Route path="*" element={<Ubicacion />} />
        </Routes>
      </MemoryRouter>
    </SesionProvider>,
  );
}

/** Cierra sesión desde el menú de usuario de la cabecera. */
function cerrarSesionDesdeMenu() {
  fireEvent.click(screen.getByRole('button', { name: /juan pérez/i }));
  const menu = within(screen.getByRole('navigation', { name: 'Menú de usuario' }));
  fireEvent.click(menu.getByRole('button', { name: 'Cerrar sesión' }));
}

/** El perfil se queda cargando; solo responde el logout con la respuesta indicada. */
function simularLogout(
  fetchMock: ReturnType<typeof vi.fn>,
  respuesta: () => Promise<Response>,
) {
  fetchMock.mockImplementation((url: string) =>
    url === LOGOUT_URL ? respuesta() : new Promise(() => {}),
  );
}

/** La sesión guardada en el navegador queda vacía: tokens y usuario. */
function expectSesionBorrada() {
  expect(localStorage.getItem('accessToken')).toBeNull();
  expect(localStorage.getItem('refreshToken')).toBeNull();
  expect(localStorage.getItem('usuario')).toBeNull();
}

function llamadasLogout(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(([url]) => url === LOGOUT_URL);
}

describe('Cerrar sesión', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('revoca el refresh token en users-service', async () => {
    // Arrange
    iniciarSesion();
    simularLogout(fetchMock, () =>
      respuestaFetch(200, { message: 'Logged out successfully' }),
    );
    renderPerfil();

    // Act
    cerrarSesionDesdeMenu();

    // Assert
    await waitFor(() => expect(llamadasLogout(fetchMock)).toHaveLength(1));
    const [, opciones] = llamadasLogout(fetchMock)[0];
    expect(opciones.method).toBe('POST');
    expect(opciones.headers).toMatchObject({ 'Content-Type': 'application/json' });
    expect(JSON.parse(opciones.body)).toEqual({ refreshToken: 'refresh-token-456' });
  });

  it('borra la sesión guardada y lleva al login', async () => {
    // Arrange
    iniciarSesion();
    simularLogout(fetchMock, () =>
      respuestaFetch(200, { message: 'Logged out successfully' }),
    );
    renderPerfil();

    // Act
    cerrarSesionDesdeMenu();

    // Assert
    expect(await screen.findByTestId('ubicacion')).toHaveTextContent('/login');
    expectSesionBorrada();
  });

  it('lleva al login aunque cierre sesión desde una página pública', async () => {
    // Arrange
    iniciarSesion();
    simularLogout(fetchMock, () =>
      respuestaFetch(200, { message: 'Logged out successfully' }),
    );
    renderPerfil('/explorar');

    // Act
    cerrarSesionDesdeMenu();

    // Assert
    expect(await screen.findByTestId('ubicacion')).toHaveTextContent('/login');
  });

  it('borra la sesión guardada sin esperar la respuesta del servidor', async () => {
    // Arrange
    iniciarSesion();
    simularLogout(fetchMock, () => new Promise(() => {}));
    renderPerfil();

    // Act
    cerrarSesionDesdeMenu();

    // Assert
    expect(await screen.findByTestId('ubicacion')).toHaveTextContent('/login');
    expect(llamadasLogout(fetchMock)).toHaveLength(1);
    expectSesionBorrada();
  });

  it('cierra la sesión aunque el servidor rechace el token', async () => {
    // Arrange
    iniciarSesion();
    simularLogout(fetchMock, () =>
      respuestaFetch(401, { message: 'Invalid or expired refresh token', statusCode: 401 }),
    );
    renderPerfil();

    // Act
    cerrarSesionDesdeMenu();

    // Assert
    expect(await screen.findByTestId('ubicacion')).toHaveTextContent('/login');
    expect(llamadasLogout(fetchMock)).toHaveLength(1);
    expectSesionBorrada();
  });

  it('cierra la sesión aunque no haya conexión con el servidor', async () => {
    // Arrange
    iniciarSesion();
    simularLogout(fetchMock, () => Promise.reject(new TypeError('Failed to fetch')));
    renderPerfil();

    // Act
    cerrarSesionDesdeMenu();

    // Assert
    expect(await screen.findByTestId('ubicacion')).toHaveTextContent('/login');
    expect(llamadasLogout(fetchMock)).toHaveLength(1);
    expectSesionBorrada();
  });

  it('si la sesión venció no llama al logout del servidor', async () => {
    // Arrange
    iniciarSesion();
    fetchMock.mockImplementation((url: string) =>
      url === LOGOUT_URL
        ? respuestaFetch(200, { message: 'Logged out successfully' })
        : respuestaFetch(401, { message: 'Unauthorized', statusCode: 401 }),
    );

    // Act
    renderPerfil();

    // Assert
    expect(await screen.findByTestId('ubicacion')).toHaveTextContent('/login');
    expect(llamadasLogout(fetchMock)).toHaveLength(0);
    expectSesionBorrada();
  });
});
