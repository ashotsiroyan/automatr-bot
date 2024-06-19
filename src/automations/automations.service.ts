import {
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import { Automation } from './entities/automation.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { Note } from './entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { join } from 'path';
import { Action } from './entities/action.entity';
import { Cron } from '@nestjs/schedule';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

@Injectable()
export class AutomationsService {
    private readonly logger = new Logger(AutomationsService.name);

    constructor(
        @InjectBot() private bot: Telegraf,

        @InjectRepository(Automation)
        private automationRepository: Repository<Automation>,

        @InjectRepository(Note)
        private noteRepository: Repository<Note>,

        @InjectRepository(Action)
        private actionRepository: Repository<Action>,
    ) { }

    async findAutomations(filter?: { isEnded?: boolean }) {
        let where = '';

        if (filter) {
            if (filter.isEnded != undefined)
                where = `automation.endedAt IS ${filter.isEnded ? 'NOT' : ''} NULL`;
        }

        const notes = await this.automationRepository
            .createQueryBuilder('automation')
            .where(where)
            .orderBy({
                'automation.id': 'DESC',
            })
            .getMany();

        return notes;
    }

    async findActions() {
        const actions = await this.actionRepository
            .createQueryBuilder('action')
            .orderBy({
                'action.id': 'DESC',
            })
            .getMany();

        return actions;
    }

    async findOneActionById(id: number) {
        const action = await this.actionRepository
            .createQueryBuilder('action')
            .where('action.id = :id', { id })
            .orderBy({
                'action.id': 'DESC',
            })
            .getOne();

        return action;
    }

    async getOneNoteById(id: number) {
        const note = await this.noteRepository.findOneBy({ id });

        if (!note) throw new NotFoundException();

        return note;
    }

    async getAutomationLastNoteById(id: number) {
        const note: Note = await this.noteRepository
            .createQueryBuilder('note')
            .orderBy({
                'note.id': 'DESC',
            })
            .where('note.automationId = :id', { id })
            .getOne();

        return note;
    }

    async stopRunningAutomationByActionId(
        id: number,
    ): Promise<Automation | null> {
        const automation = await this.automationRepository.findOneBy({
            action: { id },
            endedAt: IsNull(),
        });

        if (!automation) return null;

        automation.endedAt = new Date();

        await this.automationRepository.save(automation);

        return automation;
    }

    async findRunningActions() {
        const automations = await this.automationRepository
            .createQueryBuilder('automation')
            .leftJoinAndSelect('automation.action', 'action')
            .where('automation.actionId IS NOT NULL AND automation.endedAt IS NULL')
            .getMany();

        return automations;
    }

    async createAutomation(createAutomationDto: CreateAutomationDto) {
        const values: { [name: string]: any } = {
            name: createAutomationDto.name,
        };

        if (createAutomationDto.actionId)
            values.action = {
                id: createAutomationDto.actionId,
            };

        const automation = await this.automationRepository.save(values);

        return automation;
    }

    async createNote(createNoteDto: CreateNoteDto) {
        try {
            const { automationId, image, status, sendToChannel } = createNoteDto;
            let filename = null;

            const automation = await this.automationRepository.findOne({
                where: { id: automationId },
                relations: { action: true },
            });

            if (!automation)
                throw new InternalServerErrorException('Not Automation Found');

            if (image) {
                const buffer = Buffer.from(
                    image.replace(/^data:image\/jpeg;base64,/, ''),
                    'base64',
                );

                filename = Date.now() + '-' + Math.round(Math.random() * 1e9);
                filename += '.jpeg';
                const path = join(
                    __dirname,
                    '../../public',
                    'screenshots',
                    automationId.toString(),
                );

                await fs.mkdir(path, { recursive: true });
                await fs.writeFile(join(path, filename), buffer);

                if (sendToChannel && automation.action.channelId) {
                    const { SERVER_HOST } = process.env;

                    await this.bot.telegram.sendPhoto(automation.action.channelId, { url: `${SERVER_HOST}/screenshots/${automation.id}/${filename}` });
                }
            }

            return await this.noteRepository.save({
                automation: {
                    id: automationId,
                },
                status,
                image: filename,
            });
        } catch (error) {
            console.error(error);
            throw new InternalServerErrorException('Error saving image');
        }
    }

    async updateAutomation(id: number, endedAt: string) {
        const automation = await this.automationRepository.findOneBy({ id });

        if (!automation) throw new NotFoundException();

        automation.endedAt = new Date(endedAt);

        await this.automationRepository.save(automation);

        const note = await this.getAutomationLastNoteById(id);

        if (note)
            await this.noteRepository.delete({ automation, id: Not(note.id) });

        return {
            success: true,
        };
    }

    async runAction(actionId: number) {
        const action = await this.findOneActionById(actionId);

        if (!action) throw new NotFoundException('No Action Found');

        await this.stopRunningAction(actionId);

        const automation = await this.createAutomation({
            name: action.name,
            actionId: action.id,
        });

        const formData = new FormData();

        formData.append('api_key', action.apiKey);
        formData.append('slug', action.slug);
        formData.append('instance_uuid', 'RFCRA0YHGKA'); // not dynamic, need to remove
        formData.append(
            'settings_json',
            '{"user_agent":"random_desktop","custom_user_agent":"","screen_resolution":"1920x1080","browser_name":"com.android.chrome","android_chrome_only_hcaptcha_pass_ready":false,"process_timeout_seconds":"1195","timezone":"Asia/Yerevan","content_security_policy":"","chrome_shell_options_str":"","microphone_allowd_hosts":[],"extra_plugins_paths":[],"remove_chrome_cli_params":[],"disable_features_cli_params":[],"enable_features_cli_params":[],"geolocation_allowd_hosts":[],"startup_full_screen":false,"browser_enable_audio":false,"redirect_audio_output_to_microphone":false,"run_browser_as_root":false,"dont_clear_cache":false,"webrtc_ip_handling_policy":"default","build_for_device_type":"android","bypass_obfuscation_hosts":[],"obfuscate_only_hosts":[],"delete_properties_from_navigator":[],"extra_headers":[],"enable_fingerprint_tests":false,"block_third_party_cookies":false,"prevent_alert":false,"obfuscate_navigator_connection":false,"add_random_popeties_in_window":false,"delete_webgpu_properties_from_window_object":false,"delete_additional_random_props_from_window":false,"mock_window_onerror":false,"disable_background_networking":false,"disable_service_worker":false,"disable_shared_workers":false,"disable_client_hints":false,"spoof_webrtc_ip":false,"delete_webrtc_properties_from_window":false,"emulate_device_screen_resolution":false,"randomize_emulated_media_params":false,"randomize_device_orientation":false,"randomize_font_sizes":false,"page_set_bypass_csp":false,"page_set_ad_blocking":false,"android_only_randomize_device_model":false,"android_only_fake_device_model":false,"android_only_reduce_ua":false,"android_only_empty_device_model":false,"client_hints_change_browser_brand_to_chrome":false,"android_only_randomize_os_screen_height":false,"prevent_local_port_scans":false,"obfuscate_storage_quota":false,"obfuscate_canvas_fingerprint":false,"fix_max_touch_point_for_desktop_if_it_is_10":false,"obfuscate_device_pixel_ratio":false,"webgl_buffer_data_obfuscation":false,"webgl_supported_extensions_obfuscation":false,"webgl_read_pixels_data_obfuscation":false,"obfuscate_audio_fingerprint":false,"obfuscate_browser_permissions":false,"obfuscate_speech_synthesis_voices":false,"obfuscate_navigator_media_devices":false,"random_window_history_length":false,"sys_top_window_all_verbose_enabled":false,"force_inject_obfuscation":false,"load_random_fonts":false,"obfuscate_audio_video_canplay_media_types":false,"dont_inject_any_scripts":false,"navigator_device_memory":"off","navigator_hardware_concurrency":"off","engine_version":"v1","browser_closest_engine_version":"random","emulate_locale":"off","accept_lang":"off","emulation_set_idle_override":"off","android_only_screen_density":"default","device_scale_factor":"default","spoof_localip_method":"default","captcha_solver_system":"default","obfuscate_navigator_conection_type":"default","site_isolation_policy":"off","default_background_color":"#ffffff","code_snippets":{"front":[],"back":[10]},"full_proxy":false,"full_proxy_qty":"1","blocking_resource_types":[],"webgl_obfuscate_options":[]}',
        );
        formData.append(
            'task_data_json',
            '{"url":"https:\\/\\/visa.vfsglobal.com\\/arm\\/hy\\/ltu\\/login","automationId":' +
            automation.id +
            '}',
        );

        const res = await fetch(
            'https://instance.checkout.am/api/v1/RunPluginNew',
            {
                method: 'POST',
                body: formData,
            },
        );

        const data = await res.json();

        if (!data.success) throw new InternalServerErrorException(data.message);

        await this.updateAutomationUuid(automation.id, data.instance_uuid);

        return { action, automation, uuid: data.instance_uuid };
    }

    async stopRunningAction(actionId: number) {
        const automation = await this.stopRunningAutomationByActionId(+actionId);

        if (!automation) return { success: false };

        const { apiKey } = await this.findOneActionById(actionId);

        const formData = new FormData();

        formData.append('instance_uuid', automation.uuid);
        formData.append('api_key', apiKey);
        formData.append('data_json', '{"action":"stop_running_plugin"}');

        await fetch('https://instance.checkout.am/api/v1/SendActionToInstance', {
            method: 'POST',
            body: formData,
        });

        return { success: true };
    }

    private async updateAutomationUuid(id: number, uuid: string) {
        const automation = await this.automationRepository.findOneBy({ id });

        if (!automation) throw new NotFoundException('Not Automation Found');

        automation.uuid = uuid;

        await this.automationRepository.save(automation);

        return {
            success: true,
        };
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    @Cron('0 0 * * *')
    async removeFinishedAutomations() {
        const path = join(__dirname, '../../public', 'screenshots');

        const finishedAutomations = await this.automationRepository
            .createQueryBuilder('automation')
            .select(['automation.id'])
            .where('"endedAt" IS NOT NULL')
            .getMany();

        for (const { id } of finishedAutomations) {
            try {
                const dir = join(path, id.toString());

                await fs.rm(dir, { recursive: true });
            } catch (error) {
                continue;
            }
        }

        await this.automationRepository
            .createQueryBuilder()
            .delete()
            .where('"endedAt" IS NOT NULL')
            .execute();

        this.logger.log('Removed finished automations');
    }
}
