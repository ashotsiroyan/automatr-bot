import { Injectable } from '@nestjs/common';
import { Action, Ctx, Hears, Help, On, Start, Update } from 'nestjs-telegraf';
import { chunk } from 'lodash';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
@Update()
export class TelegramBotService {
    constructor(
        private readonly databaseService: DatabaseService
    ) { }

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
    onText(@Ctx() ctx) {
        console.log(ctx);
    }

    @Hears('/runningautomations')
    async getRunningAutomations(@Ctx() ctx) {
        const autos = await this.databaseService.findAutomations({ isEnded: false });
        
        if(autos.length){
            const keyboard = chunk(
                autos.map((e) => ({
                    text: e.name + ': ' + e.id,
                    callback_data: 'getLastImage(' + e.id + ')',
                }))
            , 2);
    
            const options = {
                reply_markup: {
                    inline_keyboard: keyboard,
                    resize_keyboard: true,
                },
            };

            await ctx.reply(
                "Running automations",
                options,
            );
        }else
            await ctx.reply(
                "No running automations"
            );
    }

    @Action(/getLastImage\((.*?)\)/)
    async getLastImage(@Ctx() ctx) {
        const id = ctx.match[1];

        try{
            const { image, createdAt, status } = await this.databaseService.getAutomationLastNoteById(+id);
            const { SERVER_HOST } = process.env;
    
            await ctx.replyWithPhoto({ url: `${SERVER_HOST}/screenshots/${image}` }, { caption: `Status: ${status} \n${createdAt.toLocaleString()}` });
        }catch(error){
            console.error(error);
            await ctx.reply('No note for this automation');
        }
    }
}
