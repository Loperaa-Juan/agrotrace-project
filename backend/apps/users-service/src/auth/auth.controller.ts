import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDTO } from './dto/register.dto';
import { LoginDTO } from './dto/login.dto';
import { RefreshDTO } from './dto/refresh.dto';

/**
 * Controlador encargado de exponer los endpoints HTTP para la autenticación 
 * y gestión de sesiones (registro, login, actualización de tokens y cierre de sesión).
 */
@Controller('auth')
export class AuthController {
  /**
   * Inyecta el servicio de autenticación para procesar la lógica de negocio.
   * @param {AuthService} authService - Servicio con la lógica de usuarios y tokens.
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint público para registrar un nuevo usuario en la plataforma.
   * @param {RegisterDTO} registerDto - Datos obligatorios y de validación para el registro.
   * @returns {Promise<any>} Datos de autenticación y tokens del usuario recién creado.
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDTO) {
    return await this.authService.registerUser(registerDto);
  }

  /**
   * Endpoint público para autenticar a un usuario mediante sus credenciales.
   * @param {LoginDTO} loginDto - Credenciales de acceso (correo y contraseña).
   * @returns {Promise<any>} Tokens de acceso y refresco junto con los datos del usuario.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDTO) {
    return await this.authService.loginUser(loginDto);
  }

  /**
   * Endpoint para renovar el token de acceso utilizando un refresh token válido.
   * @param {RefreshDTO} refreshDto - Objeto que contiene el token de refresco actual.
   * @returns {Promise<any>} Nuevos tokens de sesión.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshDto: RefreshDTO) {
    return await this.authService.validateRefreshToken(refreshDto.refreshToken);
  }

  /**
   * Endpoint para cerrar la sesión del usuario invalidando su refresh token.
   * @param {RefreshDTO} refreshDto - Objeto que contiene el token de refresco a revocar.
   * @returns {Promise<any>} Mensaje de confirmación de cierre de sesión exitoso.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() refreshDto: RefreshDTO) {
    return await this.authService.logout(refreshDto.refreshToken);
  }
}
