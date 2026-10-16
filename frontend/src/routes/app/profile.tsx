import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ErrorApi, type RolUsuario } from '../auth-api';
import {
  obtenerCatalogo,
  obtenerMisOfertas,
  obtenerMisPedidos,
  obtenerPedidosRecibidos,
  obtenerPerfil,
  obtenerPerfilAgricultor,
  retirarOferta,
  type Oferta,
  type Pedido,
  type PerfilAgricultor,
  type PerfilUsuario,
  type Producto,
  type ResumenVentas,
} from '../profile-api';
import { routes } from '../routes';
import { useSesion } from '../session-context';

type Ventas = PerfilAgricultor['sales'];

type DatosPerfil = {
  perfil: PerfilUsuario;
  /** Solo el agricultor tiene ventas; las calcula orders-service. */
  ventas: Ventas | null;
  pedidos: Pedido[];
  ofertas: Oferta[];
  productos: Producto[];
};

const ERROR_CARGA = 'No pudimos cargar tu perfil. Intenta de nuevo.';
const ERROR_RETIRO = 'No pudimos retirar la oferta. Intenta de nuevo.';

const ROLES: Record<RolUsuario, { etiqueta: string; icono: string }> = {
  Agricultor: { etiqueta: 'Agricultor', icono: 'agriculture' },
  Persona: { etiqueta: 'Comprador', icono: 'shopping_basket' },
  Negocio: { etiqueta: 'Negocio', icono: 'storefront' },
  Admin: { etiqueta: 'Administrador', icono: 'shield_person' },
};

const BOTON_PRIMARIO =
  'inline-flex items-center justify-center gap-2 px-5 h-12 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-sm font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2';
const BOTON_SECUNDARIO =
  'inline-flex items-center justify-center gap-2 px-5 h-12 rounded-xl bg-white hover:bg-gray-100 text-[#15803d] text-sm font-semibold border border-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2';

const formatoCOP = (valor: number) => `$ ${valor.toLocaleString('es-CO')}`;

const ventasEntregadas = ({ count }: ResumenVentas) =>
  `${count} ${count === 1 ? 'venta entregada' : 'ventas entregadas'}`;

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

function Resumen({
  titulo,
  icono,
  valor,
  children,
}: Readonly<{
  titulo: string;
  icono: string;
  valor: ReactNode;
  children: ReactNode;
}>) {
  return (
    <section
      aria-label={titulo}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {titulo}
        </h2>
        <span className="w-10 h-10 rounded-xl bg-green-100 text-[#15803d] flex items-center justify-center shrink-0">
          <Icono nombre={icono} />
        </span>
      </div>
      <p className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
        {valor}
      </p>
      <div className="mt-2 text-sm text-gray-600">{children}</div>
    </section>
  );
}

function ResumenAgricultor({
  ventas,
  pedidos,
  ofertas,
}: Readonly<{ ventas: Ventas; pedidos: Pedido[]; ofertas: Oferta[] }>) {
  const porResponder = pedidos.filter(
    (pedido) => pedido.status === 'Solicitado',
  ).length;
  const activas = ofertas.filter((oferta) => oferta.isActive).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Resumen
        icono="today"
        titulo="Ventas de la semana"
        valor={`${formatoCOP(ventas.week.total)} COP`}
      >
        {ventasEntregadas(ventas.week)}
      </Resumen>
      <Resumen
        icono="payments"
        titulo="Ventas del mes"
        valor={`${formatoCOP(ventas.month.total)} COP`}
      >
        {ventasEntregadas(ventas.month)}
      </Resumen>
      <Resumen
        icono="notification_important"
        titulo="Pedidos por responder"
        valor={porResponder}
      >
        Por aceptar o rechazar
      </Resumen>
      <Resumen icono="inventory_2" titulo="Ofertas activas" valor={activas}>
        Visibles para los compradores
      </Resumen>
    </div>
  );
}

