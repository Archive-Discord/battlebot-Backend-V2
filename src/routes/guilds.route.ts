import { Router } from 'express';
import { Routes } from '@interfaces/routes.interface';
import { authAdminMiddleware } from '@middlewares/auth.middleware';
import GuildController from '@/controllers/guilds.controller';
import validationMiddleware from '@middlewares/validation.middleware';
import { Automod, CustomLink, DeleteAutomod, DeleteCustomLink, Ticket, Verify, Vote, Warning } from "@dtos/guilds.dto"

class GuildRoute implements Routes {
  public path = '/guilds';
  public router = Router();
  public guildsController = new GuildController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/:id`, authAdminMiddleware, this.guildsController.getGuild);
    this.router.get(`${this.path}/:id/roles`, authAdminMiddleware, this.guildsController.getGuildRoles);
    this.router.get(`${this.path}/:id/premium`, authAdminMiddleware, this.guildsController.getGuildPremium);
    this.router.get(`${this.path}/:id/members`, authAdminMiddleware, this.guildsController.getGuildMembers);
    this.router.get(`${this.path}/:id/tickets`, authAdminMiddleware, this.guildsController.getGuildTickets);
    this.router.get(`${this.path}/:id/verifys`, authAdminMiddleware, this.guildsController.getGuildTickets);
    this.router.get(`${this.path}/:id/customlink`, authAdminMiddleware, this.guildsController.getCustomLink);
    this.router.get(`${this.path}/:id/automod`, authAdminMiddleware, this.guildsController.getAutomod);
    this.router.get(`${this.path}/:id/members/:userId`, authAdminMiddleware, this.guildsController.getGuildMember);
    this.router.post(`${this.path}/:id/customlink`, authAdminMiddleware, validationMiddleware(CustomLink, 'body'), this.guildsController.setCustomLink);
    this.router.post(`${this.path}/:id/automod`, authAdminMiddleware, validationMiddleware(Automod, 'body'), this.guildsController.setAutomod);
    this.router.post(`${this.path}/:id/ticket/create`, authAdminMiddleware, validationMiddleware(Ticket, 'body'), this.guildsController.createTicket);
    this.router.post(`${this.path}/:id/members/:userId/warning`, authAdminMiddleware, validationMiddleware(Warning, 'body'), this.guildsController.addGuildMemberWarning);
    this.router.post(`${this.path}/:id/vote`, authAdminMiddleware, validationMiddleware(Vote, 'body'), this.guildsController.guildVote);
    this.router.post(`${this.path}/:id/verify`, authAdminMiddleware, validationMiddleware(Verify, 'body'), this.guildsController.createVerify);
    this.router.delete(`${this.path}/:id/customlink`, authAdminMiddleware, validationMiddleware(DeleteCustomLink, 'body'), this.guildsController.deleteCustomLink);
    this.router.delete(`${this.path}/:id/automod`, authAdminMiddleware, validationMiddleware(DeleteAutomod, 'body'), this.guildsController.deleteAutomod);
  }
}

export default GuildRoute;
