import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';
import { logger } from '@utils/logger';
import { RequestWithUser } from '@/interfaces/auth.interface';

const errorMiddleware = (error: HttpException, req: RequestWithUser, res: Response, next: NextFunction) => {
  try {
    const status: number = error.status || 500;
    const message: string = error.message || 'Something went wrong';
    logger.error(`[${req.method}] ${req.path} >> StatusCode:: ${status}, Message:: ${message}, Request ID:: ${req.requestId}, IP:: ${req.ip}, UserAgent:: ${req.headers['user-agent']} User :: ${req.user ? `${req.user.user.username} (${req.user._id})` : 'Not Logged In'}`);
    res.status(status).json({ status, message, path: req.path, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
};

export default errorMiddleware;
