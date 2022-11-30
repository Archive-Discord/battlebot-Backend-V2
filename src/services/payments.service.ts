import {
  autopay,
  confirmPayment,
  methodChange,
  newPayments,
  PaymentsGift,
  PaymentsKakaoPay,
  PaymentsKakaoPayApprove,
} from "@/dtos/payments.dto";
import { HttpException } from "@/exceptions/HttpException";
import { RequestWithUser } from "@/interfaces/auth.interface";
import paymentsModel from "@/models/payments.model";
import sellItemModel from "@/models/products.model";
import userModel from "@/models/users.model";
import { client } from "@/utils/discord";
import {
  kakaoPaymentsClient,
  tossClient,
  tossPaymentsClient,
  tossRefreshToken,
} from "@/utils/payments";
import { randomUUID } from "crypto";
import type {
  AccountMethod,
  CardMethod,
  Methods,
} from "@tosspayments/brandpay-types";
import {
  Payments,
  PaymentsMethods,
  targetType,
} from "@/interfaces/payments.interface";
import { guildPremiumHanler, premiumGuildCheck } from "@/utils/premium";
import premiumGuildModel from "@/models/premiumGuild.model";
import premiumUserModel from "@/models/premiumUser.model";
import qs from "qs";
import { Request } from "express";
import { FRONT_REDIRECT_URL } from "@/config";
import billingsModel from "@/models/billings.model";
import paymentsTossMethodsModel from "@/models/tossmethods.model";
import productsModel from "@/models/products.model";

class PaymentsService {
  public async getPayementsAuth(req: RequestWithUser): Promise<any> {
    const { code, customerKey } = req.query;
    if (!code) throw new HttpException(400, req.t("notNeedParams"));
    if (!customerKey) throw new HttpException(400, req.t("notNeedParams"));
    if (req.user.id !== customerKey)
      throw new HttpException(401, req.t("auth.unauthorization"));
    const authData = await tossClient(
      "POST",
      "/v1/brandpay/authorizations/access-token",
      {
        grantType: "AuthorizationCode",
        code,
        customerKey,
      }
    );
    await userModel.updateOne(
      { id: req.user.id },
      {
        $set: {
          toss_accessToken: authData.data.accessToken,
          toss_refreshToken: authData.data.refreshToken,
          toss_tokenType: authData.data.tokenType,
        },
      }
    );
    if (authData.error)
      throw new HttpException(
        401,
        authData.message ? authData.message : req.t("auth.unauthorization")
      );
    return authData;
  }

  public async getPaymentsMethods(req: RequestWithUser): Promise<any> {
    let tossMethodsData = await tossClient(
      "GET",
      "/v1/brandpay/payments/methods",
      null,
      req.user.toss_accessToken as string
    );
    if (tossMethodsData.data.code === "INVALID_ACCESS_TOKEN") {
      const refreshToken = await tossRefreshToken(req.user);
      if (!refreshToken)
        throw new HttpException(401, req.t("auth.unauthorization"));
      tossMethodsData = await tossClient(
        "GET",
        "/v1/brandpay/payments/methods",
        null,
        refreshToken.accessToken as string
      );
    }
    if (tossMethodsData.error)
      throw new HttpException(
        401,
        tossMethodsData.message
          ? tossMethodsData.message
          : req.t("auth.unauthorization")
      );
    const methodsData: Methods = tossMethodsData.data;
    const methods: PaymentsMethods[] = [];
    await Promise.all(
      methodsData.accounts.map(
        async (account: AccountMethod & { methodKey: string }) => {
          const paymentsTossMethod = await paymentsTossMethodsModel.findOne({
            userId: req.user.id,
            methodId: account.id,
          });
          if (!paymentsTossMethod) {
            const aymentsTossMethodDB = new paymentsTossMethodsModel({
              userId: req.user.id,
              methodId: account.id,
              methodKey: account.methodKey,
            });
            await aymentsTossMethodDB.save();
          }
          return methods.push({
            type: "account",
            accountName: account.accountName,
            accountNumber: account.accountNumber,
            id: account.id,
            iconUrl: account.iconUrl,
            select: methodsData.selectedMethodId === account.id ? true : false,
          });
        }
      )
    );
    await Promise.all(
      methodsData.cards.map(
        async (card: CardMethod & { methodKey: string }) => {
          const paymentsTossMethod = await paymentsTossMethodsModel.findOne({
            userId: req.user.id,
            methodId: card.id,
          });
          if (!paymentsTossMethod) {
            const aymentsTossMethodDB = new paymentsTossMethodsModel({
              userId: req.user.id,
              methodId: card.id,
              methodKey: card.methodKey,
            });
            await aymentsTossMethodDB.save();
          }
          return methods.push({
            type: "card",
            cardName: card.cardName,
            cardNumber: card.cardNumber,
            cardType: card.cardType,
            id: card.id,
            iconUrl: card.iconUrl,
            select: methodsData.selectedMethodId === card.id ? true : false,
          });
        }
      )
    );
    return methods;
  }

