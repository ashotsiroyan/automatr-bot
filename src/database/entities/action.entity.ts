import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
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

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}