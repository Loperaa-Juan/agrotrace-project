import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { simularApi } from '../auth/utils';

const ADMIN = {
  userId: 'ad000001',
  name: 'Laura Admin',
  email: 'admin@agrotrace.com',
  role: 'Admin',
};

function iniciarSesion(usuario = ADMIN) {
  localStorage.setItem('accessToken', 'access-token-123');
  localStorage.setItem('refreshToken', 'refresh-token-456');
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

const PRODUCTOS = [
  {
    ProductId: 'p-aguacate',
    name: 'Aguacate Hass',
    category: 'Frutas',
    unitOfMeasure: 'lb',
    description: 'Aguacate cremoso',
    isActive: true,
  },
  {
    ProductId: 'p-papa',
    name: 'Papa criolla',
    category: 'Tubérculos',
    unitOfMeasure: 'kg',
    description: null,
    isActive: true,
  },
];

/** Abre la aplicación completa en /catalogo-maestro. */
function renderCatalogoMaestro() {
  window.history.pushState({}, '', '/catalogo-maestro');
  render(<App />);
}

describe('Tests en Master Catalog', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    simularApi(fetchMock, { 'GET /catalog': [200, []] });
    localStorage.clear();
    iniciarSesion();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  it('se renderiza la pantalla de catálogo maestro', () => {
    // Act
    renderCatalogoMaestro();

    // Assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'Catálogo maestro' }),
    ).toBeInTheDocument();
  });

  it('se renderiza el header de la aplicación', () => {
    // Act
    renderCatalogoMaestro();

    // Assert
    expect(
      within(screen.getByRole('banner')).getByRole('button', { name: /laura admin/i }),
    ).toBeInTheDocument();
  });

  it('muestra un texto informativo de qué es el catálogo maestro', () => {
    // Act
    renderCatalogoMaestro();

    // Assert
    expect(
      screen.getByText(/los agricultores solo publican productos activos de este catálogo/i),
    ).toBeInTheDocument();
  });

  it('tiene un botón para crear una nueva categoría', () => {
    // Act
    renderCatalogoMaestro();

    // Assert
    expect(screen.getByRole('button', { name: 'Agregar categoría' })).toBeInTheDocument();
  });

  it('tiene un botón para agregar un nuevo producto', () => {
    // Act
    renderCatalogoMaestro();

    // Assert
    expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeInTheDocument();
  });

  it('muestra un aviso de que la vista es solo para administradores', () => {
    // Act
    renderCatalogoMaestro();

    // Assert
    expect(screen.getByRole('note')).toHaveTextContent(
      'Esta vista es solo para administradores.',
    );
  });

  it('al dar clic en "Agregar categoría" despliega un form con un input y dos botones', () => {
    // Arrange
    renderCatalogoMaestro();

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Agregar categoría' }));

    // Assert
    const form = screen.getByRole('form', { name: 'Nueva categoría' });
    expect(within(form).getAllByRole('textbox')).toHaveLength(1);
    expect(within(form).getAllByRole('button')).toHaveLength(2);
    expect(within(form).getByRole('button', { name: 'Crear categoría' })).toBeInTheDocument();
    expect(within(form).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('al dar clic en "Agregar producto" muestra un form para ingresar los datos del producto', () => {
    // Arrange
    renderCatalogoMaestro();

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));

    // Assert
    const form = screen.getByRole('form', { name: 'Nuevo producto' });
    expect(within(form).getByLabelText(/nombre del producto/i)).toBeInTheDocument();
    expect(within(form).getByLabelText(/categoría/i)).toBeInTheDocument();
    expect(within(form).getByLabelText(/unidad de medida/i)).toBeInTheDocument();
    expect(
      within(form).getByRole('button', { name: 'Agregar al catálogo' }),
    ).toBeInTheDocument();
    expect(within(form).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  describe('acceso', () => {
    it('sin sesión lleva al login', async () => {
      // Arrange
      localStorage.clear();

      // Act
      renderCatalogoMaestro();

      // Assert
      await waitFor(() => expect(window.location.pathname).toBe('/login'));
    });

    it('un usuario que no es administrador va a explorar', async () => {
      // Arrange
      iniciarSesion({ ...ADMIN, role: 'Persona' });
      simularApi(fetchMock, { 'GET /offerts': [200, []] });

      // Act
      renderCatalogoMaestro();

      // Assert
      await waitFor(() => expect(window.location.pathname).toBe('/explorar'));
    });
  });

  describe('lista de productos', () => {
    it('agrupa los productos por categoría', async () => {
      // Arrange
      simularApi(fetchMock, { 'GET /catalog': [200, PRODUCTOS] });

      // Act
      renderCatalogoMaestro();

      // Assert
      const frutas = await screen.findByRole('region', { name: /frutas/i });
      expect(await within(frutas).findByText('Aguacate Hass')).toBeInTheDocument();
      expect(within(frutas).getByText('Aguacate cremoso')).toBeInTheDocument();
      expect(within(frutas).getByText('Se vende por lb')).toBeInTheDocument();
      const tuberculos = screen.getByRole('region', { name: /tubérculos/i });
      expect(within(tuberculos).getByText('Papa criolla')).toBeInTheDocument();
    });

    it('avisa cuando una categoría no tiene productos', async () => {
      // Arrange
      simularApi(fetchMock, { 'GET /catalog': [200, PRODUCTOS] });

      // Act
      renderCatalogoMaestro();

      // Assert
      const cereales = await screen.findByRole('region', { name: /cereales/i });
      expect(
        within(cereales).getByText('Esta categoría aún no tiene productos.'),
      ).toBeInTheDocument();
    });

    it('muestra un error si no puede cargar el catálogo', async () => {
      // Arrange
      simularApi(fetchMock, { 'GET /catalog': [500, { message: 'Error interno' }] });

      // Act
      renderCatalogoMaestro();

      // Assert
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No pudimos cargar el catálogo. Intente de nuevo.',
      );
    });

    it('cierra la sesión si vence mientras carga el catálogo', async () => {
      // Arrange
      simularApi(fetchMock, { 'GET /catalog': [401, { message: 'Unauthorized' }] });

      // Act
      renderCatalogoMaestro();

      // Assert
      await waitFor(() => expect(window.location.pathname).toBe('/login'));
      expect(localStorage.getItem('accessToken')).toBeNull();
    });
  });

  describe('crear categoría', () => {
    function abrirFormularioCategoria() {
      renderCatalogoMaestro();
      fireEvent.click(screen.getByRole('button', { name: 'Agregar categoría' }));
      return screen.getByRole('form', { name: 'Nueva categoría' });
    }

    it('oculta los botones de agregar mientras el form está abierto', () => {
      // Act
      abrirFormularioCategoria();

      // Assert
      expect(screen.queryByRole('button', { name: 'Agregar producto' })).toBeNull();
    });

    it('crea la categoría, la muestra y avisa', () => {
      // Arrange
      const form = abrirFormularioCategoria();
      fireEvent.change(within(form).getByLabelText(/nombre de la categoría/i), {
        target: { value: '  Hierbas   aromáticas ' },
      });

      // Act
      fireEvent.click(within(form).getByRole('button', { name: 'Crear categoría' }));

      // Assert
      expect(screen.getByRole('status')).toHaveTextContent(
        'Creaste la categoría «Hierbas aromáticas». Ya puedes agregarle productos.',
      );
      expect(screen.getByRole('region', { name: /hierbas aromáticas/i })).toBeInTheDocument();
      expect(screen.queryByRole('form', { name: 'Nueva categoría' })).toBeNull();
    });

    it('no crea una categoría sin nombre', () => {
      // Arrange
      const form = abrirFormularioCategoria();

      // Act
      fireEvent.click(within(form).getByRole('button', { name: 'Crear categoría' }));

      // Assert
      expect(screen.getByText('Escriba el nombre de la categoría.')).toBeInTheDocument();
      expect(within(form).getByLabelText(/nombre de la categoría/i)).toBeInvalid();
    });

    it('no crea una categoría repetida', () => {
      // Arrange
      const form = abrirFormularioCategoria();
      fireEvent.change(within(form).getByLabelText(/nombre de la categoría/i), {
        target: { value: 'frutas' },
      });

      // Act
      fireEvent.click(within(form).getByRole('button', { name: 'Crear categoría' }));

      // Assert
      expect(screen.getByText('Ya existe una categoría con ese nombre.')).toBeInTheDocument();
    });

    it('quita el error al volver a escribir', () => {
      // Arrange
      const form = abrirFormularioCategoria();
      fireEvent.click(within(form).getByRole('button', { name: 'Crear categoría' }));

      // Act
      fireEvent.change(within(form).getByLabelText(/nombre de la categoría/i), {
        target: { value: 'Lácteos' },
      });

      // Assert
      expect(screen.queryByText('Escriba el nombre de la categoría.')).toBeNull();
    });

    it('cancelar cierra el form y vuelve a mostrar los botones', () => {
      // Arrange
      const form = abrirFormularioCategoria();

      // Act
      fireEvent.click(within(form).getByRole('button', { name: 'Cancelar' }));

      // Assert
      expect(screen.queryByRole('form', { name: 'Nueva categoría' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Agregar categoría' })).toBeInTheDocument();
    });
  });

  describe('crear producto', () => {
    const NUEVO = {
      ProductId: 'p-tomate',
      name: 'Tomate chonto',
      category: 'Hortalizas',
      unitOfMeasure: 'kg',
      description: 'Tomate rojo',
      isActive: true,
    };

    function abrirFormularioProducto() {
      renderCatalogoMaestro();
      fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
      return screen.getByRole('form', { name: 'Nuevo producto' });
    }

    function llenar(form: HTMLElement) {
      fireEvent.change(within(form).getByLabelText(/nombre del producto/i), {
        target: { value: '  Tomate   chonto ' },
      });
      fireEvent.change(within(form).getByLabelText(/categoría/i), {
        target: { value: 'Hortalizas' },
      });
      fireEvent.change(within(form).getByLabelText(/unidad de medida/i), {
        target: { value: 'kg' },
      });
      fireEvent.change(within(form).getByLabelText(/descripción/i), {
        target: { value: ' Tomate rojo ' },
      });
    }

    const enviar = (form: HTMLElement) =>
      fireEvent.click(within(form).getByRole('button', { name: 'Agregar al catálogo' }));

    it('no envía el form vacío y señala los cuatro campos', () => {
      // Arrange
      const form = abrirFormularioProducto();

      // Act
      enviar(form);

      // Assert
      expect(screen.getByText('Escriba el nombre del producto.')).toBeInTheDocument();
      expect(screen.getByText('Elija una categoría.')).toBeInTheDocument();
      expect(screen.getByText('Elija una unidad de medida.')).toBeInTheDocument();
      expect(screen.getByText('Escriba una descripción del producto.')).toBeInTheDocument();
      expect(fetchMock.mock.calls.some(([, o]) => o?.method === 'POST')).toBe(false);
    });

    it('quita el error de un campo al cambiarlo', () => {
      // Arrange
      const form = abrirFormularioProducto();
      enviar(form);

      // Act
      fireEvent.change(within(form).getByLabelText(/nombre del producto/i), {
        target: { value: 'Tomate' },
      });

      // Assert
      expect(screen.queryByText('Escriba el nombre del producto.')).toBeNull();
    });

    it('crea el producto en catalog-service, lo muestra y avisa', async () => {
      // Arrange
      simularApi(fetchMock, {
        'GET /catalog': [200, []],
        'POST /catalog': [201, NUEVO],
      });
      const form = abrirFormularioProducto();
      llenar(form);

      // Act
      enviar(form);

      // Assert
      expect(await screen.findByRole('status')).toHaveTextContent(
        'Agregaste «Tomate chonto» al catálogo.',
      );
      const [, opciones] = fetchMock.mock.calls.find(
        ([url, o]) => new URL(url).pathname === '/catalog' && o?.method === 'POST',
      )!;
      expect(JSON.parse(opciones.body)).toEqual({
        name: 'Tomate chonto',
        category: 'Hortalizas',
        unitOfMeasure: 'kg',
        description: 'Tomate rojo',
      });
      const hortalizas = screen.getByRole('region', { name: /hortalizas/i });
      expect(within(hortalizas).getByText('Tomate chonto')).toBeInTheDocument();
      expect(screen.queryByRole('form', { name: 'Nuevo producto' })).toBeNull();
    });

    it('permite elegir una categoría recién creada', () => {
      // Arrange
      renderCatalogoMaestro();
      fireEvent.click(screen.getByRole('button', { name: 'Agregar categoría' }));
      fireEvent.change(screen.getByLabelText(/nombre de la categoría/i), {
        target: { value: 'Lácteos' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));

      // Assert
      expect(screen.getByRole('option', { name: 'Lácteos' })).toBeInTheDocument();
    });

    it('muestra el mensaje del servidor si rechaza el producto', async () => {
      // Arrange
      simularApi(fetchMock, {
        'GET /catalog': [200, []],
        'POST /catalog': [
          409,
          { statusCode: 409, message: 'Ya existe un producto con ese nombre' },
        ],
      });
      const form = abrirFormularioProducto();
      llenar(form);

      // Act
      enviar(form);

      // Assert
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No pudimos agregar el producto: Ya existe un producto con ese nombre',
      );
      expect(screen.getByRole('form', { name: 'Nuevo producto' })).toBeInTheDocument();
      expect(
        within(form).getByRole('button', { name: 'Agregar al catálogo' }),
      ).toBeEnabled();
    });

    it('muestra un error genérico si falla la red', async () => {
      // Arrange: sin respuesta para POST /catalog, el fetch se rechaza
      simularApi(fetchMock, { 'GET /catalog': [200, []] });
      const form = abrirFormularioProducto();
      llenar(form);

      // Act
      enviar(form);

      // Assert
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No pudimos agregar el producto. Intente de nuevo.',
      );
    });

    it('cierra la sesión si vence al crear el producto', async () => {
      // Arrange
      simularApi(fetchMock, {
        'GET /catalog': [200, []],
        'POST /catalog': [401, { message: 'Unauthorized' }],
      });
      const form = abrirFormularioProducto();
      llenar(form);

      // Act
      enviar(form);

      // Assert
      await waitFor(() => expect(window.location.pathname).toBe('/login'));
      expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('cancelar cierra el form y vuelve a mostrar los botones', () => {
      // Arrange
      const form = abrirFormularioProducto();

      // Act
      fireEvent.click(within(form).getByRole('button', { name: 'Cancelar' }));

      // Assert
      expect(screen.queryByRole('form', { name: 'Nuevo producto' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Agregar producto' })).toBeInTheDocument();
    });
  });
});