  public async confirmPayment(req: RequestWithUser): Promise<boolean> {
    const { amount, orderId, paymentKey, phone, methodId } =
      req.body as confirmPayment;
    const confirmData = await tossClient("POST", `/v1/payments/${paymentKey}`, {
      orderId,
      amount,
    });
    if (confirmData.error)
      throw new HttpException(
        confirmData.status ? confirmData.status : 500,
        confirmData.message ? confirmData.message : req.t("payments.error")
      );
    const payments = await paymentsModel.findOne({ orderId });
    await userModel.updateOne({ id: req.user.id }, { $set: { phone } });
    await paymentsModel.updateOne(
      { orderId },
      { $set: { payment: confirmData.data, process: "success" } }
    );
    if (payments.type === "guild") {
      await guildPremiumHanler(payments.target, payments.item, req.user.id, {
        amount: confirmData.data.totalAmount,
        method: confirmData.data.method,
      });
    }
    const method = await paymentsTossMethodsModel.findOne({
      userId: req.user.id,
      methodId,
    });
    await this.updateBilling(orderId, req, "tosspayments", method.methodKey);
    return true;
  }

  public async getSuccessOrderCultureland(req: RequestWithUser): Promise<any> {
    const { orderId, amount, paymentKey, phone } = req.body as PaymentsGift;
    const payments = await paymentsModel.findOne({
      orderId: orderId,
    });
    if (!payments)
      throw new HttpException(404, req.t("payments.notFoundOrder"));
    if (payments.process === "success")
      throw new HttpException(409, req.t("payments.alreadySuccessOrder"));
    const orderCulturelandData = await tossPaymentsClient(
      "POST",
      `/v1/payments/confirm`,
      {
        orderId,
        amount,
        paymentKey,
      }
    );
    if (orderCulturelandData.error) {
      throw new HttpException(
        orderCulturelandData.status ? orderCulturelandData.status : 500,
        orderCulturelandData.message
          ? orderCulturelandData.message
          : req.t("payments.error")
      );
    }
    if (!req.user.phone) {
      await userModel.updateOne({ id: req.user.id }, { $set: { phone } });
    }
    await paymentsModel.updateOne(
      { orderId },
      { $set: { payment: orderCulturelandData.data, process: "success" } }
    );
    if (payments.type == "guild") {
      await guildPremiumHanler(payments.target, payments.item, req.user.id, {
        amount: orderCulturelandData.data.totalAmount,
        method: orderCulturelandData.data.method,
      });
    }
    const paymentsMeta = await this.getTossPaymentsMetadata(orderId, req);
    return paymentsMeta;
  }

