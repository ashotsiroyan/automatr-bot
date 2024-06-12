import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Automation } from './entities/automation.entity';
import { Repository } from 'typeorm';
import { Note } from './entities/note.entity';

@Injectable()
export class DatabaseService {
    constructor(
        @InjectRepository(Automation)
        private automationRepository: Repository<Automation>,
    
        @InjectRepository(Note)
        private noteRepository: Repository<Note>
    ) {}
}
