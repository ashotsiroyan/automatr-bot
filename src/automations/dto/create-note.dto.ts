import { Status } from '../entities/note.entity';

export class CreateNoteDto {
  automationId: number;
  status: Status;
  image: string;
  sendToChannel?: boolean;
}