  public async successOrderKakaopay(req: RequestWithUser): Promise<any> {
    const { orderId, pg_token, phone } = req.body as PaymentsKakaoPayApprove;
    const payments = await paymentsModel.findOne({
      orderId: orderId,
    });
    if (!payments)
      throw new HttpException(404, req.t("payments.notFoundOrder"));
    if (payments.process === "success")
      throw new HttpException(409, req.t("payments.alreadySuccessOrder"));
    if (!payments.kakaoReadyPayments.tid)
      throw new HttpException(404, req.t("payments.notFoundOrder"));
    const approveKakaopayData = await kakaoPaymentsClient(
      "POST",
      `/v1/payment/approve`,
      qs.stringify({
        cid: "TCSUBSCRIP",
        partner_order_id: orderId,
        partner_user_id: req.user.id,
        tid: payments.kakaoReadyPayments.tid,
        pg_token,
      }),
      {
        "content-type": "application/x-www-form-urlencoded",
      }
    );
    if (approveKakaopayData.error) {
      throw new HttpException(
        approveKakaopayData.status ? approveKakaopayData.status : 500,
        approveKakaopayData.data.msg
          ? approveKakaopayData.data.msg
          : req.t("payments.error")
      );
    }
    if (!req.user.phone) {
      await userModel.updateOne({ id: req.user.id }, { $set: { phone } });
    }
    await paymentsModel.updateOne(
      {
        orderId: orderId,
      },
      { $set: { kakaoPayments: approveKakaopayData.data, process: "success" } }
    );
    if (payments.type == "guild") {
      await guildPremiumHanler(payments.target, payments.item, req.user.id, {
        amount: approveKakaopayData.data.amount.total,
        method:
          approveKakaopayData.data.payment_method_type === "CARD"
            ? "카카오페이 카드"
            : "카카오페이 계좌",
      });
    }
    await this.updateBilling(
      orderId,
      req,
      "kakaopay",
      approveKakaopayData.data.sid
    );
    const paymentsMeta = await this.getKakaoPaymentsMetadata(orderId, req);
    return paymentsMeta;
  }

  public async readyOrderKakaopay(req: RequestWithUser): Promise<any> {
    const { orderId, amount, phone } = req.body as PaymentsKakaoPay;
    const payments = await paymentsModel.findOne({
      orderId: orderId,
    });
    if (!payments)
      throw new HttpException(404, req.t("payments.notFoundOrder"));
    if (payments.process === "success")
      throw new HttpException(409, req.t("payments.alreadySuccessOrder"));
    const readyKakaopayData = await kakaoPaymentsClient(
      "POST",
      `/v1/payment/ready`,
      qs.stringify({
        cid: "TCSUBSCRIP",
        partner_order_id: orderId,
        partner_user_id: req.user.id,
        item_name: payments.name,
        quantity: 1,
        total_amount: Number(amount),
        tax_free_amount: 0,
        approval_url:
          FRONT_REDIRECT_URL +
          `/payments/kakaopay?orderId=${orderId}&phone=${phone}`,
        cancel_url: FRONT_REDIRECT_URL + `/payments/${orderId}`,
        fail_url: FRONT_REDIRECT_URL + `/payments/${orderId}`,
      }),
      {
        "content-type": "application/x-www-form-urlencoded",
      }
    );
    if (readyKakaopayData.error) {
      throw new HttpException(
        readyKakaopayData.status ? readyKakaopayData.status : 500,
        readyKakaopayData.data.msg
          ? readyKakaopayData.data.msg
          : req.t("payments.error")
      );
    }
    await paymentsModel.updateOne(
      {
        orderId: orderId,
      },
      { $set: { kakaoReadyPayments: readyKakaopayData.data } }
    );
    return readyKakaopayData.data;
  }

  public async addNewOrder(req: RequestWithUser): Promise<any> {
    const paymentsReq: newPayments = req.body;
    const user = req.user;
    const orderId = randomUUID();
    const isPremium = await premiumGuildCheck(paymentsReq.guildId);
    if (isPremium)
      throw new HttpException(
        404,
        "이미 프리미엄을 사용중인 서버입니다 (우측상단 유저 메뉴 > 결제) 페이지에서 수정해주세요"
      );
    const item = await sellItemModel.findOne({ itemId: paymentsReq.itemId });
    if (!item) throw new HttpException(404, req.t("order.notFoundItem"));
    const paymentsDB = new paymentsModel({
      userId: user.id,
      orderId: orderId,
      amount: item.amount,
      process: "open",
      name: item.itemName,
      target: paymentsReq.guildId,
      type: item.type,
      item: paymentsReq.itemId,
    });
    await paymentsDB.save().catch(() => {
      throw new HttpException(500, req.t("order.error"));
    });
    return {
      paymentId: orderId,
    };
  }

  public async getSuccessOrder(req: RequestWithUser): Promise<any> {
    const payments = await paymentsModel.findOne({
      orderId: req.params.orderId,
    });
    if (!payments || req.user.id !== payments.userId)
      throw new HttpException(404, req.t("payments.notFoundPayments"));
    if (payments.kakaoPayments)
      return await this.getKakaoPaymentsMetadata(req.params.orderId, req);
    let paymentsMeta = await this.getTossPaymentsMetadata(
      req.params.orderId,
      req
    );
    paymentsMeta = {
      ...paymentsMeta,
      payment: {
        ...paymentsMeta.payment,
        secret: undefined,
      }
    }
    return paymentsMeta;
  }

