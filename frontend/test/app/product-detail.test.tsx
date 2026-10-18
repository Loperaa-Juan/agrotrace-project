import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ProductDetail from '../../src/routes/app/product-detail';

const oferta = {
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

const producto = {
  ProductId: 'p-aguacate',
  name: 'Aguacate Hass',
  unitOfMeasure: 'lb',
  isActive: true,
};

// Mismo userId que el farmerId de la oferta
const AGRICULTOR = {
  userId: 'c270fc1a',
  name: 'Juan Pérez',
  email: 'juan@agrotrace.com',
  role: 'Agricultor' as const,
};

const PERSONA = {
  userId: 'a1b2c3d4',
  name: 'Ana Gómez',
  email: 'ana@agrotrace.com',
  role: 'Persona' as const,
};

const NEGOCIO = {
  userId: 'b5e6f7a8',
  name: 'Restaurante La Buena Mesa',
  email: 'compras@buenamesa.com',
  role: 'Negocio' as const,
};

describe('Tests en el componente ProductDetail', () => {
  it('Debe mostrar el nombre, descripción y precio del producto', () => {
    // Arrange: renderizamos el detalle de la oferta
    render(<ProductDetail oferta={oferta} producto={producto} />);

    // Assert
    expect(
      screen.getByRole('heading', { name: 'Aguacate Hass' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Cosecha de esta semana')).toBeInTheDocument();
    expect(screen.getByText(/\$ 1\.000 COP/)).toBeInTheDocument();
  });

  it('Se deben renderizar los botones de aumentar o disminuir cantidad', () => {
    // Arrange: renderizamos el detalle de la oferta
    render(<ProductDetail oferta={oferta} producto={producto} />);

    // Assert: vemos si los botones se renderizan
    const aumentar = screen.getByRole('button', { name: 'Increase-btn' });
    const disminuir = screen.getByRole('button', { name: 'decrease-btn' });

    expect(aumentar).toBeInTheDocument();
    expect(disminuir).toBeInTheDocument();
  });

  it('El botón de increase debe aumentar la cantidad a ordenar', () => {
    // Arrange: renderizamos el detalle de la oferta
    render(<ProductDetail oferta={oferta} producto={producto} />);

    // Tomamos el botón, el texto y la cantidad
    const aumentar = screen.getByRole('button', { name: 'Increase-btn' });
    const cantidad = screen.getByRole<HTMLInputElement>('spinbutton', {
      name: 'Cantidad a ordenar',
    });
    const inicial = Number(cantidad.value);

    // Act: hacemos click en aumentar
    fireEvent.click(aumentar);
    const final = Number(cantidad.value);

    // Assert
    expect(inicial).toBe(1);
    expect(cantidad).toBeInTheDocument();
    expect(final).toBe(inicial + 1);
  });

  //   Al dar click en el botón disminuir debemos aumentarle al pedido
  it('El botón de decrease debe disminuir la cantidad a ordenar', () => {
    // Arrange: renderizamos el detalle de la oferta
    render(<ProductDetail oferta={oferta} producto={producto} />);

    // Tomamos el botón, el texto y la cantidad
    const disminuir = screen.getByRole('button', { name: 'decrease-btn' });
    const cantidad = screen.getByRole<HTMLInputElement>('spinbutton', {
      name: 'Cantidad a ordenar',
    });
    const inicial = Number(cantidad.value);

    // Act: hacemos click en aumentar
    fireEvent.click(disminuir);
    const final = Number(cantidad.value);

    // Assert
    expect(final).toBe(inicial - 1);
  });

  it('Un usuario sin rol negocio no puede agregar más de 50 libras', () => {
    // Arrange: renderizamos el detalle con un comprador persona
    render(
      <ProductDetail oferta={oferta} producto={producto} usuario={PERSONA} />,
    );
    const aumentar = screen.getByRole('button', { name: 'Increase-btn' });
    const cantidad = screen.getByRole<HTMLInputElement>('spinbutton', {
      name: 'Cantidad a ordenar',
    });

    // Act: llegamos a 50 y tratamos de pasar a 51
    for (let i = 0; i < 50; i++) fireEvent.click(aumentar);

    // Assert
    expect(Number(cantidad.value)).toBe(50);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No puedes agregar más de 50 libras al carrito',
    );
  });

  it('Un usuario con rol negocio sí puede agregar más de 50 libras', () => {
    // Arrange: renderizamos el detalle con un comprador negocio
    render(
      <ProductDetail oferta={oferta} producto={producto} usuario={NEGOCIO} />,
    );
    const aumentar = screen.getByRole('button', { name: 'Increase-btn' });
    const cantidad = screen.getByRole<HTMLInputElement>('spinbutton', {
      name: 'Cantidad a ordenar',
    });

    // Act
    for (let i = 0; i < 50; i++) fireEvent.click(aumentar);

    // Assert
    expect(Number(cantidad.value)).toBe(51);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('Se debe tener un botón que diga "Ordenar ahora"', () => {
    // Arrange
    render(<ProductDetail oferta={oferta} producto={producto} />);

    // Assert
    expect(
      screen.getByRole('button', { name: 'Ordenar ahora' }),
    ).toBeInTheDocument();
  });

  it('Si la cantidad está en 0, el botón de disminuir debe estar deshabilitado', () => {
    // Arrange
    render(<ProductDetail oferta={oferta} producto={producto} />);
    const disminuir = screen.getByRole('button', { name: 'decrease-btn' });

    // Act: bajamos de 1 a 0
    fireEvent.click(disminuir);

    // Assert
    expect(disminuir).toBeDisabled();
  });

  it('Si la cantidad está en 0, el botón de "Ordenar ahora" debe estar deshabilitado', () => {
    // Arrange
    render(<ProductDetail oferta={oferta} producto={producto} />);
    const ordenar = screen.getByRole('button', { name: 'Ordenar ahora' });
    expect(ordenar).toBeEnabled();

    // Act: bajamos de 1 a 0
    fireEvent.click(screen.getByRole('button', { name: 'decrease-btn' }));

    // Assert
    expect(ordenar).toBeDisabled();
  });

  it('Al dar click en "Ordenar ahora" se debe abrir un diálogo de confirmación', () => {
    // Arrange
    render(
      <ProductDetail oferta={oferta} producto={producto} usuario={PERSONA} />,
    );

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Ordenar ahora' }));

    // Assert: el diálogo pregunta por el producto y tiene aceptar y cancelar
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('¿Estás seguro de ordenar Aguacate Hass?');
    expect(
      within(dialogo).getByRole('button', { name: 'Aceptar' }),
    ).toBeInTheDocument();
    expect(
      within(dialogo).getByRole('button', { name: 'Cancelar' }),
    ).toBeInTheDocument();
  });

  it('Si la publicación es del agricultor logueado, no puede comprar sus propios productos', () => {
    // Arrange: el agricultor logueado es el dueño de la oferta
    render(
      <ProductDetail oferta={oferta} producto={producto} usuario={AGRICULTOR} />,
    );

    // Assert
    expect(
      screen.getByText('No puedes comprar tus propios productos'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ordenar ahora' }),
    ).toBeDisabled();
  });
});
