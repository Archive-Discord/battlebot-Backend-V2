import { RequestWithUser } from '@/interfaces/auth.interface';
import PaymentsService from '@/services/payments.service';
import ResponseWrapper from '@/utils/responseWrapper';
import { NextFunction, Response } from 'express';

class PaymentsController {
  public paymentsService = new PaymentsService();

  public addOrder = async(req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const addOrder = await this.paymentsService.addNewOrder(req)
      ResponseWrapper(req, res, {data: addOrder})
    } catch (error) {
      next(error);
    }
  };
  
  public getOrder = async(req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const getOrder = await this.paymentsService.getOrder(req)
      ResponseWrapper(req, res, {data: getOrder})
    } catch (error) {
      next(error);
    }
  };

  public getSuccessOrder = async(req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const getSuccessOrder = await this.paymentsService.getSuccessOrder(req)
      ResponseWrapper(req, res, {data: getSuccessOrder})
    } catch (error) {
      next(error);
    }
  };

  public getTargetOrder = async(req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const getTargetOrder = await this.paymentsService.getTargetOrder(req)
      ResponseWrapper(req, res, {data: getTargetOrder})
    } catch (error) {
      next(error);
    }
  };

  public getSuccessOrderCultureland = async(req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const getSuccessOrderCultureland = await this.paymentsService.getSuccessOrderCultureland(req)
      ResponseWrapper(req, res, {data: getSuccessOrderCultureland})
    } catch (error) {
      next(error);
    }
  };

  public readyOrderKakaopay = async(req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const readyOrderKakaopay = await this.paymentsService.readyOrderKakaopay(req)
      ResponseWrapper(req, res, {data: readyOrderKakaopay})
    } catch (error) {
      next(error);
    }
  };

  public getSuccessOrderKakaopay = async(req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const successOrderKakaopay = await this.paymentsService.successOrderKakaopay(req)
      ResponseWrapper(req, res, {data: successOrderKakaopay})
    } catch (error) {
      next(error);
    }
  };

  public getPaymentsAuth = async(req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const getPayementsAuth = await this.paymentsService.getPayementsAuth(req)
      ResponseWrapper(req, res, {data: getPayementsAuth})
    } catch (error) {
      next(error);
    }
  };

  public getPaymentsMethods = async(req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const getPaymentsMethods = await this.paymentsService.getPaymentsMethods(req)
      ResponseWrapper(req, res, {data: getPaymentsMethods})
    } catch (error) {
      next(error);
    }
  };

  public getSubscribes = async(req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const getSubscribes = await this.paymentsService.getSubscribes(req)
      ResponseWrapper(req, res, {data: getSubscribes})
    } catch (error) {
      next(error);
    }
  };

  public payMethodChange = async(req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const methodChange = await this.paymentsService.methodChange(req)
      ResponseWrapper(req, res, {data: methodChange})
    } catch (error) {
      next(error);
    }
  };

  public payAutopayChange = async(req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const autopayChange = await this.paymentsService.autopayChange(req)
      ResponseWrapper(req, res, {data: autopayChange})
    } catch (error) {
      next(error);
    }
  };

  public confirmPayment = async(req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const confirmPayment = await this.paymentsService.confirmPayment(req)
      ResponseWrapper(req, res, {data: confirmPayment})
    } catch (error) {
      next(error);
    }
  };
}

export default PaymentsController;
