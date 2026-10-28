import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { Observable } from 'rxjs';

/**
 * Filtro de excepciones encargado de interceptar errores HTTP (`HttpException`)
 * y transformarlos en excepciones compatibles con microservicios RPC (`RpcException`).
 * Permite que los errores de validación o negocio viajen correctamente entre servicios.
 */
@Catch(HttpException)
export class HttpToRpcExceptionFilter extends BaseRpcExceptionFilter {
  /**
   * Captura la excepción HTTP lanzada, extrae su respuesta y estatus,
   * y la reenvuelve como una RpcException para mantener la compatibilidad en el transporte.
   * @param exception - La excepción HTTP original capturada en la ejecución.
   * @param host - Objeto que encapsula los argumentos del contexto de ejecución actual.
   * @returns Un observable que maneja la excepción transformada mediante el filtro base RPC.
   */
  catch(exception: HttpException, host: ArgumentsHost): Observable<any> {
    const response = exception.getResponse();
    const error =
      typeof response === 'object'
        ? { ...response, statusCode: exception.getStatus() }
        : { message: response, statusCode: exception.getStatus() };

    return super.catch(new RpcException(error), host);
  }
}
