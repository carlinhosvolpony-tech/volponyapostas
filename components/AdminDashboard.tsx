
import React, { useState } from 'react';
import { User, UserRole, Match, Ticket, AppSettings, BalanceRequest } from '../types';

interface Props {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  tickets: Ticket[];
  setTickets?: React.Dispatch<React.SetStateAction<Ticket[]>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  balanceRequests: BalanceRequest[];
  setBalanceRequests: React.Dispatch<React.SetStateAction<BalanceRequest[]>>;
}

const AdminDashboard: React.FC<Props> = ({ 
  users, setUsers, matches, setMatches, tickets, setTickets, settings, setSettings, balanceRequests, setBalanceRequests 
}) => {
  const [tab, setTab] = useState<'EQUIPE' | 'JOGOS' | 'CONFIG'>('EQUIPE');
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.SUPERVISOR });
  const [adjustAmounts, setAdjustAmounts] = useState<Record<string, string>>({});

  const myDirectUsers = users.filter(u => u.parent_id === 'admin-1' && u.role !== UserRole.ADMIN);
  const pendingForMe = balanceRequests.filter(r => r.status === 'PENDING' && users.find(u => u.id === r.user_id)?.parent_id === 'admin-1');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.some(u => u.username === newUser.username)) return alert("Login já existe!");
    
    const user: User = { 
      id: Math.random().toString(36).substr(2, 9), 
      ...newUser, 
      commission_rate: newUser.role === UserRole.BOOKIE ? 20 : 10,
      balance: 0,
      parent_id: 'admin-1', 
      created_at: Date.now()
    };
    setUsers([...users, user]);
    setNewUser({ name: '', username: '', password: '', role: UserRole.SUPERVISOR });
    alert("Cadastrado com sucesso!");
  };

  const handleUpdateMatch = (id: string, field: keyof Match, value: string) => {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleApproveBalance = (req: BalanceRequest) => {
    const updatedUsers = users.map(u => u.id === req.user_id ? { ...u, balance: u.balance + req.amount } : u);
    setUsers(updatedUsers);
    setBalanceRequests(balanceRequests.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r));
    alert("Saldo aprovado e creditado!");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['EQUIPE', 'JOGOS', 'CONFIG'].map((t) => (
          <button 
            key={t}
            onClick={() => setTab(t as any)} 
            className={`px-8 py-4 rounded-2xl font-impact italic text-[11px] uppercase tracking-widest transition-all whitespace-nowrap ${tab === t ? 'bg-[#a3e635] text-black shadow-lg shadow-[#a3e635]/20' : 'bg-white/5 text-white/40'}`}
          >
            {t === 'EQUIPE' ? 'Rede' : t === 'JOGOS' ? 'Grade' : 'Config'}
          </button>
        ))}
      </div>

      {tab === 'EQUIPE' && (
        <div className="space-y-8">
          {pendingForMe.length > 0 && (
            <div className="space-y-4 animate-in slide-in-from-top-4">
               <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] px-2">Aguardando Aprovação de PIX</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingForMe.map(req => (
                    <div key={req.id} className="match-card p-6 rounded-[2rem] border-2 border-amber-500/30 flex justify-between items-center bg-amber-500/5">
                      <div>
                        <p className="text-[9px] font-black opacity-40 uppercase">{req.user_name}</p>
                        <p className="font-impact italic text-white text-2xl">R$ {req.amount.toFixed(2)}</p>
                      </div>
                      <button onClick={() => handleApproveBalance(req)} className="px-6 py-3 bg-[#a3e635] text-black font-impact italic rounded-xl uppercase text-[10px] hover:scale-105 transition-all shadow-lg">Liberar Crédito</button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="glass-card p-8 rounded-[2.5rem] border-t-4 border-[#a3e635]">
              <h3 className="text-xl font-impact italic uppercase mb-6 text-white">Novo Cadastro</h3>
              <form onSubmit={handleAddUser} className="space-y-4">
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none">
                  <option value={UserRole.SUPERVISOR}>SUPERVISOR</option>
                  <option value={UserRole.BOOKIE}>CAMBISTA</option>
                  <option value={UserRole.CLIENT}>APOSTADOR DIRETO</option>
                </select>
                <input required placeholder="Nome Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#a3e635] transition-all" />
                <input required placeholder="Login" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#a3e635] transition-all" />
                <input required type="password" placeholder="Senha" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#a3e635] transition-all" />
                <button className="w-full py-4 bg-[#a3e635] text-black font-impact italic rounded-xl uppercase text-xs shadow-lg hover:scale-[1.02] transition-all">Cadastrar</button>
              </form>
            </div>
            <div className="lg:col-span-2 space-y-4">
               <h3 className="text-[10px] font-black opacity-30 uppercase tracking-widest px-2">Gestão de Saldos da Rede Direta</h3>
              {myDirectUsers.map(u => (
                <div key={u.id} className="match-card p-4 rounded-3xl border border-white/5 flex justify-between items-center">
                  <div>
                    <p className="font-impact italic text-white uppercase text-xs">{u.name}</p>
                    <p className="text-[11px] text-[#a3e635] font-impact italic">Saldo: R$ {u.balance.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                     <input 
                      type="text" 
                      placeholder="R$" 
                      value={adjustAmounts[u.id] || ''} 
                      onChange={(e) => setAdjustAmounts({...adjustAmounts, [u.id]: e.target.value})} 
                      className="w-16 bg-black/40 border border-white/5 rounded-xl px-2 text-white text-[10px] outline-none text-center focus:border-[#a3e635]" 
                     />
                     <button onClick={() => {
                       const amt = parseFloat((adjustAmounts[u.id] || '0').replace(',', '.'));
                       if (amt > 0) setUsers(users.map(usr => usr.id === u.id ? {...usr, balance: usr.balance + amt} : usr));
                       setAdjustAmounts({...adjustAmounts, [u.id]: ''});
                     }} className="w-8 h-8 bg-[#a3e635] text-black rounded-lg font-black hover:scale-110 active:scale-90 transition-all shadow-lg">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'JOGOS' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-xl font-impact italic uppercase text-white">Editor da Grade Oficial</h3>
            <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">12 Jogos Obrigatórios</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((match, index) => (
              <div key={match.id} className="match-card p-6 rounded-[2.5rem] border border-white/5 space-y-4 relative overflow-hidden">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-[#a3e635] uppercase">Jogo #{index + 1}</span>
                  </div>
                  <div className="flex-1 ml-4">
                    <input 
                      value={match.league} 
                      onChange={(e) => handleUpdateMatch(match.id, 'league', e.target.value)}
                      className="w-full bg-white/5 px-3 py-1 rounded-lg text-[10px] font-black text-white/60 uppercase outline-none focus:text-[#a3e635] focus:bg-white/10 transition-all"
                      placeholder="NOME DA LIGA / CAMPEONATO"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black opacity-20 uppercase ml-2 tracking-widest">Casa</label>
                    <input 
                      value={match.home} 
                      onChange={(e) => handleUpdateMatch(match.id, 'home', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-impact italic text-white outline-none focus:border-[#a3e635] transition-all"
                      placeholder="TIME CASA"
                    />
                  </div>
                  <div className="text-white/10 font-black italic text-xs pt-4">VS</div>
                  <div className="space-y-1 text-right">
                    <label className="text-[8px] font-black opacity-20 uppercase mr-2 tracking-widest">Fora</label>
                    <input 
                      value={match.away} 
                      onChange={(e) => handleUpdateMatch(match.id, 'away', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-impact italic text-white outline-none focus:border-[#a3e635] text-right transition-all"
                      placeholder="TIME VISITANTE"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-white/5 mt-2">
                   <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                      <i className="fa-regular fa-clock text-[#a3e635] text-[10px]"></i>
                      <input 
                        value={match.time} 
                        onChange={(e) => handleUpdateMatch(match.id, 'time', e.target.value)}
                        className="bg-transparent text-[10px] font-black text-white outline-none focus:text-[#a3e635] w-14"
                        placeholder="16:00"
                      />
                   </div>
                   <div className="flex-1 text-[9px] font-black text-white/10 uppercase tracking-widest text-right italic">
                     Ajustes em tempo real
                   </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-10 glass-card rounded-[3rem] text-center border-dashed border-2 border-white/5">
            <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.5em]">As alterações são propagadas instantaneamente para todos os usuários</p>
          </div>
        </div>
      )}

      {tab === 'CONFIG' && (
        <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in-95">
          <div className="glass-card p-10 rounded-[3rem] border-t-4 border-[#a3e635] space-y-8 shadow-2xl">
            <h3 className="text-2xl font-impact italic uppercase text-white text-center">Configurações de Arena</h3>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black opacity-40 uppercase tracking-widest px-2">Chave PIX Oficial (Recebimento Direto)</label>
                <input 
                  value={settings.pix_key} 
                  onChange={e => setSettings({...settings, pix_key: e.target.value})} 
                  placeholder="admin@dgrau.com"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635] transition-all font-bold shadow-inner"
                />
              </div>

              <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                <div>
                  <p className="font-impact italic text-white uppercase text-sm">Status do Mercado</p>
                  <p className="text-[9px] font-black opacity-40 uppercase tracking-widest">Bloqueia novas apostas em toda a plataforma</p>
                </div>
                <button 
                  onClick={() => setSettings({...settings, is_market_open: !settings.is_market_open})}
                  className={`px-8 py-3 rounded-xl font-impact italic text-[11px] uppercase transition-all shadow-lg ${settings.is_market_open ? 'bg-[#a3e635] text-black shadow-[#a3e635]/20' : 'bg-red-600 text-white shadow-red-600/20'}`}
                >
                  {settings.is_market_open ? 'MERCADO ABERTO' : 'MERCADO FECHADO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
