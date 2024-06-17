import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Action, Ctx, Hears, Help, On, Start, Update } from 'nestjs-telegraf';
import { chunk } from 'lodash';
import { DatabaseService } from 'src/database/database.service';
import { SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
@Update()
export class TelegramBotService {
    constructor(
        private schedulerRegistry: SchedulerRegistry,
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

    @Hears('/runningautomations')
    async getRunningAutomations(@Ctx() ctx) {
        const autos = await this.databaseService.findAutomations({ isEnded: false });

        if (autos.length) {
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
        } else
            await ctx.reply(
                "No running automations"
            );
    }

    @Hears('/actions')
    async getActions(@Ctx() ctx) {
        const actions = await this.databaseService.findActions();

        if (actions.length) {
            const keyboard = chunk(
                actions.map((e) => ({
                    text: e.name,
                    callback_data: 'runAction(' + e.id + ')',
                }))
                , 2);

            const options = {
                reply_markup: {
                    inline_keyboard: keyboard,
                    resize_keyboard: true,
                },
            };

            await ctx.reply(
                "Actions",
                options,
            );
        } else
            await ctx.reply(
                "No actions to run"
            );
    }

    @Hears('/stopaction')
    async getRunningActions(@Ctx() ctx) {
        const automations = await this.databaseService.findRunningActions();

        if (automations.length) {
            const keyboard = chunk(
                automations.map((e) => ({
                    text: e.name,
                    callback_data: 'stopAction(' + e.action.id + ')',
                }))
                , 2);

            const options = {
                reply_markup: {
                    inline_keyboard: keyboard,
                    resize_keyboard: true,
                },
            };

            await ctx.reply(
                "Running actions",
                options,
            );
        } else
            await ctx.reply(
                "No running actions"
            );
    }

    @Action(/getLastImage\((.*?)\)/)
    async getLastImage(@Ctx() ctx) {
        const id = ctx.match[1];

        try {
            const note = await this.databaseService.getAutomationLastNoteById(+id);

            if (!note)
                throw new NotFoundException();

            const { SERVER_HOST } = process.env;
            const caption = `Status: ${note.status} \n${note.createdAt.toLocaleString()}`;

            if (note.image)
                await ctx.replyWithPhoto({ url: `${SERVER_HOST}/screenshots/${note.image}` }, { caption });
            else
                await ctx.reply(caption);
        } catch (error) {
            console.error(error);
            await ctx.reply('No note for this automation');
        }
    }

    @Action(/runAction\((.*?)\)/)
    async runAction(@Ctx() ctx) {
        const id = ctx.match[1];

        try {
            const { action } = await this.runPlugin(+id);

            if(action.intervalMS && !this.schedulerRegistry.doesExist('interval', action.id.toString()))
                this.addInterval(action.id.toString(), action.intervalMS);

            await ctx.reply('Action ran');
        } catch (error) {
            console.error(error);

            await this.stopRunningPlugin(+id);
    
            await ctx.reply(error.message);
        }
    }

    @Action(/stopAction\((.*?)\)/)
    async stopAction(@Ctx() ctx) {
        const id = ctx.match[1];

        try {
            await this.stopRunningPlugin(+id);

            this.deleteInterval(id);

            await ctx.reply('Action stopped');
        } catch (error) {
            console.error(error);
            await ctx.reply(error.message);
        }
    }

    async runPlugin(actionId: number) {
        const action = await this.databaseService.findOneActionById(actionId);

        if (!action)
            throw new NotFoundException('No Action Found');

        await this.stopRunningPlugin(actionId);

        const automation =  await this.databaseService.createAutomation({
            name: action.name,
            actionId: action.id
        });

        const formData = new FormData();

        formData.append('api_key', action.apiKey);
        formData.append('slug', action.slug);
        formData.append('instance_uuid', 'RFCRA0YHGKA'); // not dynamic, need to remove
        formData.append('settings_json', "{\"user_agent\":\"random_desktop\",\"custom_user_agent\":\"\",\"screen_resolution\":\"1920x1080\",\"browser_name\":\"com.android.chrome\",\"android_chrome_only_hcaptcha_pass_ready\":false,\"process_timeout_seconds\":\"1195\",\"timezone\":\"Asia/Yerevan\",\"content_security_policy\":\"\",\"chrome_shell_options_str\":\"\",\"microphone_allowd_hosts\":[],\"extra_plugins_paths\":[],\"remove_chrome_cli_params\":[],\"disable_features_cli_params\":[],\"enable_features_cli_params\":[],\"geolocation_allowd_hosts\":[],\"startup_full_screen\":false,\"browser_enable_audio\":false,\"redirect_audio_output_to_microphone\":false,\"run_browser_as_root\":false,\"dont_clear_cache\":false,\"webrtc_ip_handling_policy\":\"default\",\"build_for_device_type\":\"android\",\"bypass_obfuscation_hosts\":[],\"obfuscate_only_hosts\":[],\"delete_properties_from_navigator\":[],\"extra_headers\":[],\"enable_fingerprint_tests\":false,\"block_third_party_cookies\":false,\"prevent_alert\":false,\"obfuscate_navigator_connection\":false,\"add_random_popeties_in_window\":false,\"delete_webgpu_properties_from_window_object\":false,\"delete_additional_random_props_from_window\":false,\"mock_window_onerror\":false,\"disable_background_networking\":false,\"disable_service_worker\":false,\"disable_shared_workers\":false,\"disable_client_hints\":false,\"spoof_webrtc_ip\":false,\"delete_webrtc_properties_from_window\":false,\"emulate_device_screen_resolution\":false,\"randomize_emulated_media_params\":false,\"randomize_device_orientation\":false,\"randomize_font_sizes\":false,\"page_set_bypass_csp\":false,\"page_set_ad_blocking\":false,\"android_only_randomize_device_model\":false,\"android_only_fake_device_model\":false,\"android_only_reduce_ua\":false,\"android_only_empty_device_model\":false,\"client_hints_change_browser_brand_to_chrome\":false,\"android_only_randomize_os_screen_height\":false,\"prevent_local_port_scans\":false,\"obfuscate_storage_quota\":false,\"obfuscate_canvas_fingerprint\":false,\"fix_max_touch_point_for_desktop_if_it_is_10\":false,\"obfuscate_device_pixel_ratio\":false,\"webgl_buffer_data_obfuscation\":false,\"webgl_supported_extensions_obfuscation\":false,\"webgl_read_pixels_data_obfuscation\":false,\"obfuscate_audio_fingerprint\":false,\"obfuscate_browser_permissions\":false,\"obfuscate_speech_synthesis_voices\":false,\"obfuscate_navigator_media_devices\":false,\"random_window_history_length\":false,\"sys_top_window_all_verbose_enabled\":false,\"force_inject_obfuscation\":false,\"load_random_fonts\":false,\"obfuscate_audio_video_canplay_media_types\":false,\"dont_inject_any_scripts\":false,\"navigator_device_memory\":\"off\",\"navigator_hardware_concurrency\":\"off\",\"engine_version\":\"v1\",\"browser_closest_engine_version\":\"random\",\"emulate_locale\":\"off\",\"accept_lang\":\"off\",\"emulation_set_idle_override\":\"off\",\"android_only_screen_density\":\"default\",\"device_scale_factor\":\"default\",\"spoof_localip_method\":\"default\",\"captcha_solver_system\":\"default\",\"obfuscate_navigator_conection_type\":\"default\",\"site_isolation_policy\":\"off\",\"default_background_color\":\"#ffffff\",\"code_snippets\":{\"front\":[],\"back\":[10]},\"full_proxy\":false,\"full_proxy_qty\":\"1\",\"blocking_resource_types\":[],\"webgl_obfuscate_options\":[]}");
        formData.append('task_data_json', "{\"url\":\"https:\\/\\/visa.vfsglobal.com\\/arm\\/hy\\/ltu\\/login\",\"automationId\":" + automation.id + "}");

        const res = await fetch('https://instance.checkout.am/api/v1/RunPluginNew', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (!data.success)
            throw new InternalServerErrorException(data.message);

        await this.databaseService.updateAutomationUuid(automation.id, data.instance_uuid);

        return { action, automation, uuid: data.instance_uuid };
    }

    private async stopRunningPlugin(actionId: number) {
        const automation = await this.databaseService.stopRunningAction(+actionId);

        if(!automation)
            return { success: false }

        const { apiKey } = await this.databaseService.findOneActionById(actionId);

        const formData = new FormData();

        formData.append('instance_uuid', automation.uuid);
        formData.append('api_key', apiKey);
        formData.append('data_json', "{\"action\":\"stop_running_plugin\"}");

        await fetch('https://instance.checkout.am/api/v1/SendActionToInstance', {
            method: 'POST',
            body: formData
        });

        return { success: true }
    }

    private addInterval(actionId: string, milliseconds: number) {
        const callback = async () => {
            try {
                await this.runPlugin(+actionId);
            } catch (error) {
                console.error(error);
    
                await this.stopRunningPlugin(+actionId);
            }
        };

        const interval = setInterval(callback, milliseconds);
        this.schedulerRegistry.addInterval(actionId, interval);
    }

    private async deleteInterval(actionId: string) {
        if(this.schedulerRegistry.doesExist('interval', actionId))
            this.schedulerRegistry.deleteInterval(actionId);

        await this.stopRunningPlugin(+actionId);
    }
}
