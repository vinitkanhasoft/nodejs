import { Response, Request } from 'express';
import { IApiResponse, ISuccessResponse, IErrorResponse, IPaginatedResponse } from '../types';
import { HTTP_STATUS } from '../constants/status';

export class ResponseUtils {
  /**
   * Send success response
   */
  static success<T = any>(
    res: Response,
    data?: T,
    message: string = 'Operation successful',
    statusCode: typeof HTTP_STATUS.OK | typeof HTTP_STATUS.CREATED | typeof HTTP_STATUS.ACCEPTED = HTTP_STATUS.OK
  ): Response {
    const response: ISuccessResponse<T> = {
      success: true,
      message,
      data,
      statusCode,
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send created response
   */
  static created<T = any>(
    res: Response,
    data?: T,
    message: string = 'Resource created successfully'
  ): Response {
    return this.success(res, data, message, HTTP_STATUS.CREATED);
  }

  /**
   * Send no content response
   */
  static noContent(res: Response): Response {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string = 'Internal server error',
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errors?: any[]
  ): Response {
    const response: IErrorResponse = {
      success: false,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      ...(errors && { errors }),
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send bad request response
   */
  static badRequest(
    res: Response,
    message: string = 'Bad request',
    errors?: any[]
  ): Response {
    return this.error(res, message, HTTP_STATUS.BAD_REQUEST, errors);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized'
  ): Response {
    return this.error(res, message, HTTP_STATUS.UNAUTHORIZED);
  }

  /**
   * Send forbidden response
   */
  static forbidden(
    res: Response,
    message: string = 'Forbidden'
  ): Response {
    return this.error(res, message, HTTP_STATUS.FORBIDDEN);
  }

  /**
   * Send not found response
   */
  static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return this.error(res, message, HTTP_STATUS.NOT_FOUND);
  }

  /**
   * Send conflict response
   */
  static conflict(
    res: Response,
    message: string = 'Resource already exists'
  ): Response {
    return this.error(res, message, HTTP_STATUS.CONFLICT);
  }

  /**
   * Send too many requests response
   */
  static tooManyRequests(
    res: Response,
    message: string = 'Too many requests'
  ): Response {
    return this.error(res, message, HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  /**
   * Send paginated response
   */
  static paginated<T = any>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    },
    message: string = 'Data retrieved successfully'
  ): Response {
    const response: IPaginatedResponse<T> = {
      success: true,
      message,
      data,
      pagination,
      statusCode: HTTP_STATUS.OK,
      timestamp: new Date().toISOString(),
    };

    return res.status(HTTP_STATUS.OK).json(response);
  }

  /**
   * Send validation error response
   */
  static validationError(
    res: Response,
    errors: Array<{
      field: string;
      message: string;
      code?: string;
      value?: any;
    }>
  ): Response {
    return this.badRequest(res, 'Validation failed', errors);
  }

  /**
   * Send server error response
   */
  static serverError(
    res: Response,
    message: string = 'Internal server error'
  ): Response {
    return this.error(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  /**
   * Send service unavailable response
   */
  static serviceUnavailable(
    res: Response,
    message: string = 'Service unavailable'
  ): Response {
    return this.error(res, message, HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  /**
   * Send accepted response
   */
  static accepted<T = any>(
    res: Response,
    data?: T,
    message: string = 'Request accepted'
  ): Response {
    return this.success(res, data, message, HTTP_STATUS.ACCEPTED);
  }

  /**
   * Send partial content response
   */
  static partialContent<T = any>(
    res: Response,
    data?: T,
    message: string = 'Partial content'
  ): Response {
    const response: IApiResponse<T> = {
      success: true,
      message,
      data,
      statusCode: HTTP_STATUS.PARTIAL_CONTENT,
      timestamp: new Date().toISOString(),
    };
    return res.status(HTTP_STATUS.PARTIAL_CONTENT).json(response);
  }

  /**
   * Send not implemented response
   */
  static notImplemented(
    res: Response,
    message: string = 'Not implemented'
  ): Response {
    return this.error(res, message, HTTP_STATUS.NOT_IMPLEMENTED);
  }

  /**
   * Send bad gateway response
   */
  static badGateway(
    res: Response,
    message: string = 'Bad gateway'
  ): Response {
    return this.error(res, message, HTTP_STATUS.BAD_GATEWAY);
  }

  /**
   * Send gateway timeout response
   */
  static gatewayTimeout(
    res: Response,
    message: string = 'Gateway timeout'
  ): Response {
    return this.error(res, message, HTTP_STATUS.GATEWAY_TIMEOUT);
  }

  /**
   * Send file download response
   */
  static fileDownload(
    res: Response,
    buffer: Buffer,
    filename: string,
    contentType: string
  ): Response {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  }

  /**
   * Send file stream response
   */
  static fileStream(
    res: Response,
    stream: any,
    filename: string,
    contentType: string
  ): Response {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return stream.pipe(res);
  }

  /**
   * Send redirect response
   */
  static redirect(res: Response, url: string, statusCode: number = HTTP_STATUS.FOUND): void {
    res.redirect(statusCode, url);
  }

  /**
   * Send health check response
   */
  static healthCheck(
    res: Response,
    data: any,
    status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'
  ): Response {
    const response = {
      status,
      timestamp: new Date().toISOString(),
      ...data,
    };

    const statusCode = status === 'healthy' ? HTTP_STATUS.OK : 
                      status === 'degraded' ? HTTP_STATUS.OK : 
                      HTTP_STATUS.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json(response);
  }

  /**
   * Send rate limit response
   */
  static rateLimit(
    res: Response,
    retryAfter: number,
    message: string = 'Rate limit exceeded'
  ): Response {
    res.setHeader('Retry-After', retryAfter.toString());
    return this.tooManyRequests(res, message);
  }

  /**
   * Send cached response
   */
  static cached<T = any>(
    res: Response,
    data: T,
    maxAge: number = 3600,
    message: string = 'Data retrieved from cache'
  ): Response {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    return this.success(res, data, message);
  }

  /**
   * Send streaming response
   */
  static streaming(
    res: Response,
    stream: any,
    contentType: string = 'application/octet-stream'
  ): Response {
    res.setHeader('Content-Type', contentType);
    return stream.pipe(res);
  }

  /**
   * Send SSE (Server-Sent Events) response
   */
  static sse(res: Response): any {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    return {
      send: (data: any, event?: string) => {
        let message = '';
        if (event) message += `event: ${event}\n`;
        message += `data: ${JSON.stringify(data)}\n\n`;
        res.write(message);
      },
      close: () => {
        res.end();
      },
    };
  }

  /**
   * Send websocket upgrade response
   */
  static websocket(res: Response): void {
    res.setHeader('Upgrade', 'websocket');
    res.setHeader('Connection', 'Upgrade');
  }

  /**
   * Send conditional response (based on ETag)
   */
  static conditional<T = any>(
    req: Request,
    res: Response,
    data: T,
    etag: string,
    message: string = 'Data retrieved successfully'
  ): Response {
    res.setHeader('ETag', etag);
    
    const ifNoneMatch = req.headers['if-none-match'] as string;
    if (ifNoneMatch === etag) {
      return res.status(HTTP_STATUS.NOT_MODIFIED).send();
    }
    
    return this.success(res, data, message);
  }
}
