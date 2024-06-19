import { Injectable, NotFoundException } from '@nestjs/common';
import { Action, Ctx, Hears, Help, Start, Update } from 'nestjs-telegraf';
import { chunk } from 'lodash';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AutomationsService } from 'src/automations/automations.service';

@Injectable()
@Update()
export class TelegramBotService {
  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private readonly automationsService: AutomationsService,
  ) {}

  @Start()
  async start(@Ctx() ctx) {
    await ctx.reply('Hi');
  }

  @Help()
  async help(@Ctx() ctx) {
    await ctx.reply('Help...');
  }

  @Hears('/runningautomations')
  async getRunningAutomations(@Ctx() ctx) {
    const autos = await this.automationsService.findAutomations({
      isEnded: false,
    });

    if (autos.length) {
      const keyboard = chunk(
        autos.map((e) => ({
          text: e.name + ': ' + e.id,
          callback_data: 'getLastImage(' + e.id + ')',
        })),
        2,
      );

      const options = {
        reply_markup: {
          inline_keyboard: keyboard,
          resize_keyboard: true,
        },
      };

      await ctx.reply('Running automations', options);
    } else await ctx.reply('No running automations');
  }

  @Hears('/actions')
  async getActions(@Ctx() ctx) {
    const actions = await this.automationsService.findActions();

    if (actions.length) {
      const keyboard = chunk(
        actions.map((e) => ({
          text: e.name,
          callback_data: 'runAction(' + e.id + ')',
        })),
        2,
      );

      const options = {
        reply_markup: {
          inline_keyboard: keyboard,
          resize_keyboard: true,
        },
      };

      await ctx.reply('Actions', options);
    } else await ctx.reply('No actions to run');
  }

  @Hears('/stopaction')
  async getRunningActions(@Ctx() ctx) {
    const automations = await this.automationsService.findRunningActions();

    if (automations.length) {
      const keyboard = chunk(
        automations.map((e) => ({
          text: e.name,
          callback_data: 'stopAction(' + e.action.id + ')',
        })),
        2,
      );

      const options = {
        reply_markup: {
          inline_keyboard: keyboard,
          resize_keyboard: true,
        },
      };

      await ctx.reply('Running actions', options);
    } else await ctx.reply('No running actions');
  }

  @Action(/getLastImage\((.*?)\)/)
  async getLastImage(@Ctx() ctx) {
    const id = ctx.match[1];

    try {
      const note = await this.automationsService.getAutomationLastNoteById(+id);

      if (!note) throw new NotFoundException();

      const { SERVER_HOST } = process.env;
      const caption = `Status: ${note.status} \n${note.createdAt.toLocaleString()}`;

      if (note.image)
        await ctx.replyWithPhoto(
          { url: `${SERVER_HOST}/screenshots/${id}/${note.image}` },
          { caption },
        );
      else await ctx.reply(caption);
    } catch (error) {
      console.error(error);
      await ctx.reply('No note for this automation');
    }
  }

  @Action(/runAction\((.*?)\)/)
  async runAction(@Ctx() ctx) {
    const id = ctx.match[1];

    try {
      const { action } = await this.automationsService.runAction(+id);

      if (
        action.intervalMS &&
        !this.schedulerRegistry.doesExist('interval', action.id.toString())
      )
        this.addInterval(action.id.toString(), action.intervalMS);

      await ctx.reply('Action ran');
    } catch (error) {
      console.error(error);

      await this.automationsService.stopRunningAction(+id);

      await ctx.reply(error.message);
    }
  }

  @Action(/stopAction\((.*?)\)/)
  async stopAction(@Ctx() ctx) {
    const id = ctx.match[1];

    try {
      await this.automationsService.stopRunningAction(+id);

      this.deleteInterval(id);

      await ctx.reply('Action stopped');
    } catch (error) {
      console.error(error);
      await ctx.reply(error.message);
    }
  }

  private addInterval(actionId: string, milliseconds: number) {
    const callback = async () => {
      try {
        await this.automationsService.runAction(+actionId);
      } catch (error) {
        console.error(error);

        await this.automationsService.stopRunningAction(+actionId);
      }
    };

    const interval = setInterval(callback, milliseconds);
    this.schedulerRegistry.addInterval(actionId, interval);
  }

  private async deleteInterval(actionId: string) {
    if (this.schedulerRegistry.doesExist('interval', actionId))
      this.schedulerRegistry.deleteInterval(actionId);

    await this.automationsService.stopRunningAction(+actionId);
  }
}
