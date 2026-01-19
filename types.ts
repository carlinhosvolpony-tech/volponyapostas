
export enum UserRole {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  BOOKIE = 'BOOKIE',
  CLIENT = 'CLIENT'
}

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  balance: number;
  parent_id?: string | null;
  commission_rate: number;
  pix_key?: string;
  whatsapp?: string;
  created_at?: number;
}

export interface Match {
  id: string;
  home: string;
  away: string;
  label: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  user_name: string;
  bet_amount: number;
  potential_prize: number;
  status: 'PENDENTE' | 'VALIDADO' | 'GANHOU' | 'PERDEU';
  is_settled: boolean;
  timestamp: number;
  parent_id?: string;
  matches: Match[];
  picks: string[]; // Array de 12 strings: "CASA", "EMPATE" ou "FORA"
}

export interface AppSettings {
  pix_key: string;
  is_market_open: boolean;
  prize_multiplier: number;
}

export interface Settlement {
  id: string;
  from_id: string;
  to_id: string;
  from_name: string;
  total_volume: number;
  commission_amount: number;
  net_amount: number;
  status: 'PENDENTE' | 'PAGO' | 'CONCLUIDO';
  timestamp: number;
  ticket_ids: string[];
}
