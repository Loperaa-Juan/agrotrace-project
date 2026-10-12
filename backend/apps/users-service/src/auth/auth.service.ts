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
export class AuthService {
  constructor(
    // Inyectamos los repositorios (Entidades a ser guardadas en la BD)
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,

    // Inyectamos el servicio para trabajar con los JWT
    private readonly jwtService: JwtService,
  ) {}

  // Función para registrar un usuario nuevo
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

  // Función para el login del usuario
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

  // Valida el refresh token y lo rota: el usado se revoca y se emite uno nuevo
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

  // Función para validar el access token de un usuario
  async validateAccessToken(token: string): Promise<any> {
    const payload = this.jwtService.verify(token);
    return payload;
  }

  // Función para revocar el refresh token del usuario
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

  // Función para crear el hash de la contraseña
  private hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  // Función para generar la respuesta que recibe el cliente después de autenticarse
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

  // La expiración se toma de JWT_EXPIRES_IN (configurado en JwtModule)
  private generateAccessToken(user: User): string {
    return this.jwtService.sign({
      sub: user.userId,
      email: user.email,
      role: user.role,
    });
  }

  // Función para hashear el refresh token
  private hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Función para generar el refresh token
  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
