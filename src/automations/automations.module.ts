import { Module } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Automation } from './entities/automation.entity';
import { Note } from './entities/note.entity';
import { Action } from './entities/action.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Automation, Note, Action]),
  ],
  controllers: [AutomationsController],
  providers: [AutomationsService],
  exports: [AutomationsService]
})
export class AutomationsModule {}
