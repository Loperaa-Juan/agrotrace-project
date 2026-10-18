import type { Pedido, PerfilUsuario, Producto } from '../profile-api';

const formatoFecha = (fechaIso: string) =>
  new Date(fechaIso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

function OrderDetail({
  agricultor,
  pedido,
  producto,
}: Readonly<{
  agricultor: PerfilUsuario;
  pedido: Pedido;
  producto: Producto | undefined;
}>) {
  const solicitado = pedido.status === 'Solicitado';

  return (
    <main>
      <h1>{`Pedido #${pedido.OrderId.slice(0, 8).toUpperCase()}`}</h1>
      <p>{`${pedido.quantity} ${producto?.unitOfMeasure} · ${producto?.name}`}</p>
      <span aria-label="Estado del pedido">{pedido.status}</span>

      {solicitado && (
        <>
          <p>Tu pedido aún no ha sido aceptado por el agricultor</p>
          <button type="button">Cancelar pedido</button>
        </>
      )}

      {pedido.status === 'Aceptado' && (
        <span aria-label="Código de entrega">{pedido.deliveryCode}</span>
      )}

      <ol aria-label="Línea de tiempo">
        <li>{`Solicitado ${formatoFecha(pedido.createdAt)}`}</li>
        {!solicitado && (
          <li>{`${pedido.status} ${formatoFecha(pedido.updatedAt)}`}</li>
        )}
      </ol>

      <section aria-label="Agricultor">
        <p>{agricultor.name}</p>
        <p>{agricultor.phone}</p>
        <p>{agricultor.municipality}</p>
      </section>
    </main>
  );
}

export default OrderDetail;
