import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderPagina, respuestaFetch, SESION } from './utils';

function llenarFormulario(correo: string, clave: string) {
  fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
    target: { value: correo },
  });
  fireEvent.change(screen.getByLabelText(/contraseña de acceso/i), {
    target: { value: clave },
  });
}

function enviarFormulario() {
  fireEvent.click(screen.getByRole('button', { name: /ingresar a agrotrace/i }));
}

describe('Login page', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envía el correo y la contraseña a /auth/login', async () => {
    // Arrange
    fetchMock.mockReturnValue(respuestaFetch(200, SESION));
    renderPagina('/login');
    llenarFormulario('juan@agrotrace.com', 'Segura123');

    // Act
    enviarFormulario();

    // Assert
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/login$/);
    expect(JSON.parse(opciones.body)).toEqual({
      email: 'juan@agrotrace.com',
      password: 'Segura123',
    });
  });

  it('guarda la sesión y lleva al inicio del rol si los datos son correctos', async () => {
    // Arrange
    fetchMock.mockReturnValue(respuestaFetch(200, SESION));
    renderPagina('/login');
    llenarFormulario('juan@agrotrace.com', 'Segura123');

    // Act
    enviarFormulario();

    // Assert
    expect(await screen.findByTestId('ubicacion')).toHaveTextContent('/perfil');
    expect(localStorage.getItem('accessToken')).toBe('access-token-123');
  });

  it('muestra un error si el correo o la contraseña son incorrectos', async () => {
    // Arrange
    fetchMock.mockReturnValue(
      respuestaFetch(401, {
        message: 'Invalid email or password',
        error: 'Unauthorized',
        statusCode: 401,
      }),
    );
    renderPagina('/login');
    llenarFormulario('juan@agrotrace.com', 'Incorrecta1');

    // Act
    enviarFormulario();

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No encontramos una cuenta con esos datos. Revisa el correo y la contraseña.',
    );
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('el botón del ojo muestra la contraseña', () => {
    // Arrange
    renderPagina('/login');

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar u ocultar contraseña' }));

    // Assert
    expect(screen.getByLabelText(/contraseña de acceso/i)).toHaveAttribute('type', 'text');
  });

  it('"Regístrate en 2 minutos" cambia al formulario de registro', () => {
    // Arrange
    renderPagina('/login');

    // Act
    fireEvent.click(screen.getByRole('button', { name: /regístrate en 2 minutos/i }));

    // Assert
    expect(
      screen.getByRole('button', { name: /crear perfil de productor local/i }),
    ).toBeInTheDocument();
  });
});
