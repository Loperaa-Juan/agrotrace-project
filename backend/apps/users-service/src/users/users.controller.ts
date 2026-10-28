import {
  applyDecorators,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@app/shared';
import { AuthUserDto } from '../auth/dto/auth-response.dto';

/** Documentación común de las rutas de la cuenta propia: piden token y pueden responder 401. */
const ownAccountDocs = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' }),
  );

/**
 * Controlador encargado de gestionar las rutas HTTP y los mensajes RPC (microservicios)
 * relacionados con las operaciones de consulta y administración de usuarios.
 */
@ApiTags('users')
@Controller('users')
export class UsersController {
  /**
   * Inyecta el servicio de usuarios para procesar la lógica de negocio y consultas a la base de datos.
   * @param usersService - Servicio que contiene la lógica para manejar los usuarios.
   */
  constructor(private readonly usersService: UsersService) {}

  /**
   * Endpoint HTTP protegido para obtener el perfil del usuario autenticado actual.
   * @param request - Objeto de petición HTTP que contiene la información del usuario decodificada por el guard.
   * @returns La entidad del usuario encontrado.
   * @throws `NotFoundException` Si el usuario no existe en la base de datos.
   */
  @ApiOperation({ summary: 'Consulta el perfil del usuario autenticado' })
  @ownAccountDocs()
  @ApiOkResponse({
    description: 'Datos públicos del usuario',
    type: AuthUserDto,
  })
  @ApiNotFoundResponse({ description: 'El usuario ya no existe' })
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() request) {
    const user = await this.usersService.getUserById(request.user.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Endpoint HTTP protegido para eliminar la cuenta del usuario autenticado actual.
   * @param request - Objeto de petición HTTP con los datos del usuario logueado.
   * @returns   */
  @ApiOperation({ summary: 'Elimina la cuenta del usuario autenticado' })
  @ownAccountDocs()
  @ApiNoContentResponse({ description: 'Cuenta eliminada' })
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@Req() request) {
    await this.usersService.deleteUser(request.user.sub);
  }

  /**
   * Patrón de mensaje RPC para obtener una lista paginada de usuarios.
   * @param data - Datos de paginación opcionales: `page` (número de página actual, por defecto `1`) y `limit` (registros por página, por defecto `10`).
   * @returns Lista de usuarios.
   */
  @MessagePattern('get_users')
  async getAllUsers(@Payload() data: { page?: number; limit?: number }) {
    const { page = 1, limit = 10 } = data;

    return await this.usersService.getUsers(page, limit);
  }

  /**
   * Patrón de mensaje RPC para buscar un usuario específico por su identificador único.
   * @param data - Objeto con el ID del usuario (`userId`).
   * @returns La entidad del usuario encontrado.
   */
  @MessagePattern('get_user_by_id')
  async getUserById(@Payload() data: { userId: string }) {
    return await this.usersService.getUserById(data.userId);
  }

  /**
   * Patrón de mensaje RPC para obtener los detalles del usuario actual mediante su ID.
   * @param data - Objeto con el ID del usuario actual (`userId`).
   * @returns La entidad del usuario.
   */
  @MessagePattern('get_current_user')
  async getCurrentUser(@Payload() data: { userId: string }) {
    return await this.usersService.getUserById(data.userId);
  }

  /**
   * Patrón de mensaje RPC para verificar si un usuario existe en el sistema.
   * @param userId - Identificador único del usuario a verificar.
   * @returns Verdadero si el usuario existe, falso en caso contrario.
   */
  @MessagePattern('user_exists')
  async userExists(@Payload() userId: string) {
    return await this.usersService.userExists(userId);
  }
}
