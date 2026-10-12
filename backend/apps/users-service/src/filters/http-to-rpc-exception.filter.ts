import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Catch(HttpException)
export class HttpToRpcExceptionFilter extends BaseRpcExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): Observable<any> {
    const response = exception.getResponse();
    const error =
      typeof response === 'object'
        ? { ...response, statusCode: exception.getStatus() }
        : { message: response, statusCode: exception.getStatus() };

    return super.catch(new RpcException(error), host);
  }
}
