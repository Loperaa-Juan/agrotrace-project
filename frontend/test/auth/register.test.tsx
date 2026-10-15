import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderPagina, respuestaFetch, SESION } from './utils';

function escribir(etiqueta: RegExp, valor: string) {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
}

function llenarRegistroValido() {
  escribir(/nombre completo/i, 'Juan Pérez');
  escribir(/número de documento/i, '1020304050');
  escribir(/correo electrónico/i, 'juan@agrotrace.com');
  escribir(/teléfono celular/i, '3001234567');
  escribir(/contraseña de acceso/i, 'Segura123');
  escribir(/dirección/i, 'Calle 10 # 20-30');
  escribir(/municipio/i, 'Envigado');
}

function enviarRegistro() {
  fireEvent.click(screen.getByRole('button', { name: /crear perfil de productor local/i }));
}

describe('Registro en la página de login', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('el perfil de negocio solo permite registrarse con NIT', () => {
    // Arrange
    renderPagina('/login?modo=registro');

    // Act
    fireEvent.click(screen.getByRole('radio', { name: /negocio \/ restaurante/i }));

    // Assert
    const opciones = within(screen.getByLabelText(/tipo de documento/i)).getAllByRole('option');
    expect(opciones.map((opcion) => opcion.textContent)).toEqual(['NIT']);
  });

  it('muestra los errores de los campos y no llama al servidor', () => {
    // Arrange
    renderPagina('/login?modo=registro');

    // Act
    enviarRegistro();

    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Revisa los campos marcados para crear tu cuenta.',
    );
    expect(screen.getByText('Ingresa tu nombre completo')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('crea la cuenta del agricultor y lo lleva a su perfil', async () => {
    // Arrange
    fetchMock.mockReturnValue(respuestaFetch(201, SESION));
    renderPagina('/login?modo=registro');
    llenarRegistroValido();

    // Act
    enviarRegistro();

    // Assert
    expect(await screen.findByTestId('ubicacion')).toHaveTextContent('/perfil');
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/register$/);
    expect(JSON.parse(opciones.body)).toEqual({
      name: 'Juan Pérez',
      documentType: 'CC',
      documentNumber: '1020304050',
      email: 'juan@agrotrace.com',
      phone: '3001234567',
      password: 'Segura123',
      address: 'Calle 10 # 20-30',
      municipality: 'Envigado',
      role: 'Agricultor',
    });
  });

  it('avisa si el correo ya está registrado', async () => {
    // Arrange
    fetchMock.mockReturnValue(
      respuestaFetch(409, {
        message: 'A user with this email already exists.',
        error: 'Conflict',
        statusCode: 409,
      }),
    );
    renderPagina('/login?modo=registro');
    llenarRegistroValido();

    // Act
    enviarRegistro();

    // Assert
    await waitFor(() =>
      expect(screen.getByText('Ya existe una cuenta con este correo.')).toBeInTheDocument(),
    );
  });

  it('avisa si el servidor falla al crear la cuenta', async () => {
    // Arrange
    fetchMock.mockReturnValue(
      respuestaFetch(500, { message: 'Internal server error', statusCode: 500 }),
    );
    renderPagina('/login?modo=registro');
    llenarRegistroValido();

    // Act
    enviarRegistro();

    // Assert
    expect(
      await screen.findByText('Algo salió mal en el servidor. Intenta de nuevo más tarde.'),
    ).toBeInTheDocument();
  });

  it('avisa si no hay conexión con el servidor', async () => {
    // Arrange
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderPagina('/login?modo=registro');
    llenarRegistroValido();

    // Act
    enviarRegistro();

    // Assert
    expect(
      await screen.findByText('No pudimos conectar con el servidor. Intenta de nuevo.'),
    ).toBeInTheDocument();
  });
});
