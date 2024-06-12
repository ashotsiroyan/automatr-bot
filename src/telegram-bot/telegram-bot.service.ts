import { Injectable } from '@nestjs/common';
import { Ctx, Hears, Help, On, Start, Update } from 'nestjs-telegraf';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
@Update()
export class TelegramBotService {
    constructor(
        private readonly databaseService: DatabaseService
    ) {}

    @Start()
    async start(@Ctx() ctx) {
        await ctx.reply('Hi');
    }
  
    @Help()
    async help(@Ctx() ctx) {
        await ctx.reply('Help...');
    }
  
    @On('sticker')
    async on(@Ctx() ctx) {
      await ctx.reply('👍');
    }

    @Hears('Hi')
    onText(@Ctx() ctx){
        console.log(ctx);
    }
}
