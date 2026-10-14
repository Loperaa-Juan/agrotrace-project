import { useState, type ChangeEvent, type ReactNode, type SubmitEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import {
  ErrorApi,
  iniciarSesion,
  registrarUsuario,
  type NuevoUsuario,
  type Sesion,
  type TipoDocumento,
} from '../auth-api';
import {
  normalizarCorreo,
  normalizarDocumento,
  normalizarTelefono,
  normalizarTexto,
  ORDEN_CAMPOS,
  validarRegistro,
  type DatosRegistro,
  type ErroresRegistro,
} from '../registro';
import { inicioDe, routes } from '../routes';
import { useSesion } from '../session-context';

type AuthMode = 'login' | 'register';

type Perfil = {
  rol: NuevoUsuario['role'];
  icono: string;
  colorIcono: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  pistaTitulo: string;
  pistaTexto: string;
  etiquetaRegistro: string;
  /** RF-02: Agricultor y Persona se registran con CC o CE; Negocio, con NIT. */
  documentos: TipoDocumento[];
};

/**
 * El tipo de cuenta se declara al darse de alta, nunca al iniciar sesión:
 * en el acceso el rol lo devuelve el servidor.
 */
const PERFILES: Perfil[] = [
  {
    rol: 'Agricultor',
    documentos: ['CC', 'CE'],
    icono: 'agriculture',
    colorIcono: 'bg-green-100 text-[#15803d]',
    titulo: 'Soy Agricultor / Productor',
    subtitulo: 'Perico · Las Palmas · El Escobero',
    descripcion: 'Vende cosechas a precio justo con clasificación de calidad automática por IA.',
    pistaTitulo: 'Perfil de Productor:',
    pistaTexto:
      'Tendrás acceso a la herramienta de inspección fotográfica para clasificar Aguacate, Plátano y Fresas en Grados A, B y C.',
    etiquetaRegistro: 'Crear Perfil de Productor Local',
  },
  {
    rol: 'Persona',
    documentos: ['CC', 'CE'],
    icono: 'local_mall',
    colorIcono: 'bg-amber-100 text-amber-700',
    titulo: 'Persona / Hogar',
    subtitulo: 'Consumo Consciente',
    descripcion: 'Frutas y hortalizas cosechadas hoy en Envigado, directo de la finca.',
    pistaTitulo: 'Perfil de Consumidor Familiar:',
    pistaTexto:
      'Explora cosechas recogidas esta mañana en Las Palmas, Pantanillo y El Vallano y recógelas en la finca del productor.',
    etiquetaRegistro: 'Crear Cuenta para Mi Hogar',
  },
  {
    rol: 'Negocio',
    documentos: ['NIT'],
    icono: 'restaurant',
    colorIcono: 'bg-gray-200 text-gray-800',
    titulo: 'Negocio / Restaurante',
    subtitulo: 'Suministro B2B',
    descripcion: 'Lotes mayoristas con ficha técnica y trazabilidad de origen.',
    pistaTitulo: 'Perfil de Restaurante / Chef:',
    pistaTexto:
      'Consigue listas de precios por volumen y trazabilidad por georreferenciación de cada lote.',
    etiquetaRegistro: 'Registrar Mi Restaurante / Negocio',
  },
];

const TIPOS_DOCUMENTO: { valor: TipoDocumento; etiqueta: string }[] = [
  { valor: 'CC', etiqueta: 'CC · Cédula de ciudadanía' },
  { valor: 'CE', etiqueta: 'CE · Cédula de extranjería' },
  { valor: 'NIT', etiqueta: 'NIT' },
];

/** Datos del alta que pide el RF-01; correo y contraseña se comparten con el acceso. */
type CamposRegistro = Omit<DatosRegistro, 'correo' | 'clave'>;

const REGISTRO_VACIO: CamposRegistro = {
  nombre: '',
  tipoDocumento: 'CC',
  numeroDocumento: '',
  telefono: '',
  direccion: '',
  municipio: '',
};

/** Id de cada control, para llevar el foco al primer campo con error. */
const ID_CAMPO: Record<keyof DatosRegistro, string> = {
  nombre: 'nombre-input',
  tipoDocumento: 'tipo-documento-input',
  numeroDocumento: 'numero-documento-input',
  correo: 'identifier-input',
  telefono: 'telefono-input',
  clave: 'password-input',
  direccion: 'direccion-input',
  municipio: 'municipio-input',
};

const ERROR_CAMPOS = 'Revisa los campos marcados para crear tu cuenta.';
const ERROR_CREDENCIALES =
  'No encontramos una cuenta con esos datos. Revisa el correo y la contraseña.';
const ERROR_SERVIDOR = 'Algo salió mal en el servidor. Intenta de nuevo más tarde.';
const ERROR_CONEXION = 'No pudimos conectar con el servidor. Intenta de nuevo.';

const PESTANA =
  'flex-1 py-2 rounded-lg text-sm font-semibold text-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-600';
const PESTANA_ACTIVA = 'bg-white text-[#15803d] shadow-sm';
const PESTANA_INACTIVA = 'text-gray-600 hover:text-gray-900';

const INPUT =
  'w-full h-12 pl-11 bg-gray-50 border rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-600 transition-all';

/** `derecha` deja sitio al botón o la flecha que algunos controles llevan a la derecha. */
const claseInput = (error?: string, derecha = 'pr-4') =>
  `${INPUT} ${derecha} ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'}`;

/** Resalta el control y enlaza el mensaje para que el lector de pantalla lo anuncie. */
const conError = (id: string, error?: string) => ({
  'aria-invalid': Boolean(error),
  'aria-describedby': error ? `${id}-error` : undefined,
});

function Icono({ nombre, className = '' }: Readonly<{ nombre: string; className?: string }>) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {nombre}
    </span>
  );
}

