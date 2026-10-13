import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '@app/shared';
import { OffertsService } from './offerts.service';
import { CreateOffertDto } from './dto/create-offert.dto';
import { UpdateOffertDto } from './dto/update-offert.dto';
import { Offert } from '../entities/offert.entity';

// El farmerId siempre sale del token (request.user.sub), nunca del body.
// Solo los usuarios con rol Agricultor pueden publicar y gestionar ofertas
@Controller('offerts')
export class OffertsController {
  constructor(private readonly offertsService: OffertsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async create(@Req() request, @Body() dto: CreateOffertDto): Promise<Offert> {
    return await this.offertsService.create(request.user.sub, dto);
  }

  // Público: los compradores ven las ofertas activas sin iniciar sesión
  @Get()
  async findAll(@Query('productId') productId?: string): Promise<Offert[]> {
    return await this.offertsService.findAll(productId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async findMine(@Req() request): Promise<Offert[]> {
    return await this.offertsService.findMine(request.user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async update(
    @Req() request,
    @Param('id') offertId: string,
    @Body() dto: UpdateOffertDto,
  ): Promise<Offert> {
    return await this.offertsService.update(offertId, request.user.sub, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async remove(@Req() request, @Param('id') offertId: string): Promise<Offert> {
    return await this.offertsService.remove(offertId, request.user.sub);
  }
}
