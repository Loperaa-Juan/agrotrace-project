/**
 * @file Vista del catálogo maestro (`CatalogoMaestroPage`). Permite al administrador ver los productos
 * del catálogo oficial agrupados por categoría y agregar nuevas categorías y productos.
 */

import {
  useEffect,
  useId,
  useState,
  type SubmitEvent,
  type ReactNode,
} from 'react';
import { Navigate } from 'react-router-dom';
import { ErrorApi } from '../auth-api';
import { crearProducto, obtenerCatalogo, type Producto } from '../profile-api';
import { routes } from '../routes';
import { useSesion } from '../session-context';

type DatosProducto = {
  nombre: string;
  categoria: string;
  unidad: string;
  descripcion: string;
};

type ErroresProducto = Partial<Record<keyof DatosProducto, string>>;

/** Categorías oficiales del `catalog-service`; el backend no expone un endpoint para crear nuevas. */
const CATEGORIAS_INICIALES = [
  'Frutas',
  'Verduras',
  'Hortalizas',
  'Tubérculos',
  'Granos',
  'Cereales',
];

/** Unidades de medida aceptadas por el `catalog-service`. */
const UNIDADES = ['lb', 'kg', 'g', 'unidad'];

const FORMULARIO_VACIO: DatosProducto = {
  nombre: '',
  categoria: '',
  unidad: '',
  descripcion: '',
};

const ERROR_CARGA = 'No pudimos cargar el catálogo. Intente de nuevo.';
const ERROR_CREAR = 'No pudimos agregar el producto. Intente de nuevo.';
const ERROR_NOMBRE = 'Escriba el nombre del producto.';
const ERROR_CATEGORIA = 'Elija una categoría.';
const ERROR_UNIDAD = 'Elija una unidad de medida.';
const ERROR_DESCRIPCION = 'Escriba una descripción del producto.';
const ERROR_NOMBRE_CATEGORIA = 'Escriba el nombre de la categoría.';
const ERROR_CATEGORIA_REPETIDA = 'Ya existe una categoría con ese nombre.';

const BOTON_PRIMARIO =
  'inline-flex items-center justify-center gap-2 px-5 h-12 rounded-xl bg-[#15803d] hover:bg-[#166534] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2';
const BOTON_SECUNDARIO =
  'inline-flex items-center justify-center gap-2 px-5 h-12 rounded-xl bg-white hover:bg-gray-100 text-[#15803d] text-sm font-semibold border border-gray-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2';
const CAMPO =
  'w-full h-12 px-4 rounded-xl bg-gray-50 border text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600 transition-colors';
const ETIQUETA = 'block font-semibold text-gray-900';

/** Quita espacios sobrantes y repetidos del nombre. */
const limpiarNombre = (nombre: string) => nombre.trim().replace(/\s+/g, ' ');

/** Valida los campos obligatorios del formulario de producto. */
function validarProducto(datos: DatosProducto): ErroresProducto {
  const errores: ErroresProducto = {};
  if (!limpiarNombre(datos.nombre)) errores.nombre = ERROR_NOMBRE;
  if (!datos.categoria) errores.categoria = ERROR_CATEGORIA;
  if (!datos.unidad) errores.unidad = ERROR_UNIDAD;
  if (!datos.descripcion.trim()) errores.descripcion = ERROR_DESCRIPCION;
  return errores;
}

/** Carga el catálogo; si la sesión venció la cierra. */
function useCatalogo(habilitado: boolean, salir: () => void) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!habilitado) return;
    let vigente = true;
    obtenerCatalogo()
      .then((catalogo) => {
        if (vigente) setProductos(catalogo);
      })
      .catch((err) => {
        if (!vigente) return;
        if (err instanceof ErrorApi && err.status === 401) salir();
        else setError(ERROR_CARGA);
      });
    return () => {
      vigente = false;
    };
  }, [habilitado, salir]);

  return { productos, setProductos, error };
}

