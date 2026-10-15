import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ErrorApi } from '../auth-api';
import {
  obtenerCatalogo,
  obtenerMisOfertas,
  obtenerMisPedidos,
  obtenerOfertas,
  obtenerPedidosRecibidos,
  type EstadoPedido,
  type Oferta,
  type Pedido,
  type Producto,
} from '../perfil-api';
import { routes } from '../routes';
import { useSesion } from '../session-context';

type DatosPedidos = {
  pedidos: Pedido[];
  ofertas: Oferta[];
  productos: Producto[];
};

const ERROR_CARGA = 'No pudimos cargar tus pedidos. Intenta de nuevo.';

const INSIGNIAS: Record<EstadoPedido, { icono: string; tono: string }> = {
  Solicitado: { icono: 'schedule', tono: 'bg-amber-100 text-amber-800' },
  Aceptado: { icono: 'check_circle', tono: 'bg-green-100 text-[#15803d]' },
  Rechazado: { icono: 'block', tono: 'bg-red-100 text-red-700' },
  Entregado: { icono: 'inventory', tono: 'bg-blue-100 text-blue-800' },
  Cancelado: { icono: 'cancel', tono: 'bg-gray-200 text-gray-700' },
};

const formatoNumero = (valor: number) => valor.toLocaleString('es-CO');

const formatoFecha = (fechaIso: string) =>
  new Date(fechaIso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** Los primeros caracteres del id bastan para reconocer el pedido. */
const numeroPedido = (id: string) => id.slice(0, 8).toUpperCase();

const esActivo = (pedido: Pedido) =>
  pedido.status === 'Solicitado' || pedido.status === 'Aceptado';

function Icono({
  nombre,
  className = '',
}: Readonly<{ nombre: string; className?: string }>) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
    >
      {nombre}
    </span>
  );
}

function Alerta({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p
      className="flex items-center gap-2 p-4 rounded-xl bg-red-50 text-sm font-medium text-red-700"
      role="alert"
    >
      {children}
    </p>
  );
}

function TarjetaPedido({
  pedido,
  producto,
}: Readonly<{ pedido: Pedido; producto: Producto | undefined }>) {
  const insignia = INSIGNIAS[pedido.status];
  const cantidad = producto
    ? `${formatoNumero(pedido.quantity)} ${producto.unitOfMeasure}`
    : formatoNumero(pedido.quantity);

  return (
    <li>
      <Link
        className="group block bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-green-200 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-green-200"
        to={`${routes.pedidos}/${pedido.OrderId}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">
                {`Pedido #${numeroPedido(pedido.OrderId)}`}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${insignia.tono}`}
              >
                <Icono className="text-sm" nombre={insignia.icono} />
                {pedido.status}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 group-hover:text-[#15803d] transition-colors">
              {`${cantidad} · ${producto?.name ?? 'Cosecha'}`}
            </h2>
            <p className="text-xs text-gray-500">
              {formatoFecha(pedido.createdAt)}
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
            <span className="text-lg font-extrabold text-[#15803d] whitespace-nowrap">
              {`$ ${formatoNumero(pedido.totalPrice)} COP`}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-[#15803d]">
              Ver detalle
              <Icono className="text-base" nombre="arrow_forward" />
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

function ListaPedidos({ datos }: Readonly<{ datos: DatosPedidos }>) {
  const { pedidos, ofertas, productos } = datos;
  const activos = pedidos.filter(esActivo).length;

  // El pedido solo guarda su oferta: el producto se busca a través de ella
  const productoDe = (pedido: Pedido) => {
    const oferta = ofertas.find((item) => item.OffertId === pedido.offertId);
    return productos.find((item) => item.ProductId === oferta?.productId);
  };

  return (
    <>
      <p className="text-gray-600">
        {pedidos.length === 0
          ? 'Aún no has hecho pedidos. Cuando pidas una cosecha, aquí verás su estado.'
          : `${activos} en curso de ${pedidos.length} pedidos. Toca uno para ver su detalle.`}
      </p>
      {pedidos.length > 0 && (
        <ul className="space-y-3">
          {pedidos.map((pedido) => (
            <TarjetaPedido
              key={pedido.OrderId}
              pedido={pedido}
              producto={productoDe(pedido)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

/** Pedidos del usuario: las compras del comprador o los pedidos que recibió el agricultor. */
export function PedidosPage() {
  const { usuario, salir } = useSesion();
  const [datos, setDatos] = useState<DatosPedidos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rolSesion = usuario?.role;

  useEffect(() => {
    if (!rolSesion) return;
    let vigente = true;
    const esAgricultor = rolSesion === 'Agricultor';
    // El comprador solo puede consultar las ofertas publicadas; el agricultor ve todas las suyas
    Promise.all([
      esAgricultor ? obtenerPedidosRecibidos() : obtenerMisPedidos(),
      esAgricultor ? obtenerMisOfertas() : obtenerOfertas(),
      obtenerCatalogo(),
    ])
      .then(([pedidos, ofertas, productos]) => {
        if (vigente) setDatos({ pedidos, ofertas, productos });
      })
      .catch((err) => {
        if (!vigente) return;
        if (err instanceof ErrorApi && err.status === 401) salir();
        else setError(ERROR_CARGA);
      });
    return () => {
      vigente = false;
    };
  }, [rolSesion, salir]);

  if (!usuario) return <Navigate replace to={routes.login} />;

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-5">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
        Mis pedidos
      </h1>
      {error && <Alerta>{error}</Alerta>}
      {!datos && !error && (
        <output className="block text-sm text-gray-600">
          Cargando tus pedidos…
        </output>
      )}
      {datos && <ListaPedidos datos={datos} />}

      <section className="rounded-2xl bg-green-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm text-gray-600">
          ¿Buscas algo fresco para hoy? Mira las cosechas que publican los
          campesinos de las veredas.
        </p>
        <Link
          className="inline-flex items-center justify-center gap-2 px-5 h-12 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-sm font-semibold shadow-sm transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          to={routes.explorar}
        >
          <Icono className="text-xl" nombre="storefront" />
          Explorar cosechas
        </Link>
      </section>
    </main>
  );
}
