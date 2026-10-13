import {
  IsDateString,
  IsIn,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { MUNICIPIOS_PERMITIDOS } from './create-offert.dto';

// Mismas reglas que CreateOffertDto, pero todos los campos son opcionales.
// El productId no se puede cambiar: para otro producto se crea otra oferta
export class UpdateOffertDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsPositive({ message: 'El precio por unidad debe ser mayor a 0' })
  pricePerUnit?: number;

  @IsOptional()
  @IsPositive({ message: 'La cantidad disponible debe ser mayor a 0' })
  availableQuantity?: number;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de cosecha no es válida' })
  harvestDate?: string;

  @IsOptional()
  @IsIn(MUNICIPIOS_PERMITIDOS, {
    message: 'Por ahora solo se aceptan ofertas en Envigado',
  })
  municipality?: string;
}
