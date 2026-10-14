function Landing() {
  return (
    <>
      <header>
        <span>AgroTrace</span>
        <nav>
          <a href="/login">Iniciar Sesión</a>
          <a href="/register">Registrarse</a>
        </nav>
      </header>

      <main>
        <h1>Comercio agrícola justo y directo, desde la vereda hasta tu mesa.</h1>
        <p>
          Conectamos agricultores locales con hogares y restaurantes,
          clasificando la calidad de las cosechas mediante Inteligencia
          Artificial y pagando al instante sin intermediarios.
        </p>
        <a href="/register">Registrarse gratis</a>
        <a href="/login">¿Ya tienes cuenta? Inicia sesión</a>
      </main>
    </>
  );
}

export default Landing;
