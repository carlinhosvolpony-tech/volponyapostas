
import React, { useState } from 'react';
import { User, UserRole, Ticket, BalanceRequest } from '../types';

interface Props {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onDeleteUser: (id: string) => void;
  tickets: Ticket[];
  setTickets?: React.Dispatch<React.SetStateAction<Ticket[]>>;
  balanceRequests: BalanceRequest[];
  setBalanceRequests: React.Dispatch<React.SetStateAction<BalanceRequest[]>>;
}

const SupervisorDashboard: React.FC<Props> = ({ currentUser, setCurrentUser, users, setUsers, onDeleteUser, tickets, setTickets, balanceRequests, setBalanceRequests }) => {
  const [tab, setTab] = useState<'EQUIPE' | 'PRESTACAO' | 'CONFIG'>('EQUIPE');
  const [adjustAmounts, setAdjustAmounts] = useState<Record<string, string>>({});
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.BOOKIE });
  const [pixInput, setPixInput] = useState(currentUser.pix_key || '');

  const myNetwork = users.filter(u => u.parent_id === currentUser.id);
  const myNetworkIds = [currentUser.id, ...myNetwork.map(u => u.id)];
  const pendingForMe = balanceRequests.filter(r => r.status === 'PENDING' && users.find(u => u.id === r.user_id)?.parent_id === currentUser.id);
  
  // Cálculo Automático de Prestação de Contas da Rede
  const networkTickets = tickets.filter(t => myNetworkIds.includes(t.parent_id || '') || myNetworkIds.includes(t.user_id));
  const totalNetworkSales = networkTickets.reduce((sum, t) => sum + t.bet_amount, 0);
  const networkRetention = totalNetworkSales * (currentUser.commission_rate / 100);
  const toPayAdmin = totalNetworkSales - networkRetention;
  const saldoLiberado = currentUser.balance; // Saldo que ele recebeu do Admin para distribuir

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.some(u => u.username === newUser.username)) return alert("Login já existe!");
    const user: User = { 
      id: Math.random().toString(36).substr(2, 9), 
      ...newUser, commission_rate: newUser.role === UserRole.BOOKIE ? 20 : 0, balance: 0, parent_id: currentUser.id, created_at: Date.now()
    };
    setUsers([...users, user]);
    setNewUser({ name: '', username: '', password: '', role: UserRole.BOOKIE });
    alert("Membro cadastrado!");
  };

  const handleApproveBalance = (req: BalanceRequest) => {
    if (currentUser.balance < req.amount) return alert("Seu saldo de Supervisor é insuficiente!");
    
    const updatedUsers = users.map(u => {
      if (u.id === req.user_id) return { ...u, balance: u.balance + req.amount };
      if (u.id === currentUser.id) return { ...u, balance: u.balance - req.amount };
      return u;
    });
    setUsers(updatedUsers);
    const updatedMe = updatedUsers.find(u => u.id === currentUser.id);
    if (updatedMe) setCurrentUser(updatedMe);
    
    setBalanceRequests(balanceRequests.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r));
    alert("Saldo aprovado e transferido!");
  };

  const handleUpdatePix = () => {
    const updatedUser = { ...currentUser, pix_key: pixInput };
    setCurrentUser(updatedUser);
    setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    alert("Chave PIX de Supervisor atualizada!");
  };

  const handleTransfer = (memberId: string, isAdding: boolean) => {
    const amountStr = (adjustAmounts[memberId] || '0').replace(',', '.');
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return alert("Valor inválido!");
    if (isAdding && currentUser.balance < amount) return alert("Saldo insuficiente!");

    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) return { ...u, balance: u.balance - (isAdding ? amount : -amount) };
      if (u.id === memberId) return { ...u, balance: u.balance + (isAdding ? amount : -amount) };
      return u;
    });
    setUsers(updatedUsers);
    const updatedMe = updatedUsers.find(u => u.id === currentUser.id);
    if (updatedMe) setCurrentUser(updatedMe);
    setAdjustAmounts({ ...adjustAmounts, [memberId]: '' });
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
      <div className="flex gap-4 justify-center overflow-x-auto no-scrollbar">
        {['EQUIPE', 'PRESTACAO', 'CONFIG'].map(t => (
          <button 
            key={t}
            onClick={() => setTab(t as any)} 
            className={`px-8 py-4 rounded-2xl font-impact italic text-[10px] uppercase tracking-widest transition-all ${tab === t ? 'bg-[#a3e635] text-black shadow-lg shadow-[#a3e635]/20' : 'bg-white/5 text-white/40'}`}
          >
            {t === 'EQUIPE' ? 'Equipe' : t === 'PRESTACAO' ? 'Relatório' : 'Perfil'}
          </button>
        ))}
      </div>

      {tab === 'EQUIPE' && (
        <div className="space-y-8">
          {pendingForMe.length > 0 && (
            <div className="space-y-4 animate-in slide-in-from-top-4">
               <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] px-2">Pedidos de Recarga da Minha Rede</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingForMe.map(req => (
                    <div key={req.id} className="match-card p-6 rounded-[2rem] border-2 border-amber-500/30 flex justify-between items-center bg-amber-500/5">
                      <div>
                        <p className="text-[9px] font-black opacity-40 uppercase">{req.user_name}</p>
                        <p className="font-impact italic text-white text-2xl">R$ {req.amount.toFixed(2)}</p>
                      </div>
                      <button onClick={() => handleApproveBalance(req)} className="px-6 py-3 bg-[#a3e635] text-black font-impact italic rounded-xl uppercase text-[10px] hover:scale-105 transition-all shadow-lg">Aprovar Pedido</button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="glass-card p-8 rounded-[2.5rem] border-t-4 border-[#a3e635] h-fit">
              <h3 className="text-xl font-impact italic uppercase mb-6 text-white">Novo Membro</h3>
              <form onSubmit={handleAddUser} className="space-y-4">
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none">
                  <option value={UserRole.BOOKIE}>CAMBISTA</option>
                  <option value={UserRole.CLIENT}>APOSTADOR</option>
                </select>
                <input required placeholder="Nome" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none" />
                <input required placeholder="Login" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none" />
                <input required type="password" placeholder="Senha" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none" />
                <button className="w-full py-4 bg-[#a3e635] text-black font-impact italic rounded-xl uppercase text-xs">Cadastrar</button>
              </form>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-[10px] font-black opacity-30 uppercase tracking-widest px-2">Gestão de Saldo da Equipe Direta</h3>
              {myNetwork.map(u => (
                <div key={u.id} className="match-card p-5 rounded-3xl border border-white/5 flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => onDeleteUser(u.id)}
                      className="w-10 h-10 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center border border-red-500/20"
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                    <div>
                      <p className="font-impact italic text-white uppercase text-sm">{u.name}</p>
                      <p className="text-[10px] text-white/20 uppercase font-black">{u.role}</p>
                      <p className="text-[#a3e635] font-impact italic text-xs mt-1">Saldo: R$ {u.balance.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="R$" value={adjustAmounts[u.id] || ''} onChange={e => setAdjustAmounts({...adjustAmounts, [u.id]: e.target.value})} className="w-16 bg-black/40 border-white/5 border rounded-xl px-2 text-white text-[10px] outline-none" />
                    <button onClick={() => handleTransfer(u.id, true)} className="w-10 h-10 bg-[#a3e635] text-black rounded-xl font-black flex items-center justify-center shadow-lg shadow-[#a3e635]/10">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'PRESTACAO' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-6 rounded-[2rem] text-center border border-white/5">
              <p className="text-[9px] font-black opacity-30 uppercase mb-2">Saldo Liberado</p>
              <h4 className="text-xl font-impact italic text-[#a3e635]">R$ {saldoLiberado.toFixed(2)}</h4>
            </div>
            <div className="glass-card p-6 rounded-[2rem] text-center border border-white/5">
              <p className="text-[9px] font-black opacity-30 uppercase mb-2">Apostas da Rede</p>
              <h4 className="text-xl font-impact italic text-white">R$ {totalNetworkSales.toFixed(2)}</h4>
            </div>
            <div className="glass-card p-6 rounded-[2rem] text-center border border-[#a3e635]/20">
              <p className="text-[9px] font-black text-[#a3e635] uppercase mb-2">Retenção ({currentUser.commission_rate}%)</p>
              <h4 className="text-xl font-impact italic text-[#a3e635]">R$ {networkRetention.toFixed(2)}</h4>
            </div>
            <div className="bg-[#a3e635] p-6 rounded-[2rem] text-center border-2 border-black">
              <p className="text-[9px] font-black text-black/60 uppercase mb-2">Pagar à Diretoria</p>
              <h4 className="text-xl font-impact italic text-black">R$ {toPayAdmin.toFixed(2)}</h4>
            </div>
          </div>

          <div className="glass-card p-8 rounded-[3rem] border border-white/5">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase opacity-40 tracking-widest">Desempenho da Rede Consolidado</h3>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-[#a3e635] rounded-full animate-pulse shadow-[0_0_5px_#a3e635]"></div>
                   <span className="text-[8px] font-black opacity-20 uppercase">Tempo Real</span>
                </div>
             </div>
             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
               {myNetwork.length === 0 ? (
                 <p className="text-center py-10 opacity-20 font-black uppercase text-[10px]">Nenhum membro vinculado à sua rede</p>
               ) : (
                 myNetwork.map(u => {
                   const uTickets = tickets.filter(t => t.parent_id === u.id || t.user_id === u.id);
                   const uSales = uTickets.reduce((s, t) => s + t.bet_amount, 0);
                   return (
                     <div key={u.id} className="flex justify-between items-center p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                       <div>
                         <p className="text-[8px] font-black text-[#a3e635] uppercase tracking-tighter">{u.role}</p>
                         <p className="text-sm font-impact italic text-white uppercase">{u.name}</p>
                         <p className="text-[9px] font-black opacity-20 uppercase">Saldo em Mãos: R$ {u.balance.toFixed(2)}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[9px] font-black opacity-30 uppercase">Volume de Vendas</p>
                         <p className="font-impact italic text-white text-lg">R$ {uSales.toFixed(2)}</p>
                       </div>
                     </div>
                   );
                 })
               )}
             </div>
          </div>
        </div>
      )}

      {tab === 'CONFIG' && (
        <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
          <div className="glass-card p-10 rounded-[3rem] border-t-4 border-[#a3e635] space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-impact italic uppercase text-white mb-2">Perfil de Supervisor</h3>
              <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.3em]">Configure sua Chave PIX</p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black opacity-40 uppercase tracking-widest px-2">Sua Chave PIX de Recebimento</label>
                <input 
                  value={pixInput} 
                  onChange={e => setPixInput(e.target.value)} 
                  placeholder="Seu PIX (CPF, E-mail, Celular...)"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635] transition-all font-bold"
                />
              </div>
              
              <button 
                onClick={handleUpdatePix}
                className="w-full py-5 bg-[#a3e635] text-black font-impact italic rounded-2xl uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
              >
                Salvar Chave PIX
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorDashboard;
