const BOTON_SECUNDARIO =
  'px-4 h-10 inline-flex items-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 cursor-pointer';
const BOTON_PRIMARIO =
  'px-4 sm:px-5 h-10 inline-flex items-center rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-sm font-semibold shadow-sm hover:shadow transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 active:scale-95 cursor-pointer';
const ENLACE_FOOTER =
  'hover:text-[#15803d] focus:outline-none focus:ring-2 focus:ring-green-600 rounded px-1 transition-colors';

const BENEFICIOS = [
  {
    icono: 'document_scanner',
    colores: 'bg-green-100 text-[#15803d]',
    titulo: 'Clasificación de calidad con IA',
    descripcion:
      'Escaneo objetivo de maduración, calibre y frescura para garantizar un precio justo.',
  },
  {
    icono: 'verified_user',
    colores: 'bg-emerald-100 text-emerald-800',
    titulo: 'Pago seguro en garantía',
    descripcion:
      'Tu dinero queda en custodia hasta verificar la frescura de la cosecha.',
  },
  {
    icono: 'pin_drop',
    colores: 'bg-amber-100 text-amber-800',
    titulo: 'Trazabilidad del origen',
    descripcion:
      'Conoce directamente al campesino que cultivó tus alimentos y recibe cosechas del mismo día.',
  },
];

function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100 py-3 px-4 sm:px-8 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 rounded-lg p-1"
          >
            <img
              alt=""
              className="h-10 sm:h-11 w-auto object-contain"
              src="/img/agrotrace-logo.webp"
            />
            <span className="sr-only">AgroTrace</span>
          </a>
          <nav className="flex items-center gap-2 sm:gap-3">
            <a className={BOTON_SECUNDARIO} href="/login">
              Iniciar Sesión
            </a>
            <a className={BOTON_PRIMARIO} href="/register">
              Registrarse
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-8 flex flex-col gap-8">
        <section className="relative rounded-3xl overflow-hidden shadow-xl min-h-[540px] sm:min-h-[560px] flex flex-col justify-center p-6 sm:p-12 md:p-16 text-white">
          <div
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/img/hero-envigado.webp')" }}
          ></div>
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30 md:to-transparent"></div>
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          <div className="relative z-10 max-w-2xl flex flex-col">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white mb-6">
              Comercio agrícola justo y directo,{' '}
              <span className="text-[#79db8d] underline decoration-[#79db8d]/50 decoration-wavy underline-offset-8">
                desde la vereda
              </span>{' '}
              hasta tu mesa.
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 font-normal leading-relaxed max-w-2xl mb-8">
              Conectamos agricultores locales con hogares y restaurantes,
              clasificando la calidad de las cosechas mediante Inteligencia
              Artificial y pagando al instante sin intermediarios.
            </p>
            <div className="flex flex-col items-start gap-4 pt-1">
              <a
                className="bg-[#15803d] hover:bg-[#166534] text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-green-600/30 transition-all text-base inline-flex items-center gap-2 cursor-pointer active:scale-95"
                href="/register"
              >
                <span>Registrarse gratis</span>
                <span
                  className="material-symbols-outlined text-xl"
                  aria-hidden="true"
                >
                  arrow_forward
                </span>
              </a>
              <a
                className="text-white/85 hover:text-white underline underline-offset-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white rounded p-1 cursor-pointer"
                href="/login"
              >
                ¿Ya tienes cuenta? Inicia sesión
              </a>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 md:mt-8">
          {BENEFICIOS.map((beneficio) => (
            <div
              key={beneficio.titulo}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${beneficio.colores}`}
              >
                <span
                  className="material-symbols-outlined text-2xl"
                  aria-hidden="true"
                >
                  {beneficio.icono}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                {beneficio.titulo}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed font-normal">
                {beneficio.descripcion}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mt-auto border-t border-gray-100 bg-white py-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <span>© 2025 AgroTrace. Todos los derechos reservados.</span>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a className={ENLACE_FOOTER} href="#">
              Términos y Condiciones
            </a>
            <a className={ENLACE_FOOTER} href="#">
              Política de Privacidad
            </a>
            <a
              className={`inline-flex items-center gap-1.5 text-gray-700 font-medium ${ENLACE_FOOTER}`}
              href="#"
              aria-label="Soporte al cliente vía Chat o WhatsApp"
            >
              <span
                className="material-symbols-outlined text-base text-[#15803d]"
                aria-hidden="true"
              >
                chat
              </span>
              <span>Soporte vía Chat / WhatsApp</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
