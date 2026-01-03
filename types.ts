
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
  commission_rate: number; // Porcentagem de comissão (ex: 10 para 10%)
  pix_key?: string;
  created_at?: number;
}

export interface Match {
  id: string;
  home: string;
  away: string;
  league: string;
  time: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  user_name: string;
  bet_amount: number;
  potential_prize: number;
  status: 'PENDENTE' | 'VALIDADO' | 'GANHOU' | 'PERDEU';
  is_settled: boolean; // Se já foi prestado contas com o superior
  timestamp: number;
  parent_id?: string; // ID do Cambista/Supervisor que validou
  matches: Match[];
  picks: string[];
}

export interface AppSettings {
  pix_key: string;
  is_market_open: boolean;
}

export interface BalanceRequest {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: number;
}
