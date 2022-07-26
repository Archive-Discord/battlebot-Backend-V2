import { NODE_ENV } from "@/config";
import { KAKAO_MESSAGE_TEMPLATE } from "@/interfaces/message.interface";
import mailSender from "@/libs/email/mail";
import premiumGuildModel from "@/models/premiumGuild.model";
import productsModel from "@/models/products.model";
import userModel from "@/models/users.model";
import { EmbedBuilder } from "discord.js";
import { premiumCache } from "./cache";
import { client } from "./discord";
import sendMessage from "./message";
import { DateTime } from "./util";

export const guildPremiumHanler = async (
  guildId: string,
  itemId: string,
  userId: string,
  payments: {
    method: string,
    amount: string,
  }
) => {
  const user = await userModel.findOne({ id: userId });
  const discordUser = await client.users.fetch(userId);
  const guild = client.guilds.cache.get(guildId);
  const product = await productsModel.findOne({ itemId });
  if (!product) throw new Error("해당 상품은 찾을 수 없습니다");
  const premiumGuild = await premiumGuildModel.findOne({ guild_id: guildId });
  let expiredDate = new Date();
  if (!premiumGuild) {
    const plandate = new Date();
    if (product.plan == "year") {
      plandate.setFullYear(plandate.getFullYear() + 1);
    } else if (product.plan == "month") {
      plandate.setMonth(plandate.getMonth() + 1);
    }
    const premiumGuildDB = new premiumGuildModel({
      guild_id: guildId,
      nextpay_date: plandate,
    });
    await premiumGuildDB.save().catch((e) => {
      throw new Error(e.message);
    });
    expiredDate = plandate;
  } else {
    let plandate = new Date(premiumGuild.nextpay_date);
    const nowDate = new Date();
    if (nowDate > plandate) {
      plandate = nowDate;
      if (product.plan == "year") {
        plandate.setFullYear(nowDate.getFullYear() + 1);
      } else if (product.plan == "month") {
        plandate.setMonth(nowDate.getMonth() + 1);
      }
    } else {
      if (product.plan == "year") {
        plandate.setFullYear(plandate.getFullYear() + 1);
      } else if (product.plan == "month") {
        plandate.setMonth(plandate.getMonth() + 1);
      }
    }
    expiredDate = plandate;
    await premiumGuildModel
      .updateOne({ guild_id: guildId }, { $set: { nextpay_date: plandate } })
      .catch((e) => {
        throw new Error(e.message);
      });
  }

  if (NODE_ENV === "production") {
    try {
      await sendMessage(user.phone, KAKAO_MESSAGE_TEMPLATE.PREMIUM_SUCCESS, {
        "#{이름}": discordUser.username,
      });
    } catch (e) {
      console.log(e)
    }
  }
  try {
    const embed = new EmbedBuilder()
      .setTitle("배틀이 프리미엄")
      .setDescription(
        `${
          guild.name
        }서버의 배틀이 프리미엄이 활성화 되었습니다\n다음 결제 예정일은 ${DateTime(
          expiredDate
        )} 입니다`
      )
      .setColor("Green");
    await discordUser.send({ embeds: [embed] });
  } catch (e) {
    console.log(e)
  }
  try {
    await mailSender.sendMail({
      email: user.email,
      data: {
        serverName: guild.name,
        nextPayDate: DateTime(expiredDate),
        method: payments.method,
        amount: payments.amount
      },
      title: `[배틀이 페이] ${discordUser.username}님, ${guild.name}서버의 프리미엄 결제가 완료되었어요`,
      template: "successOrder"
    })
  } catch(e) {
    console.log(e)
  }
  premiumCache.del(guildId);
};

export const premiumGuildCheck = async (guild: string): Promise<boolean> => {
  const isPremium = premiumCache.has(guild);
  if (!isPremium) {
    const premium = await premiumGuildModel.findOne({
      guild_id: guild,
    });
    if (!premium) {
      premiumCache.set(guild, false);
      return false;
    } else {
      const now = new Date();
      const premiumDate = new Date(premium.nextpay_date);
      if (now < premiumDate) {
        premiumCache.set(guild, true);
        return true;
      } else {
        premiumCache.set(guild, false);
        return false;
      }
    }
  } else {
    return premiumCache.get(guild);
  }
};

export const guildPremiumErrorHanler = async (
  guildId: string,
  userId: string,
  reason: string
) => {
  const discordUser = await client.users.fetch(userId);
  try {
    const guild = client.guilds.cache.get(guildId);
    const embed = new EmbedBuilder()
      .setTitle("배틀이 프리미엄")
      .setDescription(
        `${guild.name}서버의 배틀이 프리미엄이 \`${reason}\`으로 연장에 실패했습니다\n내일 재결제 예정입니다`
      )
      .setColor("Red");
    await discordUser.send({ embeds: [embed] });
  } catch (e) {
    throw new Error(e.message);
  }
};
