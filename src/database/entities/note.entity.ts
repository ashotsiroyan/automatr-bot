import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Automation } from './automation.entity';

export enum Status {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  Retrying = 'retrying',
  Skipped = 'skipped'
}

@Entity('note')
export class Note {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Automation, (automation) => automation.notes, { onDelete: 'CASCADE' })
  automation: Automation;

  @Column({ type: 'enum', enum: Status, default: Status.Pending })
  status: Status;

  @Column({ type: 'bytea', nullable: true })
  imageData: Buffer;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}