import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { UserSummary, UsersClient } from './users.client';

/** Resumen monetario y conteo de ventas en un periodo de tiempo. */
export interface SalesSummary {
  total: number;
  count: number;
}

/** Estructura del perfil consolidado del agricultor. */
export interface Profile {
  user: UserSummary;
  sales: {
    week: SalesSummary;
    month: SalesSummary;
  };
}

/**
 * Servicio encargado de calcular las estadísticas de ventas y unirlas con los datos de usuario.
 */
@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly usersClient: UsersClient,
  ) {}

  /**
   * Obtiene el perfil de un agricultor consolidando su información personal y sus ventas de la semana y mes.
   * @param {string} userId - ID del agricultor.
   * @returns {Promise<Profile>} Perfil y métricas de ventas.
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
   * Suma las ventas entregadas a partir de una fecha específica.
   * @private
   * @param {Order[]} sales - Lista de órdenes entregadas.
   * @param {Date} since - Fecha inicial del periodo.
   * @returns {SalesSummary} Resumen de ventas.
   */
  private summarize(sales: Order[], since: Date): SalesSummary {
    const inPeriod = sales.filter((sale) => sale.updatedAt >= since);
    const total = inPeriod.reduce((sum, sale) => sum + sale.totalPrice, 0);
    return { total: Math.round(total * 100) / 100, count: inPeriod.length };
  }

  /**
   * Obtiene la fecha del Lunes de la semana actual a las 00:00.
   * @private
   * @returns {Date} Inicio de la semana.
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
   * Obtiene la fecha del primer día del mes actual a las 00:00.
   * @private
   * @returns {Date} Inicio del mes.
   */
  private startOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
