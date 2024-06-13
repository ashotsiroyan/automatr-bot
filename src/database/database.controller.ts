import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateAutomationDto } from './dto/create-automation.dto';

@Controller('api')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Post('notes')
  createNote(@Body() createNoteDto: CreateNoteDto){
    return this.databaseService.createNote(createNoteDto);
  }

  @Post('automations')
  createAutomation(@Body() createAutomationDto: CreateAutomationDto){
    return this.databaseService.createAutomation(createAutomationDto);
  }

  @Put('automations/:id')
  updateAutomation(@Param('id') id: string, @Body('endedAt') endedAt: string){
    return this.databaseService.updateAutomation(+id, endedAt);
  }
}
