import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ErrorApi } from '../auth-api';
import {
  cancelarPedido,
  obtenerCatalogo,
  obtenerMisOfertas,
  obtenerMisPedidos,
  obtenerOfertas,
  obtenerPedidosRecibidos,
  type AgricultorPedido,
  type EstadoPedido,
  type Pedido,
  type Producto,
} from '../profile-api';
import { routes } from '../routes';
import { useSesion } from '../session-context';

const ERROR_CARGA = 'No pudimos cargar el pedido. Intenta de nuevo.';

const formatoNumero = (valor: number) => valor.toLocaleString('es-CO');

const formatoFecha = (fechaIso: string) =>
  new Date(fechaIso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const INSIGNIAS: Record<EstadoPedido, { icono: string; tono: string }> = {
  Solicitado: { icono: 'schedule', tono: 'bg-amber-100 text-amber-800' },
  Aceptado: { icono: 'check_circle', tono: 'bg-green-100 text-[#15803d]' },
  Rechazado: { icono: 'block', tono: 'bg-red-100 text-red-700' },
  Entregado: { icono: 'inventory', tono: 'bg-blue-100 text-blue-800' },
  Cancelado: { icono: 'cancel', tono: 'bg-gray-200 text-gray-700' },
};

/** Aviso de cada estado; el de "Solicitado" lleva además el botón de cancelar. */
const AVISOS: Record<
  EstadoPedido,
  { icono: string; tono: string; titulo: string; mensaje: string }
> = {
  Solicitado: {
    icono: 'info',
    tono: 'bg-amber-50 text-amber-900',
    titulo: 'Tu pedido aún no ha sido aceptado por el agricultor',
    mensaje:
      'Todavía no se te cobra nada. Mientras el agricultor no responda, puedes cancelarlo.',
  },
  Aceptado: {
    icono: 'thumb_up',
    tono: 'bg-green-50 text-green-900',
    titulo: '¡El agricultor aceptó tu pedido!',
    mensaje:
      'Tu cosecha está reservada. Entrega el código de abajo solo cuando recibas y revises el pedido.',
  },
  Rechazado: {
    icono: 'error',
    tono: 'bg-red-50 text-red-800',
    titulo: 'El agricultor no aceptó tu pedido',
    mensaje:
      'No se realizó ningún cobro. Puedes buscar otras cosechas en el catálogo.',
  },
  Entregado: {
    icono: 'task_alt',
    tono: 'bg-blue-50 text-blue-900',
    titulo: '¡Entrega confirmada!',
    mensaje:
      'El agricultor confirmó la entrega con tu código. El pedido quedó cerrado.',
  },
  Cancelado: {
    icono: 'cancel',
    tono: 'bg-gray-100 text-gray-800',
    titulo: 'Pedido cancelado',
    mensaje: 'Este pedido se canceló y no se te cobró nada.',
  },
};

const TARJETA =
  'bg-white rounded-2xl border border-gray-100 p-5 md:p-6 shadow-sm';

const TITULO_TARJETA =
  'text-xs font-bold text-gray-900 uppercase tracking-wider';

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

function PasoLinea({
  actual,
  children,
  fecha,
  icono,
}: Readonly<{
  actual: boolean;
  children: ReactNode;
  fecha: string;
  icono: string;
}>) {
  return (
    <li className="flex-1 flex flex-col items-center text-center gap-1">
      <span
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          actual
            ? 'bg-[#15803d] text-white ring-4 ring-green-100 shadow-md'
            : 'bg-green-100 text-[#15803d]'
        }`}
      >
        <Icono className="text-lg" nombre={icono} />
      </span>
      <span
        className={`text-sm font-bold ${actual ? 'text-[#15803d]' : 'text-gray-900'}`}
      >
        {children}
      </span>
      <span className="text-xs text-gray-500">{fecha}</span>
    </li>
  );
}

/** Una casilla por dígito: el código de entrega siempre tiene 6. */
const CASILLAS_CODIGO = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];

function CodigoEntrega({ codigo }: Readonly<{ codigo: string | undefined }>) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-linear-to-br from-[#15803d] via-[#0a4d23] to-[#043316] text-white shadow-xl">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-green-300 opacity-15 blur-3xl pointer-events-none" />
      <div className="relative space-y-4 text-center lg:text-left">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 text-green-100 text-xs font-bold uppercase tracking-widest">
          <Icono className="text-base" nombre="pin" />
          Código de entrega segura
        </span>
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            TU CÓDIGO DE ENTREGA
          </h2>
          <p className="text-green-100 max-w-xl">
            Dáselo al agricultor únicamente al momento de recibir y revisar tu
            pedido: con él se confirma la entrega.
          </p>
        </div>
        <div
          aria-label="Código de entrega"
          className="flex items-center justify-center lg:justify-start gap-2 sm:gap-3"
        >
          {CASILLAS_CODIGO.map((casilla, posicion) => (
            <span
              className="w-11 h-14 sm:w-14 sm:h-18 rounded-xl bg-white text-gray-900 text-3xl sm:text-4xl font-mono font-extrabold flex items-center justify-center shadow-lg select-all"
              key={casilla}
            >
              {codigo?.[posicion]}
            </span>
          ))}
        </div>
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-100 text-amber-900 text-left text-sm max-w-2xl">
          <Icono className="text-xl text-amber-700 shrink-0" nombre="warning" />
          <div>
            <p className="font-bold">No lo compartas antes de tiempo.</p>
            <p>
              No lo dictes por llamada ni mensajes: entrégalo en persona cuando
              hayas revisado el peso y la frescura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderDetail({
  agricultor,
  pedido,
  producto,
  alCancelar,
  puedeCancelar = true,
}: Readonly<{
  agricultor: AgricultorPedido | null | undefined;
  pedido: Pedido;
  producto: Producto | undefined;
  alCancelar?: () => void;
  /** Cancelar le corresponde al comprador; el agricultor no ve el botón. */
  puedeCancelar?: boolean;
}>) {
  const solicitado = pedido.status === 'Solicitado';
  const insignia = INSIGNIAS[pedido.status];
  const aviso = AVISOS[pedido.status];

  return (
    <main className="w-full min-h-screen bg-gray-50">
      <div className="max-w-310 mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
        <a
          className="group inline-flex items-center gap-2 text-sm font-bold text-[#15803d] hover:text-green-900 transition-colors"
          href={routes.pedidos}
        >
          <Icono
            className="transition-transform group-hover:-translate-x-1"
            nombre="arrow_back"
          />
          Volver a mis pedidos
        </a>

        <div className={`${TARJETA} space-y-1`}>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {`Pedido #${pedido.OrderId.slice(0, 8).toUpperCase()}`}
            </h1>
            <span
              aria-label="Estado del pedido"
              className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-sm font-bold shadow-sm ${insignia.tono}`}
            >
              <Icono className="text-base" nombre={insignia.icono} />
              {pedido.status}
            </span>
          </div>
          <p className="text-sm text-gray-600">{`${pedido.quantity} ${producto?.unitOfMeasure} · ${producto?.name}`}</p>
        </div>

        <div
          className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl shadow-sm ${aviso.tono}`}
        >
          <div className="flex items-start gap-3">
            <Icono className="text-2xl shrink-0" nombre={aviso.icono} />
            <div className="space-y-0.5">
              <p className="text-lg font-bold">{aviso.titulo}</p>
              <p className="text-sm max-w-3xl">{aviso.mensaje}</p>
            </div>
          </div>
          {solicitado && puedeCancelar && (
            <button
              className="shrink-0 self-start md:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-red-200 text-red-700 text-sm font-bold shadow-sm hover:bg-red-50 transition-colors"
              onClick={alCancelar}
              type="button"
            >
              <Icono className="text-lg" nombre="close" />
              Cancelar pedido
            </button>
          )}
        </div>

        <div className={TARJETA}>
          <span className={`${TITULO_TARJETA} block mb-4`}>
            Línea de vida del pedido
          </span>
          <ol aria-label="Línea de tiempo" className="flex gap-2">
            <PasoLinea
              actual={solicitado}
              fecha={formatoFecha(pedido.createdAt)}
              icono={solicitado ? 'autorenew' : 'check'}
            >
              Solicitado
            </PasoLinea>
            {!solicitado && (
              <PasoLinea
                actual
                fecha={formatoFecha(pedido.updatedAt)}
                icono={insignia.icono}
              >
                {pedido.status}
              </PasoLinea>
            )}
          </ol>
        </div>

        {pedido.status === 'Aceptado' && (
          <CodigoEntrega codigo={pedido.deliveryCode} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className={`${TARJETA} lg:col-span-7 space-y-4`}>
            <div className="flex items-center justify-between">
              <span className={TITULO_TARJETA}>Cosecha adquirida</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-xs font-bold text-[#15803d]">
                <Icono className="text-sm" nombre="energy_savings_leaf" />
                Cultivo local
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {producto?.name ?? 'Cosecha'}
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-medium text-gray-900">
                <Icono
                  className="text-sm text-amber-700"
                  nombre="inventory_2"
                />
                {`${formatoNumero(pedido.quantity)} ${producto?.unitOfMeasure ?? ''}`}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-medium text-gray-900">
                <Icono className="text-sm text-[#15803d]" nombre="sell" />
                {`$ ${formatoNumero(pedido.unitPrice)} COP / ${producto?.unitOfMeasure ?? 'unidad'}`}
              </span>
            </div>
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal producto:</span>
                <span className="font-semibold text-gray-900">
                  {`$ ${formatoNumero(pedido.totalPrice)} COP`}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Comisión AgroTrace:</span>
                <span className="font-medium text-[#15803d]">$ 0 COP</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 text-lg font-bold text-gray-900">
                <span>Total:</span>
                <span className="text-2xl font-extrabold text-[#15803d]">
                  {`$ ${formatoNumero(pedido.totalPrice)} COP`}
                </span>
              </div>
            </div>
          </div>

          <section
            aria-label="Agricultor"
            className={`${TARJETA} lg:col-span-5 space-y-4`}
          >
            <span className={`${TITULO_TARJETA} block`}>
              Agricultor responsable
            </span>
            {agricultor ? (
              <TarjetaAgricultor agricultor={agricultor} />
            ) : (
              <p className="text-sm text-gray-600">
                No tenemos los datos de contacto del agricultor de este pedido.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function TarjetaAgricultor({
  agricultor,
}: Readonly<{ agricultor: AgricultorPedido }>) {
  return (
    <>
      <div className="flex items-center gap-4">
        <span className="w-16 h-16 rounded-full bg-green-100 text-[#15803d] ring-2 ring-green-200 flex items-center justify-center shrink-0">
          <Icono className="text-3xl" nombre="agriculture" />
        </span>
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-lg font-bold text-gray-900">{agricultor.name}</p>
            <Icono className="text-lg text-[#15803d]" nombre="verified" />
          </div>
          <p className="flex items-center gap-1 text-sm text-gray-600">
            <Icono className="text-base" nombre="location_on" />
            {agricultor.municipality}
          </p>
        </div>
      </div>
      <a
        className="w-full h-11.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        href={`tel:${agricultor.phone}`}
      >
        <Icono className="text-lg" nombre="call" />
        <p>{agricultor.phone}</p>
      </a>
    </>
  );
}

type DatosDetalle = {
  pedido: Pedido | undefined;
  producto: Producto | undefined;
};

function Aviso({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-10 space-y-4">
      {children}
    </main>
  );
}

/** Página de la ruta `/pedidos/:orderId`: busca el pedido del comprador y su producto. */
export function DetallePedidoPage() {
  const { orderId } = useParams();
  const { usuario, salir } = useSesion();
  const [datos, setDatos] = useState<DatosDetalle | null>(null);
  const [error, setError] = useState(false);
  const conSesion = Boolean(usuario);
  const esAgricultor = usuario?.role === 'Agricultor';

  useEffect(() => {
    if (!conSesion) return;
    let vigente = true;
    // El agricultor ve los pedidos que recibió y todas sus ofertas, aunque estén retiradas.
    // El pedido solo guarda su oferta: el producto se busca a través de ella
    Promise.all([
      esAgricultor ? obtenerPedidosRecibidos() : obtenerMisPedidos(),
      esAgricultor ? obtenerMisOfertas() : obtenerOfertas(),
      obtenerCatalogo(),
    ])
      .then(([pedidos, ofertas, productos]) => {
        if (!vigente) return;
        const pedido = pedidos.find((item) => item.OrderId === orderId);
        const oferta = ofertas.find(
          (item) => item.OffertId === pedido?.offertId,
        );
        const producto = productos.find(
          (item) => item.ProductId === oferta?.productId,
        );
        setDatos({ pedido, producto });
      })
      .catch((err) => {
        if (!vigente) return;
        if (err instanceof ErrorApi && err.status === 401) salir();
        else setError(true);
      });
    return () => {
      vigente = false;
    };
  }, [conSesion, esAgricultor, orderId, salir]);

  if (!usuario) return <Navigate replace to={routes.login} />;

  if (error) {
    return (
      <Aviso>
        <p
          className="flex items-center gap-2 p-4 rounded-xl bg-red-50 text-sm font-medium text-red-700"
          role="alert"
        >
          {ERROR_CARGA}
        </p>
      </Aviso>
    );
  }

  if (!datos) {
    return (
      <Aviso>
        <output className="block text-sm text-gray-600">
          Cargando el pedido…
        </output>
      </Aviso>
    );
  }

  if (!datos.pedido) {
    return (
      <Aviso>
        <p className="p-4 rounded-xl bg-white text-sm text-gray-600 border border-gray-100">
          No encontramos este pedido entre los tuyos.
        </p>
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-[#15803d] hover:underline"
          to={routes.pedidos}
        >
          <Icono className="text-base" nombre="arrow_back" />
          Volver a mis pedidos
        </Link>
      </Aviso>
    );
  }

  const { pedido, producto } = datos;
  const cancelar = () => {
    cancelarPedido(pedido.OrderId)
      // Se conservan los datos del agricultor si la respuesta no los trae
      .then((cancelado) =>
        setDatos({
          pedido: { ...cancelado, farmer: cancelado.farmer ?? pedido.farmer },
          producto,
        }),
      )
      .catch((err) => {
        if (err instanceof ErrorApi && err.status === 401) salir();
        else setError(true);
      });
  };

  return (
    <OrderDetail
      agricultor={pedido.farmer}
      alCancelar={cancelar}
      pedido={pedido}
      producto={producto}
      puedeCancelar={!esAgricultor}
    />
  );
}

export default OrderDetail;
