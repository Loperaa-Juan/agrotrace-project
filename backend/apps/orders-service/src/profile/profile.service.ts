import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { UserSummary, UsersClient } from './users.client';

// Total vendido y número de ventas en un periodo
export interface SalesSummary {
  total: number;
  count: number;
}

export interface Profile {
  user: UserSummary;
  sales: {
    week: SalesSummary;
    month: SalesSummary;
  };
}

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly usersClient: UsersClient,
  ) {}

  // Una venta es un pedido Entregado; su fecha es la de entrega (updatedAt)
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

  // Suma las ventas entregadas desde la fecha indicada
  private summarize(sales: Order[], since: Date): SalesSummary {
    const inPeriod = sales.filter((sale) => sale.updatedAt >= since);
    const total = inPeriod.reduce((sum, sale) => sum + sale.totalPrice, 0);
    return { total: Math.round(total * 100) / 100, count: inPeriod.length };
  }

  // Lunes de esta semana a las 00:00
  private startOfWeek(): Date {
    const now = new Date();
    const daysSinceMonday = (now.getDay() + 6) % 7;
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysSinceMonday,
    );
  }

  // Día 1 de este mes a las 00:00
  private startOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}
