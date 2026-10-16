import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import FilterPage from '../../src/routes/app/filter-page';
import { simularApi, type Respuestas } from '../auth/utils';

const PRODUCTOS = [
  { ProductId: 'p-aguacate', name: 'Aguacate Hass', unitOfMeasure: 'lb', isActive: true },
  { ProductId: 'p-fresa', name: 'Fresa', unitOfMeasure: 'kg', isActive: true },
  { ProductId: 'p-mango', name: 'Mango', unitOfMeasure: 'kg', isActive: true },
];

const OFERTA_AGUACATE = {
  OffertId: 'o-1',
  productId: 'p-aguacate',
  farmerId: 'c270fc1a',
  description: 'Cosecha de esta semana',
  pricePerUnit: 1000,
  availableQuantity: 120,
  harvestDate: '2026-10-10',
  aiQuality: 'A',
  isActive: true,
};

const OFERTA_FRESA = {
  ...OFERTA_AGUACATE,
  OffertId: 'o-2',
  productId: 'p-fresa',
  pricePerUnit: 800,
  aiQuality: 'B',
};

const OFERTA_MANGO = {
  ...OFERTA_AGUACATE,
  OffertId: 'o-3',
  productId: 'p-mango',
  pricePerUnit: 3500,
  aiQuality: 'A',
};

const API_CATALOGO: Respuestas = {
  'GET /offerts': [200, [OFERTA_AGUACATE, OFERTA_FRESA, OFERTA_MANGO]],
  'GET /catalog': [200, PRODUCTOS],
};

/** Renderiza la página y espera a que carguen las cosechas. */
async function renderConCosechas() {
  render(<FilterPage />);
  await screen.findByRole('heading', { name: 'Aguacate Hass' });
}

describe('Tests en FilterPage', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    simularApi(fetchMock, API_CATALOGO);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Se debe renderizar el componente FilterPage correctamente
  it('debe renderizar el componente correctamente', () => {
    // Arrange: renderizamos la página
    const { container } = render(<FilterPage />);

    // Assert
    expect(container).not.toBeEmptyDOMElement();
  });

  it('Se debe mostrar un Mensaje de "Encuentra tu cosecha" en la vista', () => {
    // Arrange: renderizamos la página
    render(<FilterPage />);

    // Assert
    expect(screen.getByText('Encuentra tu cosecha')).toBeInTheDocument();
  });

  it('Se le debe mostrar al usuario un botón para aplicar los filtros (Buscar)', () => {
    // Arrange: renderizamos la página
    render(<FilterPage />);

    // Act: definimos el botón
    const boton = screen.getByRole('button', { name: 'Enviar' });
    expect(boton).toBeInTheDocument();
  });


  it('Se debe mostrar un placeholder con el input "Filtra por nombre"', () => {
    // Arrange: renderizamos la página
    const { container } = render(<FilterPage />);

    // Act: definimos el placeholder a evaluar
    const input = container.querySelector('#input-filtro');

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute(
      'placeholder',
      'Filtra por nombre de producto',
    );
  });

  // Al no haber nada en el placeholder, el botón de "Buscar" debe estar deshabilitado
  it('El botón de buscar debe estar deshabilitado si el input está vacío', () => {
    // Arrange: renderizamos la página
    render(<FilterPage />);

    // Assert
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });

  it('El botón de buscar se debe habilitar al escribir en el input', () => {
    // Arrange: renderizamos la página
    render(<FilterPage />);

    // Act: el usuario escribe un nombre
    fireEvent.change(screen.getByPlaceholderText('Filtra por nombre de producto'), {
      target: { value: 'Fresa' },
    });

    // Assert
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeEnabled();
  });


  it('Si el usuario no ha filtrado, se deben mostrar todas las cosechas', async () => {
    // Arrange y Act: renderizamos la página
    await renderConCosechas();

    // Assert
    expect(screen.getByRole('heading', { name: 'Aguacate Hass' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fresa' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mango' })).toBeInTheDocument();
  });

  
  it('Al buscar por nombre, solo se deben mostrar las cosechas con ese nombre', async () => {
    // Arrange: renderizamos la página
    await renderConCosechas();

    // Act: el usuario escribe un nombre y hace click en buscar
    fireEvent.change(screen.getByPlaceholderText('Filtra por nombre de producto'), {
      target: { value: 'fresa' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    // Assert
    expect(screen.getByRole('heading', { name: 'Fresa' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Aguacate Hass' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Mango' })).toBeNull();
  });

  it('Al buscar por nombre, no se deben mostrar las cosechas cuyo producto no está en el catálogo', async () => {
    // Arrange: una oferta apunta a un producto que no existe en el catálogo
    const OFERTA_SIN_PRODUCTO = { ...OFERTA_FRESA, OffertId: 'o-4', productId: 'p-inexistente' };
    simularApi(fetchMock, {
      ...API_CATALOGO,
      'GET /offerts': [200, [OFERTA_FRESA, OFERTA_SIN_PRODUCTO]],
    });
    render(<FilterPage />);
    await screen.findByRole('heading', { name: 'Fresa' });

    // Act: el usuario busca por nombre
    fireEvent.change(screen.getByPlaceholderText('Filtra por nombre de producto'), {
      target: { value: 'fresa' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    // Assert: solo queda la cosecha de Fresa
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Fresa' })).toBeInTheDocument();
  });

  describe('Tests sobre como deben funcionar los filtros ', () => {
    
    it('El filtro de calidad solo debe ofrecer las calidades A y B', () => {
      // Arrange: renderizamos la página
      render(<FilterPage />);

      // Act: definimos el filtro de calidad
      const calidad = screen.getByRole('combobox', { name: 'Calidad' });

      // Assert
      expect(calidad).toContainElement(screen.getByRole('option', { name: 'A' }));
      expect(calidad).toContainElement(screen.getByRole('option', { name: 'B' }));
      expect(screen.queryByRole('option', { name: 'C' })).toBeNull();
    });

    it('Al filtrar por calidad A, solo se deben mostrar las cosechas de calidad A', async () => {
      // Arrange: renderizamos la página
      await renderConCosechas();

      // Act: el usuario elige la calidad A
      fireEvent.change(screen.getByRole('combobox', { name: 'Calidad' }), {
        target: { value: 'A' },
      });

      // Assert
      expect(screen.getByRole('heading', { name: 'Aguacate Hass' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Mango' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Fresa' })).toBeNull();
    });

    // Prueba del filtro "Precio máximo" (Debe filtrar por precio máximo, si el usuario ingresa 1000, debe mostrar todas las cosechas con precio menor o igual a 1000)
    it('Al filtrar por precio máximo 1000, solo se deben mostrar las cosechas con precio menor o igual a 1000', async () => {
      // Arrange: renderizamos la página
      await renderConCosechas();

      // Act: el usuario ingresa el precio máximo
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Precio máximo' }), {
        target: { value: '1000' },
      });

      // Assert
      expect(screen.getByRole('heading', { name: 'Aguacate Hass' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Fresa' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Mango' })).toBeNull();
    });
  });
});
