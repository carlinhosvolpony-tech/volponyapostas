
import React, { useState } from 'react';
import { User, UserRole, Match, Ticket, AppSettings, BalanceRequest } from '../types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

interface Props {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onDeleteUser: (id: string) => void;
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  tickets: Ticket[];
  setTickets?: React.Dispatch<React.SetStateAction<Ticket[]>>;
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  balanceRequests: BalanceRequest[];
  setBalanceRequests: React.Dispatch<React.SetStateAction<BalanceRequest[]>>;
  currentUser: User;
  onUpdateSingleUser: (u: User) => void;
}

const AdminDashboard: React.FC<Props> = ({ 
  users, setUsers, onDeleteUser, matches, setMatches, tickets, setTickets, settings, setSettings, balanceRequests, setBalanceRequests, currentUser, onUpdateSingleUser 
}) => {
  const [tab, setTab] = useState<'EQUIPE' | 'FINANCEIRO' | 'JOGOS' | 'CONFIG'>('EQUIPE');
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.SUPERVISOR });
  const [adjustAmounts, setAdjustAmounts] = useState<Record<string, string>>({});
  
  const [adminAuth, setAdminAuth] = useState({
    username: currentUser.username,
    password: currentUser.password
  });

  const myDirectUsers = users.filter(u => u.parent_id === 'admin-1' && u.role !== UserRole.ADMIN);
  const pendingForMe = balanceRequests.filter(r => r.status === 'PENDING' && users.find(u => u.id === r.user_id)?.parent_id === 'admin-1');

  // Cálculos Financeiros Globais
  const networkTickets = tickets; // Como Admin Master, vê tudo
  const totalNetworkSales = networkTickets.reduce((sum, t) => sum + t.bet_amount, 0);
  
  // Cálculo de comissões estimadas (Supervisores + Cambistas)
  const totalCommissions = users.reduce((sum, u) => {
    const userTickets = tickets.filter(t => t.user_id === u.id || t.parent_id === u.id);
    const sales = userTickets.reduce((s, t) => s + t.bet_amount, 0);
    return sum + (sales * (u.commission_rate / 100));
  }, 0);

  const netProfit = totalNetworkSales - totalCommissions;

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

  const handleApproveBalance = async (req: BalanceRequest) => {
    const updatedUsers = users.map(u => u.id === req.user_id ? { ...u, balance: u.balance + req.amount } : u);
    const targetUser = updatedUsers.find(u => u.id === req.user_id);
    
    setUsers(updatedUsers);
    if (isSupabaseConfigured && targetUser) {
      await supabase.from('users').update({ balance: targetUser.balance }).eq('id', targetUser.id);
    }

    setBalanceRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r));
    if (isSupabaseConfigured) {
      await supabase.from('balance_requests').update({ status: 'APPROVED' }).eq('id', req.id);
    }
    alert("Saldo aprovado e creditado!");
  };

  const handleRejectBalance = async (req: BalanceRequest) => {
    if (!confirm("Deseja realmente recusar este pedido de saldo?")) return;
    
    setBalanceRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'REJECTED' } : r));
    if (isSupabaseConfigured) {
      await supabase.from('balance_requests').update({ status: 'REJECTED' }).eq('id', req.id);
    }
    alert("Pedido recusado com sucesso.");
  };

  const handleUpdateAdminAuth = () => {
    if (!adminAuth.username || !adminAuth.password) return alert("Preencha o login e a senha!");
    if (users.some(u => u.username === adminAuth.username && u.id !== currentUser.id)) {
      return alert("Este login já está sendo usado por outro membro da rede!");
    }
    const updatedAdmin = { ...currentUser, ...adminAuth };
    onUpdateSingleUser(updatedAdmin);
    alert("Dados de acesso Master atualizados com sucesso!");
  };

  const handleResetBalance = async (userId: string) => {
    if (!confirm("Isso irá ZERAR o saldo do usuário. Use para confirmar recebimento de prestação de contas. Continuar?")) return;
    const updatedUsers = users.map(u => u.id === userId ? { ...u, balance: 0 } : u);
    setUsers(updatedUsers);
    if (isSupabaseConfigured) await supabase.from('users').update({ balance: 0 }).eq('id', userId);
    alert("Saldo zerado com sucesso!");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['EQUIPE', 'FINANCEIRO', 'JOGOS', 'CONFIG'].map((t) => (
          <button 
            key={t}
            onClick={() => setTab(t as any)} 
            className={`px-8 py-4 rounded-2xl font-impact italic text-[11px] uppercase tracking-widest transition-all whitespace-nowrap ${tab === t ? 'bg-[#a3e635] text-black shadow-lg shadow-[#a3e635]/20' : 'bg-white/5 text-white/40'}`}
          >
            {t === 'EQUIPE' ? 'Rede' : t === 'FINANCEIRO' ? 'Financeiro' : t === 'JOGOS' ? 'Grade' : 'Config'}
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
                      <div className="flex gap-2">
                        <button onClick={() => handleRejectBalance(req)} className="px-4 py-3 bg-red-600/10 text-red-500 border border-red-600/20 font-impact italic rounded-xl uppercase text-[10px] hover:bg-red-600 hover:text-white transition-all">Recusar</button>
                        <button onClick={() => handleApproveBalance(req)} className="px-6 py-3 bg-[#a3e635] text-black font-impact italic rounded-xl uppercase text-[10px] hover:scale-105 transition-all shadow-lg">Liberar Crédito</button>
                      </div>
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
               <h3 className="text-[10px] font-black opacity-30 uppercase tracking-widest px-2">Gestão da Rede Direta</h3>
              {myDirectUsers.map(u => (
                <div key={u.id} className="match-card p-4 rounded-3xl border border-white/5 flex justify-between items-center group relative">
                  <div className="flex items-center gap-4">
                    <button onClick={() => onDeleteUser(u.id)} className="w-10 h-10 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center border border-red-500/20">
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                    <div>
                      <p className="font-impact italic text-white uppercase text-xs">{u.name}</p>
                      <p className="text-[11px] text-[#a3e635] font-impact italic">Saldo: R$ {u.balance.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <input type="text" placeholder="R$" value={adjustAmounts[u.id] || ''} onChange={(e) => setAdjustAmounts({...adjustAmounts, [u.id]: e.target.value})} className="w-16 bg-black/40 border border-white/5 rounded-xl px-2 text-white text-[10px] outline-none text-center focus:border-[#a3e635]" />
                     <button onClick={() => {
                       const amt = parseFloat((adjustAmounts[u.id] || '0').replace(',', '.'));
                       if (amt > 0) {
                         const updatedUsers = users.map(usr => usr.id === u.id ? {...usr, balance: usr.balance + amt} : usr);
                         setUsers(updatedUsers);
                         if (isSupabaseConfigured) supabase.from('users').update({ balance: u.balance + amt }).eq('id', u.id);
                       }
                       setAdjustAmounts({...adjustAmounts, [u.id]: ''});
                     }} className="w-8 h-8 bg-[#a3e635] text-black rounded-lg font-black hover:scale-110 active:scale-90 transition-all shadow-lg">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'FINANCEIRO' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-6">
          {/* Dashboard Geral Admin */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-8 rounded-[2.5rem] border-l-4 border-[#a3e635]">
              <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Vendas da Rede</p>
              <p className="text-4xl font-impact italic text-white">R$ {totalNetworkSales.toFixed(2)}</p>
            </div>
            <div className="glass-card p-8 rounded-[2.5rem] border-l-4 border-amber-500">
              <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Comissões da Equipe</p>
              <p className="text-4xl font-impact italic text-amber-500">R$ {totalCommissions.toFixed(2)}</p>
            </div>
            <div className="glass-card p-8 rounded-[2.5rem] border-l-4 border-blue-500">
              <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Lucro Diretoria</p>
              <p className="text-4xl font-impact italic text-blue-500">R$ {netProfit.toFixed(2)}</p>
            </div>
          </div>

          <div className="glass-card p-8 rounded-[3rem] border border-white/5">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-impact italic uppercase text-white">Relatório por Membro</h3>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-[#a3e635] rounded-full animate-pulse"></div>
                 <span className="text-[9px] font-black opacity-20 uppercase">Dados em Tempo Real</span>
               </div>
             </div>

             <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {users.filter(u => u.role !== UserRole.ADMIN).map(member => {
                  const memberTickets = tickets.filter(t => t.user_id === member.id || t.parent_id === member.id);
                  const memberSales = memberTickets.reduce((s, t) => s + t.bet_amount, 0);
                  const memberComm = memberSales * (member.commission_rate / 100);

                  return (
                    <div key={member.id} className="match-card p-6 rounded-[2rem] border border-white/5 grid grid-cols-1 lg:grid-cols-4 items-center gap-6">
                      <div>
                        <p className="text-[9px] font-black opacity-30 uppercase mb-1">{member.role}</p>
                        <p className="font-impact italic text-white text-lg uppercase">{member.name}</p>
                        <p className="text-[10px] font-black text-[#a3e635] opacity-50">@{member.username}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 lg:col-span-2">
                        <div className="bg-black/20 p-3 rounded-2xl text-center">
                          <p className="text-[8px] font-black opacity-30 uppercase">Total Vendas</p>
                          <p className="font-impact italic text-white">R$ {memberSales.toFixed(2)}</p>
                        </div>
                        <div className="bg-black/20 p-3 rounded-2xl text-center">
                          <p className="text-[8px] font-black opacity-30 uppercase">Comissão ({member.commission_rate}%)</p>
                          <p className="font-impact italic text-amber-500">R$ {memberComm.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-6">
                        <div className="text-right">
                           <p className="text-[8px] font-black opacity-30 uppercase">Saldo devedor</p>
                           <p className={`font-impact italic text-xl ${member.balance > 0 ? 'text-red-500' : 'text-[#a3e635]'}`}>
                             R$ {member.balance.toFixed(2)}
                           </p>
                        </div>
                        <button 
                          onClick={() => handleResetBalance(member.id)}
                          title="Zerar Saldo (Prestação de Contas)"
                          className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40 hover:text-[#a3e635] hover:border-[#a3e635]/50 transition-all active:scale-90"
                        >
                          <i className="fa-solid fa-rotate-left"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                    <input value={match.league} onChange={(e) => handleUpdateMatch(match.id, 'league', e.target.value)} className="w-full bg-white/5 px-3 py-1 rounded-lg text-[10px] font-black text-white/60 uppercase outline-none focus:text-[#a3e635] focus:bg-white/10 transition-all" placeholder="NOME DA LIGA" />
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black opacity-20 uppercase ml-2 tracking-widest">Casa</label>
                    <input value={match.home} onChange={(e) => handleUpdateMatch(match.id, 'home', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-impact italic text-white outline-none focus:border-[#a3e635] transition-all" placeholder="TIME CASA" />
                  </div>
                  <div className="text-white/10 font-black italic text-xs pt-4">VS</div>
                  <div className="space-y-1 text-right">
                    <label className="text-[8px] font-black opacity-20 uppercase mr-2 tracking-widest">Fora</label>
                    <input value={match.away} onChange={(e) => handleUpdateMatch(match.id, 'away', e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-impact italic text-white outline-none focus:border-[#a3e635] text-right transition-all" placeholder="TIME VISITANTE" />
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-2 border-t border-white/5 mt-2">
                   <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                      <i className="fa-regular fa-clock text-[#a3e635] text-[10px]"></i>
                      <input value={match.time} onChange={(e) => handleUpdateMatch(match.id, 'time', e.target.value)} className="bg-transparent text-[10px] font-black text-white outline-none focus:text-[#a3e635] w-14" placeholder="16:00" />
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'CONFIG' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card p-8 rounded-[3rem] border-t-4 border-[#a3e635] space-y-6 shadow-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#a3e635]/10 rounded-2xl flex items-center justify-center text-[#a3e635]">
                   <i className="fa-solid fa-gears text-xl"></i>
                </div>
                <h3 className="text-xl font-impact italic uppercase text-white">Arena Mestra</h3>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black opacity-40 uppercase tracking-widest px-2">Chave PIX Recebimento</label>
                  <input value={settings.pix_key} onChange={e => setSettings({...settings, pix_key: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#a3e635] transition-all font-bold text-sm" />
                </div>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                  <p className="font-impact italic text-white uppercase text-xs mb-3">Status do Mercado</p>
                  <button onClick={() => setSettings({...settings, is_market_open: !settings.is_market_open})} className={`w-full py-3 rounded-xl font-impact italic text-[10px] uppercase transition-all shadow-lg ${settings.is_market_open ? 'bg-[#a3e635] text-black' : 'bg-red-600 text-white'}`}>
                    {settings.is_market_open ? 'MERCADO ABERTO' : 'MERCADO FECHADO'}
                  </button>
                </div>
              </div>
            </div>
            <div className="glass-card p-8 rounded-[3rem] border-t-4 border-blue-500 space-y-6 shadow-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                   <i className="fa-solid fa-user-shield text-xl"></i>
                </div>
                <h3 className="text-xl font-impact italic uppercase text-white">Segurança Master</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black opacity-40 uppercase tracking-widest px-2">Novo Login Master</label>
                  <input value={adminAuth.username} onChange={e => setAdminAuth({...adminAuth, username: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all font-bold text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black opacity-40 uppercase tracking-widest px-2">Nova Senha Master</label>
                  <input type="text" value={adminAuth.password} onChange={e => setAdminAuth({...adminAuth, password: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all font-bold text-sm" />
                </div>
                <button onClick={handleUpdateAdminAuth} className="w-full py-4 bg-blue-600 text-white font-impact italic rounded-xl uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20">Atualizar Acesso Admin</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