function MensajeError({ id, error }: Readonly<{ id: string; error?: string }>) {
  if (!error) return null;
  return (
    <p className="flex items-center gap-1 text-xs font-medium text-red-600" id={`${id}-error`}>
      <Icono className="text-base" nombre="error" />
      {error}
    </p>
  );
}

function Campo({
  id,
  etiqueta,
  icono,
  error,
  children,
}: Readonly<{
  id: string;
  etiqueta: string;
  icono: string;
  error?: string;
  children: ReactNode;
}>) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-800" htmlFor={id}>
        {etiqueta}
      </label>
      <div className="relative flex items-center">
        <Icono className="absolute left-3.5 text-lg text-gray-400 pointer-events-none" nombre={icono} />
        {children}
      </div>
      <MensajeError error={error} id={id} />
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { entrar } = useSesion();
  // `?modo=registro` abre directamente el alta: así «Registrarse» desde la
  // landing no deja al visitante en la pestaña equivocada.
  const [parametros, setParametros] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(
    parametros.get('modo') === 'registro' ? 'register' : 'login',
  );
  const [rol, setRol] = useState<Perfil['rol']>('Agricultor');
  const [verClave, setVerClave] = useState(false);
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [registro, setRegistro] = useState<CamposRegistro>(REGISTRO_VACIO);
  const [errores, setErrores] = useState<ErroresRegistro>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const perfil = PERFILES.find((item) => item.rol === rol)!;
  // Los avisos por campo son del alta; en el acceso no se muestran.
  const e: ErroresRegistro = mode === 'register' ? errores : {};

  const cambiarModo = (nuevo: AuthMode) => {
    setMode(nuevo);
    setError(null);
    setParametros(nuevo === 'register' ? { modo: 'registro' } : {}, { replace: true });
  };

  /** Al corregir un campo su error desaparece; el resto se revisa al enviar de nuevo. */
  const limpiarError = (campo: keyof DatosRegistro) =>
    setErrores((previos) => (previos[campo] ? { ...previos, [campo]: undefined } : previos));

  const cambiarRegistro =
    (campo: keyof CamposRegistro) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setRegistro((previo) => ({ ...previo, [campo]: event.target.value }));
      limpiarError(campo);
    };

  const elegirPerfil = (nuevo: Perfil) => {
    setRol(nuevo.rol);
    // Un NIT elegido como Negocio no vale al pasar a Persona o Agricultor.
    if (!nuevo.documentos.includes(registro.tipoDocumento)) {
      setRegistro((previo) => ({ ...previo, tipoDocumento: nuevo.documentos[0] }));
      limpiarError('tipoDocumento');
      limpiarError('numeroDocumento');
    }
  };

  const marcarErrores = (encontrados: ErroresRegistro) => {
    setErrores(encontrados);
    const primero = ORDEN_CAMPOS.find((campo) => encontrados[campo]);
    if (!primero) return false;
    setError(ERROR_CAMPOS);
    document.getElementById(ID_CAMPO[primero])?.focus();
    return true;
  };

  const abrirSesion = (sesion: Sesion) => {
    entrar(sesion);
    navigate(inicioDe(sesion.user.role));
  };

  const crearCuenta = async () => {
    if (marcarErrores(validarRegistro({ ...registro, correo, clave }, perfil.documentos))) return;
    try {
      abrirSesion(
        await registrarUsuario({
          name: normalizarTexto(registro.nombre),
          documentType: registro.tipoDocumento,
          documentNumber: normalizarDocumento(registro.numeroDocumento),
          email: normalizarCorreo(correo),
          phone: normalizarTelefono(registro.telefono),
          password: clave,
          address: normalizarTexto(registro.direccion),
          municipality: 'Envigado',
          role: perfil.rol,
        }),
      );
    } catch (err) {
      if (err instanceof ErrorApi && err.status === 409) {
        marcarErrores({ correo: 'Ya existe una cuenta con este correo.' });
        return;
      }
      setError(err instanceof ErrorApi ? ERROR_SERVIDOR : ERROR_CONEXION);
    }
  };

  const ingresar = async () => {
    try {
      abrirSesion(await iniciarSesion(normalizarCorreo(correo), clave));
    } catch (err) {
      if (!(err instanceof ErrorApi)) setError(ERROR_CONEXION);
      else setError(err.status === 400 || err.status === 401 ? ERROR_CREDENCIALES : ERROR_SERVIDOR);
    }
  };

  const enviar = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setEnviando(true);
    await (mode === 'register' ? crearCuenta() : ingresar());
    setEnviando(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 py-3 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            className="rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
            to={routes.inicio}
          >
            <img alt="AgroTrace" className="h-10 sm:h-11 w-auto object-contain" src="/img/agrotrace-logo.webp" />
          </Link>
          <Link
            className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold text-gray-600 hover:text-[#15803d] hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600"
            to={routes.inicio}
          >
            <Icono className="text-lg" nombre="arrow_back" />
            <span>Volver al inicio</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <section className="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-28">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">
                Bienvenido a{' '}
                <span className="text-[#15803d] underline decoration-[#79db8d] decoration-wavy decoration-2 underline-offset-8">
                  AgroTrace
                </span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-md">
                Conectando el campo con tu mesa sin intermediarios y con clasificación de calidad.
              </p>
            </div>
            <img
              alt="Paisaje rural de Envigado"
              className="hidden lg:block w-full h-64 object-cover rounded-2xl shadow-md"
              src="/img/hero-envigado.webp"
            />
          </section>

          <section className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-8 shadow-xl border border-gray-100 flex flex-col gap-6">
            <div className="flex p-1 bg-gray-100 rounded-xl w-full max-w-xs">
              <button
                aria-pressed={mode === 'login'}
                className={`${PESTANA} ${mode === 'login' ? PESTANA_ACTIVA : PESTANA_INACTIVA}`}
                onClick={() => cambiarModo('login')}
                type="button"
              >
                Ingresar
              </button>
              <button
                aria-pressed={mode === 'register'}
                className={`${PESTANA} ${mode === 'register' ? PESTANA_ACTIVA : PESTANA_INACTIVA}`}
                onClick={() => cambiarModo('register')}
                type="button"
              >
                Registrarme
              </button>
            </div>

            {mode === 'register' && (
              <>
                <div className="space-y-1">
                  <p className="text-base font-bold text-gray-900">1. Selecciona tu perfil en AgroTrace:</p>
                  <p className="text-sm text-gray-600">
                    Personalizamos la plataforma según vendas cosechas o compres producto fresco.
                  </p>
                </div>
                <div
                  aria-label="Tipo de cuenta que deseas crear"
                  className="grid grid-cols-1 md:grid-cols-3 gap-3"
                  role="radiogroup"
                >
                  {PERFILES.map((item) => {
                    const activo = item.rol === rol;
                    return (
                      <button
                        aria-checked={activo}
                        className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-3 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 ${
                          activo
                            ? 'border-[#15803d] bg-green-50 shadow-sm'
                            : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                        key={item.rol}
                        onClick={() => elegirPerfil(item)}
                        role="radio"
                        type="button"
                      >
                        <span className="w-full flex items-start justify-between">
                          <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.colorIcono}`}>
                            <Icono className="text-xl" nombre={item.icono} />
                          </span>
                          <Icono
                            className={`text-xl ${activo ? 'text-[#15803d]' : 'text-gray-300'}`}
                            nombre={activo ? 'check_circle' : 'radio_button_unchecked'}
                          />
                        </span>
                        <span>
                          <strong className="block text-sm font-bold text-gray-900 leading-snug">
                            {item.titulo}
                          </strong>{' '}
                          <span className="block mt-0.5 text-xs font-semibold text-[#15803d]">
                            {item.subtitulo}
                          </span>{' '}
                          <span className="block mt-1 text-xs text-gray-600 line-clamp-2">{item.descripcion}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="flex items-center gap-3 p-3 rounded-xl bg-green-50 text-sm text-gray-800">
                  <Icono className="text-xl text-[#15803d]" nombre="smart_toy" />
                  <span>
                    <strong>{perfil.pistaTitulo}</strong> {perfil.pistaTexto}
                  </span>
                </p>
              </>
            )}

            <form className="space-y-4" noValidate={true} onSubmit={enviar}>
              {mode === 'register' && (
                <>
                  <p className="text-base font-bold text-gray-900">2. Completa tus datos:</p>
                  <Campo
                    etiqueta={rol === 'Negocio' ? 'Razón social:' : 'Nombre completo:'}
                    error={e.nombre}
                    icono="person"
                    id="nombre-input"
                  >
                    <input
                      autoComplete={rol === 'Negocio' ? 'organization' : 'name'}
                      className={claseInput(e.nombre)}
                      id="nombre-input"
                      {...conError('nombre-input', e.nombre)}
                      onChange={cambiarRegistro('nombre')}
                      placeholder={rol === 'Negocio' ? 'Restaurante La Buena Mesa S.A.S.' : 'Nombre y apellidos'}
                      required={true}
                      type="text"
                      value={registro.nombre}
                    />
                  </Campo>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Campo
                      etiqueta="Tipo de documento:"
                      error={e.tipoDocumento}
                      icono="badge"
                      id="tipo-documento-input"
                    >
                      <select
                        className={`${claseInput(e.tipoDocumento, 'pr-10')} appearance-none cursor-pointer`}
                        id="tipo-documento-input"
                        {...conError('tipo-documento-input', e.tipoDocumento)}
                        onChange={cambiarRegistro('tipoDocumento')}
                        required={true}
                        value={registro.tipoDocumento}
                      >
                        {TIPOS_DOCUMENTO.filter((tipo) => perfil.documentos.includes(tipo.valor)).map(
                          (tipo) => (
                            <option key={tipo.valor} value={tipo.valor}>
                              {tipo.etiqueta}
                            </option>
                          ),
                        )}
                      </select>
                      <Icono
                        className="absolute right-3 text-xl text-gray-400 pointer-events-none"
                        nombre="expand_more"
                      />
                    </Campo>
                    <Campo
                      etiqueta="Número de documento:"
                      error={e.numeroDocumento}
                      icono="pin"
                      id="numero-documento-input"
                    >
                      <input
                        autoComplete="off"
                        className={claseInput(e.numeroDocumento)}
                        id="numero-documento-input"
                        {...conError('numero-documento-input', e.numeroDocumento)}
                        inputMode="numeric"
                        onChange={cambiarRegistro('numeroDocumento')}
                        placeholder={registro.tipoDocumento === 'NIT' ? '900123456-7' : '1036123456'}
                        required={true}
                        type="text"
                        value={registro.numeroDocumento}
                      />
                    </Campo>
                  </div>
                </>
              )}
              <Campo etiqueta="Correo electrónico:" error={e.correo} icono="mail" id="identifier-input">
                <input
                  autoComplete="email"
                  className={claseInput(e.correo)}
                  id="identifier-input"
                  {...conError('identifier-input', e.correo)}
                  onChange={(event) => {
                    setCorreo(event.target.value);
                    limpiarError('correo');
                  }}
                  placeholder="correo@ejemplo.com"
                  required={true}
                  type="email"
                  value={correo}
                />
              </Campo>
              {mode === 'register' && (
                <Campo etiqueta="Teléfono celular:" error={e.telefono} icono="smartphone" id="telefono-input">
                  <input
                    autoComplete="tel-national"
                    className={claseInput(e.telefono)}
                    id="telefono-input"
                    {...conError('telefono-input', e.telefono)}
                    inputMode="numeric"
                    onChange={cambiarRegistro('telefono')}
                    placeholder="3001234567"
                    required={true}
                    type="tel"
                    value={registro.telefono}
                  />
                </Campo>
              )}
              <Campo etiqueta="Contraseña de acceso:" error={e.clave} icono="key" id="password-input">
                <input
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className={claseInput(e.clave, 'pr-12')}
                  id="password-input"
                  {...conError('password-input', e.clave)}
                  onChange={(event) => {
                    setClave(event.target.value);
                    limpiarError('clave');
                  }}
                  placeholder="Introduce tu clave secreta"
                  required={true}
                  type={verClave ? 'text' : 'password'}
                  value={clave}
                />
                <button
                  aria-label="Mostrar u ocultar contraseña"
                  aria-pressed={verClave}
                  className="absolute right-2 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-600"
                  onClick={() => setVerClave((visible) => !visible)}
                  type="button"
                >
                  <Icono className="text-xl" nombre={verClave ? 'visibility_off' : 'visibility'} />
                </button>
              </Campo>
              {mode === 'register' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Campo etiqueta="Dirección:" error={e.direccion} icono="home_pin" id="direccion-input">
                    <input
                      autoComplete="street-address"
                      className={claseInput(e.direccion)}
                      id="direccion-input"
                      {...conError('direccion-input', e.direccion)}
                      onChange={cambiarRegistro('direccion')}
                      placeholder="Calle 38 Sur # 43-20"
                      required={true}
                      type="text"
                      value={registro.direccion}
                    />
                  </Campo>
                  <Campo etiqueta="Municipio:" error={e.municipio} icono="location_city" id="municipio-input">
                    <input
                      autoComplete="address-level2"
                      className={claseInput(e.municipio)}
                      id="municipio-input"
                      {...conError('municipio-input', e.municipio)}
                      onChange={cambiarRegistro('municipio')}
                      placeholder="Envigado"
                      required={true}
                      type="text"
                      value={registro.municipio}
                    />
                  </Campo>
                </div>
              )}
              {error && (
                <p
                  className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700"
                  role="alert"
                >
                  <Icono className="text-lg shrink-0" nombre="error" />
                  {error}
                </p>
              )}
              <button
                className="w-full h-13 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#15803d] hover:bg-[#166534] text-white text-base font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-green-600/30 disabled:opacity-60 disabled:cursor-wait"
                disabled={enviando}
                type="submit"
              >
                <span>{mode === 'login' ? 'Ingresar a AgroTrace' : perfil.etiquetaRegistro}</span>
                <Icono className="text-xl" nombre="arrow_forward" />
              </button>
            </form>

            <p className="text-center text-sm text-gray-600">
              {mode === 'login' ? '¿No tienes cuenta aún?' : '¿Ya tienes cuenta?'}{' '}
              <button
                className="ml-1 inline-flex items-center gap-0.5 font-bold text-[#15803d] hover:underline cursor-pointer rounded focus:outline-none focus:ring-2 focus:ring-green-600"
                onClick={() => cambiarModo(mode === 'login' ? 'register' : 'login')}
                type="button"
              >
                {mode === 'login' ? 'Regístrate en 2 minutos' : 'Inicia sesión'}
                <Icono className="text-base" nombre="east" />
              </button>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
