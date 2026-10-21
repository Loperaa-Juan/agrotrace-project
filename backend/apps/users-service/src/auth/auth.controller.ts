import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDTO } from './dto/register.dto';
import { LoginDTO } from './dto/login.dto';
import { RefreshDTO } from './dto/refresh.dto';

@Controller('auth')
/**
 * Controlador encargado de exponer los endpoints HTTP para la autenticación 
 * y gestión de sesiones (registro, login, actualización de tokens y cierre de sesión).
 */
export class AuthController {
  /**
   * Inyecta el servicio de autenticación para procesar la lógica de negocio.
   * @param {AuthService} authService - Servicio con la lógica de usuarios y tokens.
   */
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  /**
   * Endpoint público para registrar un nuevo usuario en la plataforma.
   * @param {RegisterDTO} registerDto - Datos obligatorios y de validación para el registro.
   * @returns {Promise<any>} Datos de autenticación y tokens del usuario recién creado.
   */
  async register(@Body() registerDto: RegisterDTO) {
    return await this.authService.registerUser(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  /**
   * Endpoint público para iniciar sesión mediante credenciales de acceso.
   * @param {LoginDTO} loginDto - Correo electrónico y contraseña del usuario.
   * @returns {Promise<any>} Tokens de acceso y refresco si las credenciales son correctas.
   */
  async login(@Body() loginDto: LoginDTO) {
    return await this.authService.loginUser(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  /**
   * Endpoint para rotar y actualizar el token de acceso utilizando un refresh token válido.
   * @param {RefreshDTO} refreshDto - Contiene la cadena del refresh token activo.
   * @returns {Promise<any>} Nuevos tokens de sesión.
   */
  async refresh(@Body() refreshDto: RefreshDTO) {
    return await this.authService.validateRefreshToken(refreshDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  /**
   * Endpoint para cerrar la sesión del usuario revocando su refresh token.
   * @param {RefreshDTO} refreshDto - Contiene el refresh token que se desea invalidar.
   * @returns {Promise<{ message: string }>} Mensaje de confirmación de cierre de sesión.
   */
  async logout(@Body() refreshDto: RefreshDTO) {
    return await this.authService.logout(refreshDto.refreshToken);
  }
}
