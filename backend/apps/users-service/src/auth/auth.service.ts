import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { MoreThan, Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { JwtService } from '@nestjs/jwt';
import { RegisterDTO } from './dto/register.dto';
import { AuthResponseDto, toAuthUserDto } from './dto/auth-response.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { LoginDTO } from './dto/login.dto';

@Injectable()
/**
 * Servicio encargado de gestionar la lógica de negocio de autenticación y usuarios,
 * incluyendo registro, inicio de sesión, generación y validación de tokens JWT y de refresco.
 */
export class AuthService {
  /**
   * Inyecta los repositorios de base de datos y servicios necesarios para la autenticación.
   * @param {Repository<User>} userRepository - Repositorio para gestionar las entidades de usuario.
   * @param {Repository<RefreshToken>} refreshTokenRepository - Repositorio para gestionar los tokens de refresco.
   * @param {JwtService} jwtService - Servicio de NestJS para la firma y verificación de JSON Web Tokens.
   */
  constructor(
    // Inyectamos los repositorios (Entidades a ser guardadas en la BD)
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,

    // Inyectamos el servicio para trabajar con los JWT
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registra un nuevo usuario en la plataforma, validando que el correo no esté previamente registrado,
   * aplicando cifrado a la contraseña y generando su sesión inicial.
   * @param {RegisterDTO} registerDto - Objeto con los datos obligatorios y opcionales del nuevo usuario.
   * @returns {Promise<AuthResponseDto>} Retorna los tokens de acceso y los datos públicos del usuario registrado.
   */
  async registerUser(registerDto: RegisterDTO): Promise<AuthResponseDto> {
    const {
      name,
      phone,
      role,
      documentType,
      documentNumber,
      address,
      email,
      municipality,
      password,
    } = registerDto;

    // Validamos que el usuario no esté registrado en Agrotrace
    const user = await this.userRepository.findOne({
      where: {
        email,
      },
    });

    if (user) {
      throw new ConflictException('A user with this email already exists.');
    }

    const hashedPassword = await this.hashPassword(password);

    const newUser = this.userRepository.create({
      name: name,
      phone: phone,
      role: role,
      documentType: documentType,
      documentNumber: documentNumber,
      address: address,
      email: email,
      municipality: municipality,
      password: hashedPassword,
    });

    await this.userRepository.save(newUser);
    return this.generateAuthResponse(newUser);
  }

  /**
   * Autentica a un usuario validando sus credenciales de correo electrónico y contraseña.
   * @param {LoginDTO} loginDto - Credenciales de acceso (email y contraseña).
   * @returns {Promise<AuthResponseDto>} Retorna una nueva respuesta de autenticación con los tokens de sesión.
   */
  async loginUser(loginDto: LoginDTO): Promise<AuthResponseDto> {
    // Para el login solo se pide email y contraseña
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      throw new UnauthorizedException(`Invalid email or password`);
    }

    // Validamos que la contraseña sea la correcta
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(`Invalid email or password`);
    }

    return this.generateAuthResponse(user);
  }

  // Logout del usuario (cerrar sesión)
  async logout(refreshToken: string): Promise<{ message: string }> {
    // Revocamos el refresh token
    await this.revokeRefreshToken(refreshToken);
    return { message: 'Logged out successfully' };
  }

  /**
   * Valida un refresh token, realiza la rotación del mismo (revoca el usado y emite uno nuevo) 
   * y retorna una nueva respuesta de autenticación para el usuario.
   * @param {string} token - Cadena del token de refresco actual.
   * @returns {Promise<AuthResponseDto>} Nuevos tokens de acceso y refresco junto con los datos del usuario.
   */
  async validateRefreshToken(token: string): Promise<AuthResponseDto> {
    // En la BD está guardado el hash, no el token
    const storedToken = await this.refreshTokenRepository.findOne({
      where: {
        token: this.hashRefreshToken(token),
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revocamos de forma atómica: si dos peticiones usan el mismo token a la vez,
    // solo una lo logra y la otra es rechazada
    const result = await this.refreshTokenRepository.update(
      { id: storedToken.id, isRevoked: false },
      { isRevoked: true },
    );

    if (!result.affected) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Encontramos el usuario al que pertenece el token
    const user = await this.userRepository.findOne({
      where: {
        userId: storedToken.userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateAuthResponse(user);
  }

  /**
   * Valida la autenticidad y vigencia de un Access Token utilizando el servicio JWT.
   * @param {string} token - El token de acceso en formato JWT enviado por el cliente.
   * @returns {Promise<any>} El payload decodificado con la información interna del usuario (id, email, rol).
   */
  async validateAccessToken(token: string): Promise<any> {
    const payload = this.jwtService.verify(token);
    return payload;
  }

  /**
   * Marca un refresh token específico como revocado en la base de datos.
   * @param {string} token - El token de refresco que se quiere invalidar.
   * @returns {Promise<any>} Objeto de confirmación de éxito.
   */
  async revokeRefreshToken(token: string): Promise<any> {
    const isToken = await this.refreshTokenRepository.findOne({
      where: { token: this.hashRefreshToken(token) },
    });

    if (!isToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    isToken.isRevoked = true;
    await this.refreshTokenRepository.save(isToken);

    return { success: true };
  }

  /**
   * Aplica un algoritmo de cifrado (hashing) a la contraseña del usuario por seguridad.
   * @private
   * @param {string} password - Contraseña en texto plano.
   * @returns {Promise<string>} Contraseña cifrada con hash y sal.
   */
  private hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Genera la respuesta de autenticación estándar que incluye los tokens y los datos públicos.
   * @private
   * @param {User} user - Entidad del usuario autenticado.
   * @returns {Promise<AuthResponseDto>} Objeto con access token, refresh token y perfil público.
   */
  private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken();

    // En la BD solo guardamos el hash
    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: this.hashRefreshToken(refreshToken),
      userId: user.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken,
      user: toAuthUserDto(user),
    };
  }

  /**
   * Genera un nuevo Access Token en formato JWT con los datos principales del usuario.
   * @private
   * @param {User} user - Entidad del usuario.
   * @returns {string} Token JWT firmado.
   */
  private generateAccessToken(user: User): string {
    return this.jwtService.sign({
      sub: user.userId,
      email: user.email,
      role: user.role,
    });
  }

  /**
   * Crea un hash SHA-256 seguro para almacenar el refresh token de forma protegida en la base de datos.
   * @private
   * @param {string} token - Token de refresco en texto plano.
   * @returns {string} Hash hexadecimal del token.
   */
  private hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Genera una cadena aleatoria criptográficamente segura para usar como refresh token.
   * @private
   * @returns {string} Token aleatorio en formato hexadecimal.
   */
  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
