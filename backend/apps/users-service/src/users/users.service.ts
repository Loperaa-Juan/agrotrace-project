import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AuthUserDto, toAuthUserDto } from '../auth/dto/auth-response.dto';

@Injectable()
/**
 * Servicio encargado de gestionar la lógica de negocio y las operaciones de base de datos
 * para los usuarios, incluyendo paginación, consultas por ID, verificación de existencia y eliminación.
 */
export class UsersService {
  /**
   * Inyecta el repositorio de TypeORM para interactuar con la entidad de usuarios.
   * @param {Repository<User>} userRepository - Repositorio de la entidad User.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Obtiene una lista paginada de usuarios ordenada por fecha de creación descendente.
   * @param {number} [page=1] - Número de la página actual.
   * @param {number} [limit=10] - Cantidad de registros por página.
   * @returns {Promise<Object>} Objeto con los datos de los usuarios mapeados y metadatos de paginación.
   */
  async getUsers(page = 1, limit = 10) {
    const [users, usersCount] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: users.map(toAuthUserDto),
      meta: {
        total: usersCount,
        page,
        limit,
        totalPages: Math.ceil(usersCount / limit),
      },
    };
  }

  /**
   * Busca un usuario específico por su identificador único y retorna su DTO público.
   * @param {string} id - Identificador único del usuario (UUID).
   * @returns {Promise<AuthUserDto | null>} El DTO del usuario si existe, o null en caso contrario.
   */
  async getUserById(id: string): Promise<AuthUserDto | null> {
    const user = await this.userRepository.findOne({
      where: { userId: id },
    });
    return user ? toAuthUserDto(user) : null;
  }

  /**
   * Verifica de forma eficiente si un usuario existe en la base de datos según su ID.
   * @param {string} id - Identificador único del usuario a verificar.
   * @returns {Promise<boolean>} Verdadero si el usuario existe, de lo contrario falso.
   */
  async userExists(id: string): Promise<boolean> {
    return this.userRepository.exists({ where: { userId: id } });
  }

  /**
   * Realiza un borrado físico de un usuario de la base de datos por su ID.
   * Los refresh tokens asociados se eliminan en cascada.
   * @param {string} id - Identificador único del usuario que se va a eliminar.
   * @returns {Promise<void>}
   * @throws {NotFoundException} Si no se encuentra ningún usuario con el ID especificado.
   */
  // Borrado físico: los refresh tokens del usuario se eliminan en cascada
  async deleteUser(id: string): Promise<void> {
    const result = await this.userRepository.delete({ userId: id });
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }
}