  public async getTargetOrder(req: RequestWithUser): Promise<any> {
    const payments = await paymentsModel.find({
      target: req.params.targetId,
      userId: req.user.id,
      process: { $in: ["success", "error"] },
    });
    if (!payments)
      throw new HttpException(404, req.t("payments.notFoundPayments"));
    const paymentsList = Promise.all(
      payments.map(async (payment) => {
        if (payment.kakaoPayments)
          return await this.getKakaoPaymentsMetadata(payment.orderId, req);
        const paymentsMeta = await this.getTossPaymentsMetadata(
          payment.orderId,
          req
        );
        return paymentsMeta;
      })
    );
    return paymentsList;
  }

  public async methodChange(req: RequestWithUser): Promise<any> {
    const { method, paymentsType } = req.body as methodChange;
    const billing = await billingsModel.findOne({ _id: req.params.id });
    if (!billing)
      throw new HttpException(404, "해당 정기결제는 찾을 수 없습니다");
    if (paymentsType === "tosspayments") {
      const tossmethod = await paymentsTossMethodsModel.findOne({
        userId: req.user.id,
        methodId: method,
      });
      await billing.updateOne({ method: tossmethod.methodKey });
    } else {
      throw new HttpException(400, "해당 결제방식은 찾을 수 없습니다");
    }
    return null;
  }
  public async autopayChange(req: RequestWithUser): Promise<any> {
    const { status } = req.body as autopay;
    console.log(status);
    const billing = await billingsModel.findOne({ _id: req.params.id });
    if (!billing)
      throw new HttpException(404, "해당 정기결제는 찾을 수 없습니다");
    await billing.updateOne({ useing: status });
    return status;
  }

  public async getSubscribes(req: RequestWithUser): Promise<any> {
    const subscribesDB = await billingsModel.find({ userId: req.user.id });
    const subscribes = await Promise.all(
      subscribesDB.map(async (subscribe) => {
        const product = await productsModel.findOne({
          itemId: subscribe.itemId,
        });
        if (subscribe.paymentsType === "tosspayments") {
          const method = await paymentsTossMethodsModel.findOne({
            methodKey: subscribe.method,
          });
          return {
            _id: subscribe._id,
            name: product.itemName,
            method: method.methodId,
            paymentsType: subscribe.paymentsType,
            target: subscribe.target,
            targetType: subscribe.targetType,
            useing: subscribe.useing,
            metadata: await this.getTargetMetadata(
              subscribe.target,
              subscribe.targetType
            ),
            product: product.toJSON(),
          };
        } else if (subscribe.paymentsType === "kakaopay") {
          return {
            _id: subscribe._id,
            name: product.itemName,
            method: "카카오페이",
            paymentsType: subscribe.paymentsType,
            target: subscribe.target,
            targetType: subscribe.targetType,
            useing: subscribe.useing,
            metadata: await this.getTargetMetadata(
              subscribe.target,
              subscribe.targetType
            ),
            product: product.toJSON(),
          };
        }
      })
    );
    return subscribes;
  }

  public async getOrder(req: RequestWithUser): Promise<any> {
    const payments = await paymentsModel.findOne({
      orderId: req.params.orderId,
    });
    if (!payments || payments.userId !== req.user.id)
      throw new HttpException(404, req.t("payments.notFoundPayments"));
    if (payments.process === "success")
      throw new HttpException(400, req.t("payments.alreadySuccessPayments"));
    let itemMetadata;
    if (payments.type === "guild") {
      const guild = client.guilds.cache.get(payments.target);
      if (!guild)
        throw new HttpException(404, req.t("payments.notFoundServer"));
      itemMetadata = {
        type: "guild",
        id: guild.id,
        icon: guild.icon,
        name: guild.name,
      };
    } else if (payments.type === "user") {
      const user = client.users.cache.get(payments.target);
      if (!user) throw new HttpException(404, req.t("payments.notFoundUser"));
      itemMetadata = {
        type: "user",
        id: user.id,
        avatar: user.avatar,
        discriminator: user.discriminator,
        name: user.username,
      };
    }
    return {
      metadata: itemMetadata,
      name: payments.name,
      id: payments.orderId,
      amount: payments.amount,
    };
  }

