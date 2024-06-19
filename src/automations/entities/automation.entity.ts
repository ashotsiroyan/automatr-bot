import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Note } from './note.entity';
import { Action } from './action.entity';

@Entity('automation')
export class Automation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @CreateDateColumn({ name: 'startedAt' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @ManyToOne(() => Action, (action) => action.automations, { nullable: true })
  action: Action;

  @Column({ type: 'varchar', nullable: true })
  uuid: string;

  @OneToMany(() => Note, (note) => note.automation)
  notes: Note[];
}
