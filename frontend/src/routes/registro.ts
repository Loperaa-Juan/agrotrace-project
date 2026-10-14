import type { TipoDocumento } from './auth-api';

export type DatosRegistro = {
  nombre: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  correo: string;
  telefono: string;
  clave: string;
  direccion: string;
  municipio: string;
};

export type ErroresRegistro = Partial<Record<keyof DatosRegistro, string>>;

/** Orden en que aparecen los campos en el formulario, para enfocar el primero con error. */
export const ORDEN_CAMPOS: (keyof DatosRegistro)[] = [
  'nombre',
  'tipoDocumento',
  'numeroDocumento',
  'correo',
  'telefono',
  'clave',
  'direccion',
  'municipio',
];

/** Usuario y dominio con al menos un punto (`juan@agrotrace.com`), sin espacios. */
function esCorreoValido(correo: string) {
  const partes = correo.split('@');
  if (partes.length !== 2 || /\s/.test(correo)) return false;
  const [usuario, dominio] = partes;
  const etiquetas = dominio.split('.');
  return usuario.length > 0 && etiquetas.length > 1 && etiquetas.every(Boolean);
}

export const normalizarTexto = (texto: string) => texto.trim().replace(/\s+/g, ' ');
export const normalizarCorreo = (correo: string) => correo.trim().toLowerCase();
export const normalizarDocumento = (documento: string) => documento.replace(/[\s.]/g, '');
/** Deja solo los 10 dígitos del celular, sin espacios ni el indicativo +57. */
export const normalizarTelefono = (telefono: string) =>
  telefono.replace(/\D/g, '').replace(/^57(?=3\d{9}$)/, '');

const sinTildes = (texto: string) =>
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Mismas reglas que aplica el users-service al registrar (ver PRUEBAS-ENDPOINTS.md). */
export function validarRegistro(
  datos: DatosRegistro,
  documentosPermitidos: TipoDocumento[],
): ErroresRegistro {
  const errores: ErroresRegistro = {};
  const patronDocumento = datos.tipoDocumento === 'NIT' ? /^\d{5,15}(-\d)?$/ : /^\d{5,15}$/;

  if (!normalizarTexto(datos.nombre)) errores.nombre = 'Ingresa tu nombre completo';
  if (!documentosPermitidos.includes(datos.tipoDocumento)) {
    errores.tipoDocumento = 'Este tipo de documento no aplica para tu perfil';
  }
  if (!patronDocumento.test(normalizarDocumento(datos.numeroDocumento))) {
    errores.numeroDocumento = 'Ingresa entre 5 y 15 dígitos';
  }
  if (!esCorreoValido(normalizarCorreo(datos.correo))) errores.correo = 'Ingresa un correo válido';
  if (!/^3\d{9}$/.test(normalizarTelefono(datos.telefono))) {
    errores.telefono = 'Ingresa un celular de 10 dígitos que empiece por 3';
  }
  if (datos.clave.length < 8 || datos.clave.length > 72) {
    errores.clave = 'La contraseña debe tener entre 8 y 72 caracteres';
  }
  if (!normalizarTexto(datos.direccion)) errores.direccion = 'Ingresa tu dirección';
  if (sinTildes(normalizarTexto(datos.municipio)) !== 'envigado') {
    errores.municipio = 'Por ahora solo atendemos Envigado';
  }

  return errores;
}