  private async getTossPaymentsMetadata(
    orderId: string,
    req: Request
  ): Promise<any> {
    const payments = await paymentsModel.findOne({ orderId });
    let itemMetadata;
    let nextPayDate: Date;
    if (payments.type === "guild") {
      const guild = client.guilds.cache.get(payments.target);
      if (!guild)
        throw new HttpException(404, req.t("payments.notFoundPaymentsServer"));
      itemMetadata = {
        type: "guild",
        id: guild.id,
        icon: guild.icon,
        name: guild.name,
      };
      const guildPremium = await premiumGuildModel.findOne({
        guild_id: guild.id,
      });
      nextPayDate = guildPremium.nextpay_date;
    } else if (payments.type === "user") {
      const user = client.users.cache.get(payments.target);
      if (!user)
        throw new HttpException(404, req.t("payments.notFoundPaymentsUser"));
      itemMetadata = {
        type: "user",
        id: user.id,
        avatar: user.avatar,
        discriminator: user.discriminator,
        name: user.username,
      };
      const userPremium = await premiumUserModel.findOne({ user_id: user.id });
      nextPayDate = userPremium.nextpay_date;
    }
    return {
      createAt: payments.published_date,
      id: payments.orderId,
      metadata: itemMetadata,
      nextPayDate,
      ...payments.toJSON(),
    };
  }

  private async getKakaoPaymentsMetadata(
    orderId: string,
    req: Request
  ): Promise<any> {
    const payments = await paymentsModel.findOne({ orderId });
    let itemMetadata;
    let nextPayDate: Date;
    if (payments.type === "guild") {
      const guild = client.guilds.cache.get(payments.target);
      if (!guild)
        throw new HttpException(404, req.t("payments.notFoundPaymentsServer"));
      itemMetadata = {
        type: "guild",
        id: guild.id,
        icon: guild.icon,
        name: guild.name,
      };
      const guildPremium = await premiumGuildModel.findOne({
        guild_id: guild.id,
      });
      nextPayDate = guildPremium.nextpay_date;
    } else if (payments.type === "user") {
      const user = client.users.cache.get(payments.target);
      if (!user)
        throw new HttpException(404, req.t("payments.notFoundPaymentsUser"));
      itemMetadata = {
        type: "user",
        id: user.id,
        avatar: user.avatar,
        discriminator: user.discriminator,
        name: user.username,
      };
      const userPremium = await premiumUserModel.findOne({ user_id: user.id });
      nextPayDate = userPremium.nextpay_date;
    }
    return {
      createAt: payments.published_date,
      id: payments.orderId,
      metadata: itemMetadata,
      nextPayDate,
      name: payments.name,
      amount: payments.amount,
      payment: {
        balanceAmount: payments.kakaoPayments.amount.total,
        method:
          payments.kakaoPayments.payment_method_type === "MONEY"
            ? "카카오페이 계좌"
            : "카카오페이 카드",
        approvedAt: payments.kakaoPayments.approved_at,
      },
    };
  }

  private async updateBilling(
    orderId: string,
    req: RequestWithUser,
    type: "kakaopay" | "tosspayments",
    method: string
  ): Promise<any> {
    const order = await paymentsModel.findOne({ orderId });
    const billing = await billingsModel.findOne({ target: order.target });
    if (!billing) {
      const billingDB = new billingsModel({
        itemId: order.item,
        userId: req.user.id,
        target: order.target,
        targetType: order.type,
        paymentsType: type,
        useing: true,
        method,
      });
      await billingDB.save().catch((e) => {
        console.log(e);
        throw new Error("데이터 저장중 오류가 발생했습니다");
      });
    } else {
      await billingsModel.updateOne(
        { target: order.target },
        { $set: { useing: true, type: type, method: method } }
      );
    }
  }

  private async getTargetMetadata(id: string, type: targetType) {
    if (type === "guild") {
      const guild = client.guilds.cache.get(id);
      return {
        name: guild.name,
        id: guild.id,
        icon: guild.icon,
      };
    } else if (type === "user") {
      const user = await client.users.fetch(id);
      return {
        name: user.username,
        id: user.id,
        avatar: user.avatar,
        discriminator: user.discriminator,
      };
    }
  }
}

export default PaymentsService;
