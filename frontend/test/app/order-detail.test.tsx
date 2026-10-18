import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import OrderDetail from '../../src/routes/app/order-detail';

function pedido(status: string, extra: Record<string, unknown> = {}) {
  return {
    OrderId: 'e5f6a7b8-1111-4222-8333-944445555666',
    buyerId: 'a1b2c3d4',
    offertId: 'o-aguacate',
    farmerId: 'c270fc1a',
    quantity: 10,
    unitPrice: 3500,
    totalPrice: 35000,
    status,
    deliveryCode: '482913',
    createdAt: '2026-10-12T15:00:00.000Z',
    updatedAt: '2026-10-14T15:00:00.000Z',
    ...extra,
  } as const;
}

const producto = {
  ProductId: 'p-aguacate',
  name: 'Aguacate Hass',
  unitOfMeasure: 'lb',
  isActive: true,
};

const agricultor = {
  userId: 'c270fc1a',
  name: 'Juan Pérez',
  documentType: 'CC' as const,
  documentNumber: '1020304050',
  email: 'juan@agrotrace.com',
  phone: '3001234567',
  address: 'Vereda La Palma',
  municipality: 'Rionegro',
  role: 'Agricultor' as const,
};

function renderDetalle(status = 'Solicitado') {
  render(
    <OrderDetail
      agricultor={agricultor}
      pedido={pedido(status)}
      producto={producto}
    />,
  );
}

describe('Tests en Order detail', () => {
  it('Se debe renderizar el componente OrderDetail', () => {
    // Arrange
    renderDetalle();

    // Assert
    expect(
      screen.getByRole('heading', { name: 'Pedido #E5F6A7B8' }),
    ).toBeInTheDocument();
    expect(screen.getByText('10 lb · Aguacate Hass')).toBeInTheDocument();
  });

  it.each(['Solicitado', 'Aceptado', 'Rechazado', 'Entregado', 'Cancelado'])(
    'Se le debe mostrar al usuario el estado %s de la orden',
    (estado) => {
      // Arrange
      renderDetalle(estado);

      // Assert
      expect(screen.getByLabelText('Estado del pedido')).toHaveTextContent(
        estado,
      );
    },
  );

  it('Si el estado es "Solicitado", se debe mostrar que la orden aún no ha sido aceptada', () => {
    // Arrange
    renderDetalle('Solicitado');

    // Assert
    expect(
      screen.getByText('Tu pedido aún no ha sido aceptado por el agricultor'),
    ).toBeInTheDocument();
  });

  it('Si el estado es "Solicitado", se debe mostrar un botón para cancelar la orden', () => {
    // Arrange
    renderDetalle('Solicitado');

    // Assert
    expect(
      screen.getByRole('button', { name: 'Cancelar pedido' }),
    ).toBeInTheDocument();
  });

  it('Si el estado no es "Solicitado", no se puede cancelar la orden', () => {
    // Arrange
    renderDetalle('Aceptado');

    // Assert
    expect(
      screen.queryByRole('button', { name: 'Cancelar pedido' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Tu pedido aún no ha sido aceptado por el agricultor'),
    ).not.toBeInTheDocument();
  });

  it('Se debe mostrar una línea de tiempo con los estados de la orden y sus fechas', () => {
    // Arrange
    renderDetalle('Aceptado');

    // Assert: cada paso de la línea de tiempo tiene su estado y su fecha
    const linea = screen.getByRole('list', { name: 'Línea de tiempo' });
    const pasos = within(linea).getAllByRole('listitem');

    expect(pasos).toHaveLength(2);
    expect(pasos[0]).toHaveTextContent('Solicitado');
    expect(pasos[0]).toHaveTextContent('12 de octubre de 2026');
    expect(pasos[1]).toHaveTextContent('Aceptado');
    expect(pasos[1]).toHaveTextContent('14 de octubre de 2026');
  });

  it('Debe renderizarse la información del agricultor responsable de la orden', () => {
    // Arrange
    renderDetalle();

    // Assert
    const seccion = screen.getByRole('region', { name: 'Agricultor' });
    expect(seccion).toHaveTextContent('Juan Pérez');
    expect(seccion).toHaveTextContent('3001234567');
    expect(seccion).toHaveTextContent('Rionegro');
  });

  it('Si el estado es "Aceptado", se debe mostrar el código de 6 dígitos para confirmar la entrega', () => {
    // Arrange
    renderDetalle('Aceptado');

    // Assert
    const codigo = screen.getByLabelText('Código de entrega');
    expect(codigo).toHaveTextContent('482913');
    expect(codigo.textContent).toMatch(/^\d{6}$/);
  });

  it('Si el estado no es "Aceptado", no se debe mostrar el código de entrega', () => {
    // Arrange
    renderDetalle('Solicitado');

    // Assert
    expect(screen.queryByLabelText('Código de entrega')).not.toBeInTheDocument();
    expect(screen.queryByText('482913')).not.toBeInTheDocument();
  });
});
