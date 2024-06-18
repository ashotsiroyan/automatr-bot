import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { AutomationsService } from './automations.service';

@Controller('api')
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Post('notes')
  createNote(@Body() createNoteDto: CreateNoteDto){
    return this.automationsService.createNote(createNoteDto);
  }

  @Post('automations')
  createAutomation(@Body() createAutomationDto: CreateAutomationDto){
    return this.automationsService.createAutomation(createAutomationDto);
  }

  @Put('automations/:id')
  updateAutomation(@Param('id') id: string, @Body('endedAt') endedAt: string){
    return this.automationsService.updateAutomation(+id, endedAt);
  }
}
