/**
 * Plugin de JSDoc para documentar archivos TypeScript.
 *
 * JSDoc solo entiende JavaScript, así que antes de parsear cada archivo .ts se
 * transpila a JS con el compilador de TypeScript conservando los comentarios.
 * Los decoradores de NestJS se convierten en llamadas normales y los tipos se eliminan.
 */
const ts = require('typescript');

exports.handlers = {
  beforeParse(e) {
    if (!e.filename.endsWith('.ts')) {
      return;
    }

    e.source = ts.transpileModule(e.source, {
      fileName: e.filename,
      compilerOptions: {
        target: ts.ScriptTarget.ES2021,
        module: ts.ModuleKind.ESNext,
        experimentalDecorators: true,
        removeComments: false,
      },
    }).outputText;
  },
};
