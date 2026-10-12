import {
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpToRpcExceptionFilter } from '../../src/filters/http-to-rpc-exception.filter';

describe('HttpToRpcExceptionFilter', () => {
  let filter: HttpToRpcExceptionFilter;
  // El filtro no usa el host, basta con un objeto vacío
  const host: any = {};

  beforeEach(() => {
    filter = new HttpToRpcExceptionFilter();
  });

  it('Debe convertir NotFoundException en un error RPC con status 404', async () => {
    const exception = new NotFoundException('User not found');

    await expect(firstValueFrom(filter.catch(exception, host))).rejects.toEqual(
      {
        message: 'User not found',
        error: 'Not Found',
        statusCode: 404,
      },
    );
  });

  it('Debe convertir UnauthorizedException en un error RPC con status 401', async () => {
    const exception = new UnauthorizedException('Invalid credentials');

    await expect(firstValueFrom(filter.catch(exception, host))).rejects.toEqual(
      {
        message: 'Invalid credentials',
        error: 'Unauthorized',
        statusCode: 401,
      },
    );
  });

  it('Debe envolver en un objeto la respuesta cuando es un string', async () => {
    const exception = new HttpException('Algo salió mal', HttpStatus.CONFLICT);

    await expect(firstValueFrom(filter.catch(exception, host))).rejects.toEqual(
      {
        message: 'Algo salió mal',
        statusCode: 409,
      },
    );
  });

  it('Debe conservar los mensajes de validación del ValidationPipe', async () => {
    const exception = new HttpException(
      {
        message: ['email must be an email'],
        error: 'Bad Request',
        statusCode: 400,
      },
      HttpStatus.BAD_REQUEST,
    );

    await expect(firstValueFrom(filter.catch(exception, host))).rejects.toEqual(
      {
        message: ['email must be an email'],
        error: 'Bad Request',
        statusCode: 400,
      },
    );
  });
});
