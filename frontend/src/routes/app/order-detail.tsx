import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ErrorApi } from '../auth-api';
import {
  cancelarPedido,
  confirmarEntrega,
  obtenerCatalogo,
  obtenerMisOfertas,
  obtenerMisPedidos,
  obtenerOfertas,
  obtenerPedidosRecibidos,
  responderPedido,
  type ContactoPedido,
  type EstadoPedido,
  type Pedido,
  type Producto,
} from '../profile-api';
import { routes } from '../routes';
import { useSesion } from '../session-context';

const ERROR_CARGA = 'No pudimos cargar el pedido. Intenta de nuevo.';
const ERROR_CODIGO =
  'El código de verificación no es correcto. Pídeselo de nuevo al comprador.';
const ERROR_ENTREGA = 'No pudimos confirmar la entrega. Intenta de nuevo.';

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
type AvisoEstado = {
  icono: string;
  tono: string;
  titulo: string;
  mensaje: string;
};

const AVISOS: Record<EstadoPedido, AvisoEstado> = {
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

/** El agricultor confirma la entrega con el código que le dicta el comprador. */
function ConfirmarEntrega({
  alConfirmar,
  error,
}: Readonly<{
  alConfirmar?: (codigo: string) => void;
  error?: string | null;
}>) {
  const idCodigo = useId();
  const [codigo, setCodigo] = useState('');

  return (
    <form
      className={`${TARJETA} space-y-4`}
      onSubmit={(evento) => {
        evento.preventDefault();
        alConfirmar?.(codigo.trim());
      }}
    >
      <div className="space-y-1">
        <label
          className="block text-lg font-bold text-gray-900"
          htmlFor={idCodigo}
        >
          Código de verificación
        </label>
        <p className="text-sm text-gray-600">
          Son los 6 dígitos que el comprador ve en su pedido. Ingrésalos cuando
          te entregue el pago y reciba la cosecha.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          autoComplete="one-time-code"
          className="flex-1 h-12 px-4 rounded-xl bg-gray-50 border border-gray-200 text-2xl font-mono font-bold tracking-[0.5em] text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
          id={idCodigo}
          inputMode="numeric"
          maxLength={6}
          onChange={(evento) => setCodigo(evento.target.value)}
          placeholder="000000"
          value={codigo}
        />
        <button
          className={`${BOTON_ACCION} justify-center h-12 bg-[#15803d] text-white hover:bg-[#166534] disabled:bg-gray-200 disabled:text-gray-500`}
          disabled={codigo.trim() === ''}
          type="submit"
        >
          <Icono className="text-lg" nombre="task_alt" />
          Confirmar entrega
        </button>
      </div>
      {error && (
        <p
          className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-sm font-medium text-red-700"
          role="alert"
        >
          <Icono className="text-lg shrink-0" nombre="error" />
          {error}
        </p>
      )}
    </form>
  );
}

/** Avisos del agricultor mientras debe responder el pedido o entregarlo. */
const AVISOS_AGRICULTOR: Partial<Record<EstadoPedido, AvisoEstado>> = {
  Solicitado: {
    icono: 'pending_actions',
    tono: 'bg-amber-50 text-amber-900',
    titulo: 'Puedes aceptar o rechazar este pedido',
    mensaje:
      'Revisa si tienes la cantidad disponible. Al aceptarlo se descuenta de tu oferta.',
  },
  Aceptado: {
    icono: 'local_shipping',
    tono: 'bg-green-50 text-green-900',
    titulo: 'Aceptaste este pedido',
    mensaje:
      'Al entregarlo, pídele al comprador su código de verificación e ingrésalo abajo para confirmar la entrega.',
  },
  Rechazado: {
    icono: 'block',
    tono: 'bg-red-50 text-red-800',
    titulo: 'Rechazaste este pedido',
    mensaje:
      'Al comprador se le avisó que no aceptaste su pedido. No se le hizo ningún cobro.',
  },
};

const BOTON_ACCION =
  'shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors';

function OrderDetail({
  agricultor,
  comprador,
  pedido,
  producto,
  alCancelar,
  alAceptar,
  alRechazar,
  alConfirmarEntrega,
  errorEntrega,
  esAgricultor = false,
}: Readonly<{
  agricultor: ContactoPedido | null | undefined;
  comprador?: ContactoPedido | null;
  pedido: Pedido;
  producto: Producto | undefined;
  alCancelar?: () => void;
  alAceptar?: () => void;
  alRechazar?: () => void;
  /** Se llama con el código de verificación que ingresa el agricultor. */
  alConfirmarEntrega?: (codigo: string) => void;
  errorEntrega?: string | null;
  /** El agricultor responde el pedido y ve al comprador; el comprador puede cancelarlo. */
  esAgricultor?: boolean;
}>) {
  const solicitado = pedido.status === 'Solicitado';
  const aceptado = pedido.status === 'Aceptado';
  const insignia = INSIGNIAS[pedido.status];
  const aviso =
    (esAgricultor && AVISOS_AGRICULTOR[pedido.status]) || AVISOS[pedido.status];
  // Cada parte ve los datos de contacto de la otra
  const contacto = esAgricultor
    ? {
        etiqueta: 'Comprador',
        titulo: 'Comprador que lo solicitó',
        datos: comprador,
        icono: 'person',
        parte: 'comprador',
      }
    : {
        etiqueta: 'Agricultor',
        titulo: 'Agricultor responsable',
        datos: agricultor,
        icono: 'agriculture',
        parte: 'agricultor',
      };

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
          {solicitado && !esAgricultor && (
            <button
              className={`${BOTON_ACCION} self-start md:self-auto bg-white border border-red-200 text-red-700 hover:bg-red-50`}
              onClick={alCancelar}
              type="button"
            >
              <Icono className="text-lg" nombre="close" />
              Cancelar pedido
            </button>
          )}
          {solicitado && esAgricultor && (
            <div className="flex flex-wrap gap-3 self-start md:self-auto">
              <button
                className={`${BOTON_ACCION} bg-white border border-red-200 text-red-700 hover:bg-red-50`}
                onClick={alRechazar}
                type="button"
              >
                <Icono className="text-lg" nombre="block" />
                Rechazar pedido
              </button>
              <button
                className={`${BOTON_ACCION} bg-[#15803d] text-white hover:bg-[#166534]`}
                onClick={alAceptar}
                type="button"
              >
                <Icono className="text-lg" nombre="check" />
                Aceptar pedido
              </button>
            </div>
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

        {aceptado && !esAgricultor && (
          <CodigoEntrega codigo={pedido.deliveryCode} />
        )}
        {aceptado && esAgricultor && (
          <ConfirmarEntrega
            alConfirmar={alConfirmarEntrega}
            error={errorEntrega}
          />
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
            aria-label={contacto.etiqueta}
            className={`${TARJETA} lg:col-span-5 space-y-4`}
          >
            <span className={`${TITULO_TARJETA} block`}>{contacto.titulo}</span>
            {contacto.datos ? (
              <TarjetaContacto
                contacto={contacto.datos}
                icono={contacto.icono}
                verificado={!esAgricultor}
              />
            ) : (
              <p className="text-sm text-gray-600">
                {`No tenemos los datos de contacto del ${contacto.parte} de este pedido.`}
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function TarjetaContacto({
  contacto,
  icono,
  verificado,
}: Readonly<{ contacto: ContactoPedido; icono: string; verificado: boolean }>) {
  return (
    <>
      <div className="flex items-center gap-4">
        <span className="w-16 h-16 rounded-full bg-green-100 text-[#15803d] ring-2 ring-green-200 flex items-center justify-center shrink-0">
          <Icono className="text-3xl" nombre={icono} />
        </span>
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-lg font-bold text-gray-900">{contacto.name}</p>
            {verificado && (
              <Icono className="text-lg text-[#15803d]" nombre="verified" />
            )}
          </div>
          <p className="flex items-center gap-1 text-sm text-gray-600">
            <Icono className="text-base" nombre="location_on" />
            {contacto.municipality}
          </p>
        </div>
      </div>
      <a
        className="w-full h-11.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        href={`tel:${contacto.phone}`}
      >
        <Icono className="text-lg" nombre="call" />
        <p>{contacto.phone}</p>
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
  const [errorEntrega, setErrorEntrega] = useState<string | null>(null);
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

  /** Muestra el pedido que devuelve orders-service tras cambiarlo. */
  const actualizar = (
    cambio: Promise<Pedido>,
    alFallar: (err: unknown) => void = () => setError(true),
  ) => {
    cambio
      // Se conservan los datos de contacto y el código si la respuesta no los trae
      .then((nuevo) =>
        setDatos({
          pedido: {
            ...nuevo,
            farmer: nuevo.farmer ?? pedido.farmer,
            buyer: nuevo.buyer ?? pedido.buyer,
            // El código solo es del comprador: el agricultor no lo guarda aunque llegue
            deliveryCode: esAgricultor
              ? undefined
              : (nuevo.deliveryCode ?? pedido.deliveryCode),
          },
          producto,
        }),
      )
      .catch((err) => {
        if (err instanceof ErrorApi && err.status === 401) salir();
        else alFallar(err);
      });
  };

  const confirmar = (codigo: string) => {
    setErrorEntrega(null);
    actualizar(confirmarEntrega(pedido.OrderId, codigo), (err) =>
      setErrorEntrega(
        err instanceof ErrorApi && err.status === 400
          ? ERROR_CODIGO
          : ERROR_ENTREGA,
      ),
    );
  };

  return (
    <OrderDetail
      agricultor={pedido.farmer}
      alAceptar={() => actualizar(responderPedido(pedido.OrderId, 'Aceptado'))}
      alCancelar={() => actualizar(cancelarPedido(pedido.OrderId))}
      alConfirmarEntrega={confirmar}
      alRechazar={() =>
        actualizar(responderPedido(pedido.OrderId, 'Rechazado'))
      }
      comprador={pedido.buyer}
      errorEntrega={errorEntrega}
      esAgricultor={esAgricultor}
      pedido={pedido}
      producto={producto}
    />
  );
}

export default OrderDetail;