function Campo({
  id,
  etiqueta,
  error,
  children,
}: Readonly<{
  id: string;
  etiqueta: string;
  error?: string;
  children: ReactNode;
}>) {
  return (
    <div className="space-y-2">
      <label className={ETIQUETA} htmlFor={id}>
        {etiqueta}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-700" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

const conError = (id: string, error?: string) => ({
  'aria-invalid': Boolean(error),
  'aria-describedby': error ? `${id}-error` : undefined,
});

const claseCampo = (error?: string) =>
  `${CAMPO} ${error ? 'border-red-500' : 'border-gray-200'}`;

/** Formulario para crear una categoría nueva. */
function FormularioCategoria({
  categorias,
  onCrear,
  onCancelar,
}: Readonly<{
  categorias: string[];
  onCrear: (nombre: string) => void;
  onCancelar: () => void;
}>) {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | undefined>();

  const guardar = (evento: SubmitEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const limpio = limpiarNombre(nombre);
    if (!limpio) return setError(ERROR_NOMBRE_CATEGORIA);
    if (categorias.some((c) => c.toLowerCase() === limpio.toLowerCase()))
      return setError(ERROR_CATEGORIA_REPETIDA);
    onCrear(limpio);
  };

  return (
    <form
      aria-labelledby="categoria-formulario-titulo"
      className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-5"
      noValidate
      onSubmit={guardar}
    >
      <h2
        className="text-xl font-bold text-gray-900"
        id="categoria-formulario-titulo"
      >
        Nueva categoría
      </h2>
      <div className="max-w-xl">
        <Campo
          error={error}
          etiqueta="Nombre de la categoría:"
          id="categoria-nombre"
        >
          <input
            className={claseCampo(error)}
            id="categoria-nombre"
            {...conError('categoria-nombre', error)}
            onChange={(evento) => {
              setNombre(evento.target.value);
              setError(undefined);
            }}
            placeholder="Ej.: Hierbas y aromáticas"
            type="text"
            value={nombre}
          />
        </Campo>
      </div>
      <div className="flex flex-wrap gap-3">
        <button className={BOTON_PRIMARIO} type="submit">
          Crear categoría
        </button>
        <button className={BOTON_SECUNDARIO} onClick={onCancelar} type="button">
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Formulario para agregar un producto al catálogo maestro. */
function FormularioProducto({
  categorias,
  onCreado,
  onCancelar,
  onSesionVencida,
}: Readonly<{
  categorias: string[];
  onCreado: (producto: Producto) => void;
  onCancelar: () => void;
  onSesionVencida: () => void;
}>) {
  const [datos, setDatos] = useState<DatosProducto>(FORMULARIO_VACIO);
  const [errores, setErrores] = useState<ErroresProducto>({});
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar =
    (campo: keyof DatosProducto) =>
    (
      evento: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setDatos((previos) => ({ ...previos, [campo]: evento.target.value }));
      setErrores((previos) => ({ ...previos, [campo]: undefined }));
    };

  const guardar = async (evento: SubmitEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const encontrados = validarProducto(datos);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      onCreado(
        await crearProducto({
          name: limpiarNombre(datos.nombre),
          category: datos.categoria,
          unitOfMeasure: datos.unidad,
          description: datos.descripcion.trim(),
        }),
      );
    } catch (err) {
      if (err instanceof ErrorApi && err.status === 401) onSesionVencida();
      else
        setErrorEnvio(
          err instanceof ErrorApi
            ? `No pudimos agregar el producto: ${err.message}`
            : ERROR_CREAR,
        );
      setEnviando(false);
    }
  };

  return (
    <form
      aria-labelledby="producto-formulario-titulo"
      className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 space-y-5"
      noValidate
      onSubmit={guardar}
    >
      <h2
        className="text-xl font-bold text-gray-900"
        id="producto-formulario-titulo"
      >
        Nuevo producto
      </h2>
      <p className="text-sm text-gray-600">
        Todos los campos son obligatorios.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Campo
          error={errores.nombre}
          etiqueta="Nombre del producto:"
          id="producto-nombre"
        >
          <input
            className={claseCampo(errores.nombre)}
            id="producto-nombre"
            {...conError('producto-nombre', errores.nombre)}
            onChange={cambiar('nombre')}
            placeholder="Ej.: Tomate de árbol"
            type="text"
            value={datos.nombre}
          />
        </Campo>
        <Campo
          error={errores.categoria}
          etiqueta="Categoría:"
          id="producto-categoria"
        >
          <select
            className={claseCampo(errores.categoria)}
            id="producto-categoria"
            {...conError('producto-categoria', errores.categoria)}
            onChange={cambiar('categoria')}
            value={datos.categoria}
          >
            <option disabled value="">
              Elige una categoría
            </option>
            {categorias.map((categoria) => (
              <option key={categoria}>{categoria}</option>
            ))}
          </select>
        </Campo>
        <Campo
          error={errores.unidad}
          etiqueta="Unidad de medida:"
          id="producto-unidad"
        >
          <select
            className={claseCampo(errores.unidad)}
            id="producto-unidad"
            {...conError('producto-unidad', errores.unidad)}
            onChange={cambiar('unidad')}
            value={datos.unidad}
          >
            <option disabled value="">
              Elige una unidad
            </option>
            {UNIDADES.map((unidad) => (
              <option key={unidad}>{unidad}</option>
            ))}
          </select>
        </Campo>
        <Campo
          error={errores.descripcion}
          etiqueta="Descripción:"
          id="producto-descripcion"
        >
          <textarea
            className={`${claseCampo(errores.descripcion)} h-24 py-3`}
            id="producto-descripcion"
            {...conError('producto-descripcion', errores.descripcion)}
            onChange={cambiar('descripcion')}
            placeholder="Variedad, características y uso del producto"
            value={datos.descripcion}
          />
        </Campo>
      </div>
      {errorEnvio && (
        <p className="text-sm text-red-700" role="alert">
          {errorEnvio}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button className={BOTON_PRIMARIO} disabled={enviando} type="submit">
          Agregar al catálogo
        </button>
        <button className={BOTON_SECUNDARIO} onClick={onCancelar} type="button">
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Productos del catálogo agrupados bajo el título de su categoría. */
function SeccionCategoria({
  categoria,
  productos,
}: Readonly<{ categoria: string; productos: Producto[] }>) {
  // El nombre de la categoría puede llevar espacios, que no valen en un id.
  const idTitulo = useId();
  return (
    <section aria-labelledby={idTitulo} className="space-y-3">
      <h2
        className="text-xl font-bold text-gray-900 flex items-center gap-2"
        id={idTitulo}
      >
        {categoria}
        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
          {productos.length}
        </span>
      </h2>
      {productos.length === 0 ? (
        <p className="p-4 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-600">
          Esta categoría aún no tiene productos.
        </p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {productos.map((producto) => (
            <li
              className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 space-y-1"
              key={producto.ProductId}
            >
              <h3 className="font-bold text-gray-900">{producto.name}</h3>
              {producto.description && (
                <p className="text-sm text-gray-600">{producto.description}</p>
              )}
              <p className="text-xs font-semibold text-gray-500">
                Se vende por {producto.unitOfMeasure}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type Formulario = 'categoria' | 'producto' | null;

/**
 * RF-05: el administrador consulta el catálogo oficial y agrega categorías y productos.
 * Los agricultores solo publican productos activos de este catálogo.
 */
export function CatalogoMaestroPage() {
  const { usuario, salir } = useSesion();
  const esAdmin = usuario?.role === 'Admin';
  const {
    productos,
    setProductos,
    error: errorCarga,
  } = useCatalogo(esAdmin, salir);
  const [categorias, setCategorias] = useState(CATEGORIAS_INICIALES);
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  if (!usuario) return <Navigate replace to={routes.login} />;
  if (!esAdmin) return <Navigate replace to={routes.explorar} />;

  const abrir = (cual: Exclude<Formulario, null>) => {
    setFormulario(cual);
    setAviso(null);
  };

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            Catálogo maestro
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Categorías y productos que se pueden ofrecer en AgroTrace. Los
            agricultores solo publican productos activos de este catálogo.
          </p>
        </div>
        {formulario === null && (
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              className={BOTON_SECUNDARIO}
              onClick={() => abrir('categoria')}
              type="button"
            >
              Agregar categoría
            </button>
            <button
              className={BOTON_PRIMARIO}
              onClick={() => abrir('producto')}
              type="button"
            >
              Agregar producto
            </button>
          </div>
        )}
      </div>

      <p
        className="p-4 rounded-xl bg-green-50 text-sm text-gray-800"
        role="note"
      >
        Esta vista es solo para administradores.
      </p>

      {errorCarga && (
        <p className="text-sm text-red-700" role="alert">
          {errorCarga}
        </p>
      )}

      {aviso && (
        <output className="block p-4 rounded-xl bg-gray-100 text-sm text-gray-800">
          {aviso}
        </output>
      )}

      {formulario === 'categoria' && (
        <FormularioCategoria
          categorias={categorias}
          onCancelar={() => setFormulario(null)}
          onCrear={(nombre) => {
            setCategorias((previas) => [...previas, nombre]);
            setAviso(
              `Creaste la categoría «${nombre}». Ya puedes agregarle productos.`,
            );
            setFormulario(null);
          }}
        />
      )}

      {formulario === 'producto' && (
        <FormularioProducto
          categorias={categorias}
          onCancelar={() => setFormulario(null)}
          onCreado={(producto) => {
            setProductos((previos) => [...previos, producto]);
            setAviso(`Agregaste «${producto.name}» al catálogo.`);
            setFormulario(null);
          }}
          onSesionVencida={salir}
        />
      )}

      {categorias.map((categoria) => (
        <SeccionCategoria
          categoria={categoria}
          key={categoria}
          productos={productos.filter((p) => p.category === categoria)}
        />
      ))}
    </main>
  );
}
