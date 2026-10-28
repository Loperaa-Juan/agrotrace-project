/**
 * Punto de entrada de la librería `@app/shared`: módulo, servicio de validación,
 * guards de autenticación y autorización, y roles compartidos entre microservicios.
 * @packageDocumentation
 */
export * from './shared.module';
export * from './services/validation.service';
export * from './guards/jwt-auth.guard';
export * from './guards/roles.guard';
export * from './roles/role.enum';
export * from './roles/roles.decorator';
