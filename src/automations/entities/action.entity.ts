import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Automation } from './automation.entity';
@Entity('action')
export class Action {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: false })
  slug: string;

  @Column({ type: 'varchar', nullable: false })
  apiKey: string;

  @Column({ type: 'int8', nullable: true })
  intervalMS: number;

  @Column({ type: 'varchar', length: 14, nullable: true })
  channelId: string;

  @OneToMany(() => Automation, (automation) => automation.action)
  automations: Automation[];

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}