function ResumenComprador({ pedidos }: Readonly<{ pedidos: Pedido[] }>) {
  const activos = pedidos.filter(
    (pedido) => pedido.status === 'Solicitado' || pedido.status === 'Aceptado',
  ).length;
  const cerradas = pedidos.filter(
    (pedido) => pedido.status === 'Entregado',
  ).length;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Resumen icono="storefront" titulo="Pedidos activos" valor={activos}>
          Solicitados o aceptados por el agricultor
        </Resumen>
        <Resumen
          icono="shopping_basket"
          titulo="Compras cerradas"
          valor={cerradas}
        >
          Entregadas y confirmadas
        </Resumen>
      </div>
      <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Cosechas frescas de Envigado
          </h2>
          <p className="text-sm text-gray-600">
            Recoges directo en la finca de cada productor, sin intermediarios.
          </p>
        </div>
        <Link className={`${BOTON_PRIMARIO} shrink-0`} to={routes.explorar}>
          <Icono className="text-xl" nombre="storefront" />
          Ver cosechas de hoy
        </Link>
      </section>
    </>
  );
}

function Inventario({
  ofertas,
  productos,
  onRetirar,
}: Readonly<{
  ofertas: Oferta[];
  productos: Producto[];
  onRetirar: (id: string) => void;
}>) {
  const productoDe = (id: string) =>
    productos.find((producto) => producto.ProductId === id);

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Inventario en finca
          </h2>
          <p className="text-sm text-gray-600">
            Tus cosechas publicadas para los compradores
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#15803d] hover:underline"
          to={routes.publicar}
        >
          <Icono className="text-lg" nombre="add" />
          Añadir otra
        </Link>
      </div>
      {ofertas.length === 0 ? (
        <p className="p-4 rounded-xl bg-gray-50 text-sm text-gray-600">
          Aún no has publicado cosechas.
        </p>
      ) : (
        <ul className="space-y-3">
          {ofertas.map((oferta) => {
            const producto = productoDe(oferta.productId);
            const unidad = producto?.unitOfMeasure ?? '';
            return (
              <li
                className={`p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  oferta.isActive ? 'bg-gray-50' : 'bg-gray-50/50 opacity-75'
                }`}
                key={oferta.OffertId}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">
                      {producto?.name ?? 'Producto'}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        oferta.isActive
                          ? 'bg-green-100 text-[#15803d]'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {oferta.isActive ? 'Activa' : 'Retirada'}
                    </span>
                    {oferta.aiQuality && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                        {`Calidad ${oferta.aiQuality}`}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{`${oferta.availableQuantity} ${unidad} disponibles`}</p>
                  <p className="text-sm font-bold text-[#15803d]">
                    {`${formatoCOP(oferta.pricePerUnit)} COP / ${unidad}`}
                  </p>
                </div>
                {oferta.isActive && (
                  <button
                    className="h-10 px-4 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-sm font-semibold text-gray-800 inline-flex items-center gap-1 self-end sm:self-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-green-600"
                    onClick={() => onRetirar(oferta.OffertId)}
                    type="button"
                  >
                    <Icono className="text-base" nombre="pause_circle" />
                    Retirar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
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

export function PerfilPage() {
  const { usuario, salir } = useSesion();
  const [datos, setDatos] = useState<DatosPerfil | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rolSesion = usuario?.role;

  useEffect(() => {
    if (!rolSesion) return;
    let vigente = true;
    const esAgricultor = rolSesion === 'Agricultor';
    // El agricultor recibe sus datos junto con sus ventas desde orders-service
    const perfilYVentas = esAgricultor
      ? obtenerPerfilAgricultor()
      : obtenerPerfil().then((user) => ({ user, sales: null }));
    Promise.all([
      perfilYVentas,
      esAgricultor ? obtenerPedidosRecibidos() : obtenerMisPedidos(),
      esAgricultor ? obtenerMisOfertas() : Promise.resolve([]),
      esAgricultor ? obtenerCatalogo() : Promise.resolve([]),
    ])
      .then(([{ user, sales }, pedidos, ofertas, productos]) => {
        if (vigente)
          setDatos({
            perfil: user,
            ventas: sales,
            pedidos,
            ofertas,
            productos,
          });
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

  const retirar = async (id: string) => {
    setError(null);
    try {
      const retirada = await retirarOferta(id);
      setDatos(
        (previos) =>
          previos && {
            ...previos,
            ofertas: previos.ofertas.map((oferta) =>
              oferta.OffertId === id ? retirada : oferta,
            ),
          },
      );
    } catch (err) {
      if (err instanceof ErrorApi && err.status === 401) salir();
      else setError(ERROR_RETIRO);
    }
  };

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-6">
      {error && <Alerta>{error}</Alerta>}
      {!datos && !error && (
        <output className="block text-sm text-gray-600">
          Cargando tu perfil…
        </output>
      )}
      {datos && <ContenidoPerfil datos={datos} onRetirar={retirar} />}
    </main>
  );
}

function ContenidoPerfil({
  datos,
  onRetirar,
}: Readonly<{ datos: DatosPerfil; onRetirar: (id: string) => void }>) {
  const { perfil, ventas, pedidos, ofertas, productos } = datos;
  // Solo el agricultor publica cosechas y muestra la ubicación de su finca
  const esAgricultor = perfil.role === 'Agricultor';
  const rol = ROLES[perfil.role];

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-gray-100">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-green-100/60 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <span className="w-16 h-16 shrink-0 rounded-full bg-[#15803d] text-white text-2xl font-bold flex items-center justify-center">
              {perfil.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 text-[#15803d] text-xs font-semibold mb-1">
                <Icono className="text-sm" nombre={rol.icono} />
                <span>{rol.etiqueta}</span>
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                {perfil.name}
              </h1>
              <ul className="mt-2 space-y-0.5 text-sm text-gray-600">
                {esAgricultor && (
                  <li className="flex items-center gap-1.5">
                    <Icono
                      className="text-base text-[#15803d]"
                      nombre="location_on"
                    />
                    <span>{`${perfil.address} · ${perfil.municipality}`}</span>
                  </li>
                )}
                <li className="flex items-center gap-1.5">
                  <Icono className="text-base text-[#15803d]" nombre="call" />
                  <span>{perfil.phone}</span>
                </li>
                <li className="flex items-center gap-1.5 min-w-0">
                  <Icono className="text-base text-[#15803d]" nombre="mail" />
                  <span className="truncate">{perfil.email}</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {esAgricultor && (
              <Link className={BOTON_PRIMARIO} to={routes.publicar}>
                <Icono className="text-xl" nombre="add_circle" />
                Publicar una cosecha
              </Link>
            )}
            <Link className={BOTON_SECUNDARIO} to={routes.pedidos}>
              <Icono className="text-xl" nombre="inventory_2" />
              Ver mis pedidos
            </Link>
          </div>
        </div>
      </section>

      {ventas ? (
        <>
          <ResumenAgricultor
            ofertas={ofertas}
            pedidos={pedidos}
            ventas={ventas}
          />
          <Inventario
            ofertas={ofertas}
            onRetirar={onRetirar}
            productos={productos}
          />
        </>
      ) : (
        <ResumenComprador pedidos={pedidos} />
      )}

      <section className="rounded-2xl bg-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <span className="w-12 h-12 rounded-full bg-green-100 text-[#15803d] flex items-center justify-center shrink-0">
            <Icono className="text-2xl" nombre="support_agent" />
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              ¿Dudas con un pedido o la entrega?
            </h2>
            <p className="text-sm text-gray-600">
              Soporte agropecuario de Envigado por WhatsApp y llamada.
            </p>
          </div>
        </div>
        <a
          className={BOTON_SECUNDARIO}
          href="https://wa.me/573000000000"
          rel="noreferrer"
          target="_blank"
        >
          <Icono className="text-xl" nombre="chat" />
          Contactar asesor local
        </a>
      </section>
    </>
  );
}
