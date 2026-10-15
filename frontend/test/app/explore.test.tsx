import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import App from '../../src/App';
import { respuestaFetch, SESION } from '../auth/utils';

const PRODUCTOS = [
  { ProductId: 'p-aguacate', name: 'Aguacate Hass', unitOfMeasure: 'lb', isActive: true },
  { ProductId: 'p-fresa', name: 'Fresa', unitOfMeasure: 'kg', isActive: true },
];

const OFERTA_AGUACATE = {
  OffertId: 'o-1',
  productId: 'p-aguacate',
  farmerId: 'c270fc1a',
  description: 'Cosecha de esta semana',
  pricePerUnit: 3500,
  availableQuantity: 120,
  harvestDate: '2026-10-10',
  aiQuality: 'Buena',
  isActive: true,
};

const OFERTA_FRESA = {
  ...OFERTA_AGUACATE,
  OffertId: 'o-2',
  productId: 'p-fresa',
  pricePerUnit: 8000,
  availableQuantity: 15.5,
  aiQuality: null,
};

type Respuestas = Record<string, [status: number, body?: unknown]>;

/** Responde cada petición según su método y ruta, por ejemplo `GET /offerts`. */
function simularApi(fetchMock: ReturnType<typeof vi.fn>, respuestas: Respuestas) {
  fetchMock.mockImplementation((url: string, opciones?: RequestInit) => {
    const peticion = `${opciones?.method ?? 'GET'} ${new URL(url).pathname}`;
    const respuesta = respuestas[peticion];
    if (!respuesta) return Promise.reject(new Error(`Sin respuesta para ${peticion}`));
    return respuestaFetch(respuesta[0], respuesta[1] ?? {});
  });
}

const API_CATALOGO: Respuestas = {
  'GET /offerts': [200, [OFERTA_AGUACATE, OFERTA_FRESA]],
  'GET /catalog': [200, PRODUCTOS],
};

/** Abre la aplicación completa en /explorar. */
function renderExplorar() {
  window.history.pushState({}, '', '/explorar');
  render(<App />);
}

function cosechaDe(producto: string) {
  return within(screen.getByRole('heading', { name: producto }).closest('li')!);
}

describe('Explorar cosechas', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  it('muestra las cosechas sin iniciar sesión', async () => {
    // Arrange
    simularApi(fetchMock, API_CATALOGO);

    // Act
    renderExplorar();

    // Assert
    expect(await screen.findByRole('heading', { level: 1, name: /cosechas/i })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Aguacate Hass' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fresa' })).toBeInTheDocument();
  });

  it('pide las cosechas y los productos a catalog-service', async () => {
    // Arrange
    simularApi(fetchMock, API_CATALOGO);

    // Act
    renderExplorar();

    // Assert
    await screen.findByRole('heading', { name: 'Aguacate Hass' });
    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toContain('http://localhost:3002/offerts');
    expect(urls).toContain('http://localhost:3002/catalog');
  });

  it('muestra el precio y la cantidad disponible de cada cosecha', async () => {
    // Arrange
    simularApi(fetchMock, API_CATALOGO);

    // Act
    renderExplorar();

    // Assert
    await screen.findByRole('heading', { name: 'Aguacate Hass' });
    expect(cosechaDe('Aguacate Hass').getByText('$ 3.500 COP / lb')).toBeInTheDocument();
    expect(cosechaDe('Aguacate Hass').getByText('120 lb disponibles')).toBeInTheDocument();
    expect(cosechaDe('Fresa').getByText('$ 8.000 COP / kg')).toBeInTheDocument();
    expect(cosechaDe('Fresa').getByText('15,5 kg disponibles')).toBeInTheDocument();
  });

  it('muestra la calidad solo si la cosecha ya fue clasificada', async () => {
    // Arrange
    simularApi(fetchMock, API_CATALOGO);

    // Act
    renderExplorar();

    // Assert
    await screen.findByRole('heading', { name: 'Aguacate Hass' });
    expect(cosechaDe('Aguacate Hass').getByText('Calidad Buena')).toBeInTheDocument();
    expect(cosechaDe('Fresa').queryByText(/calidad/i)).toBeNull();
  });

  it('también funciona con la sesión iniciada', async () => {
    // Arrange
    localStorage.setItem('accessToken', SESION.accessToken);
    localStorage.setItem('refreshToken', SESION.refreshToken);
    localStorage.setItem('usuario', JSON.stringify({ ...SESION.user, role: 'Persona' }));
    simularApi(fetchMock, API_CATALOGO);

    // Act
    renderExplorar();

    // Assert
    expect(await screen.findByRole('heading', { name: 'Aguacate Hass' })).toBeInTheDocument();
  });

  it('muestra un mensaje si aún no hay cosechas', async () => {
    // Arrange
    simularApi(fetchMock, { ...API_CATALOGO, 'GET /offerts': [200, []] });

    // Act
    renderExplorar();

    // Assert
    expect(await screen.findByText('Aún no hay cosechas publicadas.')).toBeInTheDocument();
  });

  it('muestra un error si no se pueden cargar las cosechas', async () => {
    // Arrange
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    // Act
    renderExplorar();

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar las cosechas. Intenta de nuevo.',
    );
  });
});
