import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { UserSummary, UsersClient } from './users.client';

/** 
 * Estructura que representa el total monetario y la cantidad de ventas en un periodo de tiempo. 
*/
export interface SalesSummary {
  total: number;
  count: number;
}

/** 
 * Estructura completa del perfil del agricultor, incluyendo datos del usuario y resumen de ventas. 
*/
export interface Profile {
  user: UserSummary;
  sales: {
    week: SalesSummary;
    month: SalesSummary;
  };
}

/**
 * Servicio encargado de calcular las estadísticas de ventas (semanales y mensuales) 
 * y consolidarlas junto con la información del usuario obtenida del microservicio de usuarios.
 */
@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly usersClient: UsersClient,
  ) {}

  /**
   * Obtiene el perfil consolidado de un agricultor consultando sus datos por TCP 
   * y calculando las ventas de la semana y del mes a partir de los pedidos entregados.
   * @param {string} userId - Identificador único del agricultor.
   * @returns {Promise<Profile>} Objeto con perfil de usuario y métricas de ventas.
   */
  async getProfile(userId: string): Promise<Profile> {
    const [user, sales] = await Promise.all([
      this.usersClient.getUser(userId),
      this.orderRepository.find({
        where: { farmerId: userId, status: OrderStatus.ENTREGADO },
      }),
    ]);

    return {
      user,
      sales: {
        week: this.summarize(sales, this.startOfWeek()),
        month: this.summarize(sales, this.startOfMonth()),
      },
    };
  }

  /**
   * Filtra y suma las ventas entregadas a partir de una fecha de referencia específica.
   * @private
   * @param {Order[]} sales - Lista completa de pedidos entregados del agricultor.
   * @param {Date} since - Fecha límite inicial del periodo a evaluar.
   * @returns {SalesSummary} Resumen con el monto total acumulado y la cantidad de ventas.
   */
  private summarize(sales: Order[], since: Date): SalesSummary {
    const inPeriod = sales.filter((sale) => sale.updatedAt >= since);
    const total = inPeriod.reduce((sum, sale) => sum + sale.totalPrice, 0);
    return { total: Math.round(total * 100) / 100, count: inPeriod.length };
  }

  /**
   * Obtiene la fecha y hora correspondiente al Lunes de la semana actual a las 00:00.
   * @private
   * @returns {Date} Objeto Date del inicio de la semana.
   */
  private startOfWeek(): Date {
    const now = new Date();
    const daysSinceMonday = (now.getDay() + 6) % 7;
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysSinceMonday,
    );
  }

  /**
   * Obtiene la fecha y hora correspondiente al primer día del mes actual a las 00:00.
   * @private
   * @returns {Date} Objeto Date del inicio del mes.
   */
  private startOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
