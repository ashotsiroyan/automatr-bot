
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Note } from './note.entity';

@Entity('automation')
export class Automation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @OneToMany(() => Note, (note) => note.automation)
  notes: Note[];
}