import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DatabaseController } from './database.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Automation } from './entities/automation.entity';
import { Note } from './entities/note.entity';
import { Action } from './entities/action.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Automation, Note, Action]),
  ],
  controllers: [DatabaseController],
  providers: [DatabaseService],
  exports: [DatabaseService]
})
export class DatabaseModule {}
