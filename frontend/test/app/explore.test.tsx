import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../src/App';
import { simularApi, SESION, type Respuestas } from '../auth/utils';
import { CATALOG_API_URL } from '../../src/config/env';

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
  imageUrl: 'https://test-agrotrace.s3.us-east-2.amazonaws.com/original/aguacate.jpeg',
};

const OFERTA_FRESA = {
  ...OFERTA_AGUACATE,
  OffertId: 'o-2',
  productId: 'p-fresa',
  pricePerUnit: 8000,
  availableQuantity: 15.5,
  aiQuality: null,
  imageUrl: null,
};

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
    expect(urls).toContain(`${CATALOG_API_URL}/offerts`);
    expect(urls).toContain(`${CATALOG_API_URL}/catalog`);
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

  it('muestra la foto de cada cosecha desde el bucket', async () => {
    // Arrange
    simularApi(fetchMock, API_CATALOGO);

    // Act
    renderExplorar();

    // Assert
    await screen.findByRole('heading', { name: 'Aguacate Hass' });
    expect(cosechaDe('Aguacate Hass').getByRole('img', { name: 'Foto de Aguacate Hass' })).toHaveAttribute(
      'src',
      OFERTA_AGUACATE.imageUrl,
    );
  });

  it('la foto de cada cosecha se ve completa, sin recortarse', async () => {
    // Arrange
    simularApi(fetchMock, API_CATALOGO);

    // Act
    renderExplorar();

    // Assert
    await screen.findByRole('heading', { name: 'Aguacate Hass' });
    const foto = cosechaDe('Aguacate Hass').getByRole('img', { name: 'Foto de Aguacate Hass' });
    expect(foto).toHaveClass('object-contain');
    expect(foto).not.toHaveClass('object-cover');
  });

  it('muestra un recuadro sin foto si la cosecha no tiene imagen', async () => {
    // Arrange
    simularApi(fetchMock, API_CATALOGO);

    // Act
    renderExplorar();

    // Assert
    await screen.findByRole('heading', { name: 'Fresa' });
    expect(cosechaDe('Fresa').getByRole('img', { name: 'Fresa sin foto' })).toBeInTheDocument();
  });

  it('cada cosecha enlaza a su detalle para pedir', async () => {
    // Arrange
    simularApi(fetchMock, API_CATALOGO);

    // Act
    renderExplorar();

    // Assert
    await screen.findByRole('heading', { name: 'Aguacate Hass' });
    expect(cosechaDe('Aguacate Hass').getByRole('link', { name: /ver detalle y pedir/i })).toHaveAttribute(
      'href',
      '/explorar/o-1',
    );
    expect(cosechaDe('Fresa').getByRole('link', { name: /ver detalle y pedir/i })).toHaveAttribute(
      'href',
      '/explorar/o-2',
    );
  });

  it('al dar click en "Ver detalle y pedir" abre el detalle de la cosecha', async () => {
    // Arrange
    simularApi(fetchMock, API_CATALOGO);
    renderExplorar();
    await screen.findByRole('heading', { name: 'Aguacate Hass' });

    // Act
    fireEvent.click(cosechaDe('Aguacate Hass').getByRole('link', { name: /ver detalle y pedir/i }));

    // Assert
    expect(await screen.findByRole('heading', { level: 1, name: 'Aguacate Hass' })).toBeInTheDocument();
    expect(screen.getByText('$ 3.500 COP')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Foto de Aguacate Hass' })).toHaveAttribute(
      'src',
      OFERTA_AGUACATE.imageUrl,
    );
    expect(screen.getByRole('button', { name: 'Ordenar ahora' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/explorar/o-1');
  });

  it('el detalle muestra un mensaje si la cosecha no existe', async () => {
    // Arrange
    simularApi(fetchMock, API_CATALOGO);

    // Act
    window.history.pushState({}, '', '/explorar/no-existe');
    render(<App />);

    // Assert
    expect(await screen.findByText('Esta cosecha ya no está disponible.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /volver a las cosechas/i })).toHaveAttribute('href', '/explorar');
  });

  it('el detalle muestra un error si no se puede cargar la cosecha', async () => {
    // Arrange
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    // Act
    window.history.pushState({}, '', '/explorar/o-1');
    render(<App />);

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar la cosecha. Intenta de nuevo.',
    );
  });

  it('el detalle sabe quién compra según la sesión iniciada', async () => {
    // Arrange: el agricultor dueño de la oferta abre su propia cosecha
    localStorage.setItem('accessToken', SESION.accessToken);
    localStorage.setItem('refreshToken', SESION.refreshToken);
    localStorage.setItem('usuario', JSON.stringify({ ...SESION.user, userId: 'c270fc1a', role: 'Agricultor' }));
    simularApi(fetchMock, API_CATALOGO);

    // Act
    window.history.pushState({}, '', '/explorar/o-1');
    render(<App />);

    // Assert
    expect(await screen.findByText('No puedes comprar tus propios productos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ordenar ahora' })).toBeDisabled();
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
