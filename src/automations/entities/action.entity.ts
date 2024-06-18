import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
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

  @OneToMany(() => Automation, (automation) => automation.action)
  automations: Automation[]

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}