import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import { Automation } from './entities/automation.entity';
import { Not, Repository } from 'typeorm';
import { Note, Status } from './entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { join } from 'path';

@Injectable()
export class DatabaseService {
    constructor(
        @InjectRepository(Automation)
        private automationRepository: Repository<Automation>,
    
        @InjectRepository(Note)
        private noteRepository: Repository<Note>
    ) {}

    async findAutomations(filter?: { isEnded?: boolean }){
        let where = '';

        if(filter){
            if(filter.isEnded != undefined)
                where = `automation.endedAt IS ${filter.isEnded ? 'NOT' : ''} NULL`;
        }

        const notes = await this.automationRepository
            .createQueryBuilder('automation')
            .where(where)
            .orderBy({
                'automation.id': 'DESC'
            })
            .getMany();

        return notes;
    }

    async getOneNoteById(id: number){
        const note = await this.noteRepository.findOneBy({ id });

        if(!note)
            throw new NotFoundException();

        return note
    }

    async getAutomationLastNoteById(id: number){
        const note: Note = await this.noteRepository
            .createQueryBuilder('note')
            .orderBy({
                'note.id': 'DESC'
            })
            .where('note.automationId = :id', { id })
            .getOne();

        if(!note)
            throw new NotFoundException();

        return note
    }

    async createAutomation(createAutomationDto: CreateAutomationDto){
        const automation = await this.automationRepository.save(createAutomationDto);

        return automation;
    }

    async createNote(createNoteDto: CreateNoteDto){
        const { automationId, image, status } = createNoteDto;
        const buffer = Buffer.from(image.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
        let filename = '';

        try{
            filename = Date.now() + '-' + Math.round(Math.random() * 1e9);
            filename += '.jpeg';
            const path = join(__dirname, '../../public', 'screenshots');

            fs.mkdirSync(path, { recursive: true });
            fs.writeFileSync(join(path, filename), buffer);
        }catch(error){
            console.error(error);
            throw new InternalServerErrorException('Error saving image');
        }
        
        return await this.noteRepository.save({
            automation: {
                id: automationId
            },
            status,
            image: filename
        })
    }

    async updateAutomation(id: number, endedAt: string){
        const automation = await this.automationRepository.findOneBy({ id });

        if(!automation)
            throw new NotFoundException();

        automation.endedAt = new Date(endedAt);

        await this.automationRepository.save(automation);

        const { id: lastId } = await this.getAutomationLastNoteById(id);

        await this.noteRepository.delete({ automation, id: Not(lastId) });

        return {
            success: true
        }
    }
}
