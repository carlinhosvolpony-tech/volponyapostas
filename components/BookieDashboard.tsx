
import React, { useState } from 'react';
import { User, UserRole, Ticket, BalanceRequest } from '../types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

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

const BookieDashboard: React.FC<Props> = ({ currentUser, setCurrentUser, users, setUsers, onDeleteUser, tickets, setTickets, balanceRequests, setBalanceRequests }) => {
  const [tab, setTab] = useState<'EQUIPE' | 'PRESTACAO' | 'CONFIG'>('EQUIPE');
  const [adjustAmounts, setAdjustAmounts] = useState<Record<string, string>>({});
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '' });
  const [pixInput, setPixInput] = useState(currentUser.pix_key || '');

  const myClients = users.filter(u => u.parent_id === currentUser.id);
  const pendingForMe = balanceRequests.filter(r => r.status === 'PENDING' && users.find(u => u.id === r.user_id)?.parent_id === currentUser.id);
  
  const myTicketSales = tickets.filter(t => t.parent_id === currentUser.id || t.user_id === currentUser.id);
  const totalSales = myTicketSales.reduce((sum, t) => sum + t.bet_amount, 0);
  const myCommission = totalSales * (currentUser.commission_rate / 100);
  const toPaySupervisor = totalSales - myCommission;
  const saldoLiberado = currentUser.balance;

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.some(u => u.username === newUser.username)) return alert("Login já existe!");
    const client: User = { 
      id: Math.random().toString(36).substr(2, 9), 
      ...newUser, role: UserRole.CLIENT, balance: 0, commission_rate: 0, parent_id: currentUser.id, created_at: Date.now()
    };
    setUsers([...users, client]);
    setNewUser({ name: '', username: '', password: '' });
    alert("Atleta cadastrado!");
  };

  const handleApproveBalance = async (req: BalanceRequest) => {
    if (currentUser.balance < req.amount) return alert("Seu saldo de Cambista é insuficiente!");
    
    const updatedUsers = users.map(u => {
      if (u.id === req.user_id) return { ...u, balance: u.balance + req.amount };
      if (u.id === currentUser.id) return { ...u, balance: u.balance - req.amount };
      return u;
    });
    setUsers(updatedUsers);
    const updatedMe = updatedUsers.find(u => u.id === currentUser.id);
    const updatedTarget = updatedUsers.find(u => u.id === req.user_id);
    
    if (updatedMe) {
        setCurrentUser(updatedMe);
        if (isSupabaseConfigured) await supabase.from('users').update({ balance: updatedMe.balance }).eq('id', updatedMe.id);
    }
    if (isSupabaseConfigured && updatedTarget) {
        await supabase.from('users').update({ balance: updatedTarget.balance }).eq('id', updatedTarget.id);
    }
    
    setBalanceRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r));
    if (isSupabaseConfigured) await supabase.from('balance_requests').update({ status: 'APPROVED' }).eq('id', req.id);
    alert("Saldo aprovado e transferido ao atleta!");
  };

  const handleRejectBalance = async (req: BalanceRequest) => {
    if (!confirm("Deseja realmente recusar este pedido de recarga?")) return;
    
    setBalanceRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'REJECTED' } : r));
    if (isSupabaseConfigured) {
      await supabase.from('balance_requests').update({ status: 'REJECTED' }).eq('id', req.id);
    }
    alert("Pedido recusado.");
  };

  const handleUpdatePix = () => {
    const updatedUser = { ...currentUser, pix_key: pixInput };
    setCurrentUser(updatedUser);
    setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    if (isSupabaseConfigured) supabase.from('users').update({ pix_key: pixInput }).eq('id', currentUser.id);
    alert("Sua chave PIX foi atualizada!");
  };

  const handleTransfer = async (clientId: string, isAdding: boolean = true) => {
    const amountStr = (adjustAmounts[clientId] || '0').replace(',', '.');
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return alert("Valor inválido!");
    if (isAdding && currentUser.balance < amount) return alert("Seu saldo de Cambista é insuficiente!");

    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) return { ...u, balance: u.balance - (isAdding ? amount : -amount) };
      if (u.id === clientId) return { ...u, balance: u.balance + (isAdding ? amount : -amount) };
      return u;
    });
    setUsers(updatedUsers);
    const updatedMe = updatedUsers.find(u => u.id === currentUser.id);
    const updatedClient = updatedUsers.find(u => u.id === clientId);

    if (updatedMe) {
        setCurrentUser(updatedMe);
        if (isSupabaseConfigured) await supabase.from('users').update({ balance: updatedMe.balance }).eq('id', updatedMe.id);
    }
    if (isSupabaseConfigured && updatedClient) {
        await supabase.from('users').update({ balance: updatedClient.balance }).eq('id', updatedClient.id);
    }
    setAdjustAmounts({ ...adjustAmounts, [clientId]: '' });
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">
      <div className="flex gap-2 justify-center overflow-x-auto no-scrollbar">
        {['EQUIPE', 'PRESTACAO', 'CONFIG'].map(t => (
          <button 
            key={t}
            onClick={() => setTab(t as any)} 
            className={`px-6 py-4 rounded-2xl font-impact italic text-[10px] uppercase tracking-widest transition-all ${tab === t ? 'bg-[#a3e635] text-black shadow-lg shadow-[#a3e635]/20' : 'bg-white/5 text-white/40'}`}
          >
            {t === 'EQUIPE' ? 'Atletas' : t === 'PRESTACAO' ? 'Relatório' : 'Perfil'}
          </button>
        ))}
      </div>

      {tab === 'EQUIPE' && (
        <div className="space-y-8">
          {pendingForMe.length > 0 && (
            <div className="space-y-4 animate-in slide-in-from-top-4">
               <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] px-2">Pedidos de Recarga dos Meus Atletas</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingForMe.map(req => (
                    <div key={req.id} className="match-card p-6 rounded-[2rem] border-2 border-amber-500/30 flex justify-between items-center bg-amber-500/5">
                      <div>
                        <p className="text-[9px] font-black opacity-40 uppercase">{req.user_name}</p>
                        <p className="font-impact italic text-white text-2xl">R$ {req.amount.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleRejectBalance(req)} className="px-4 py-3 bg-red-600/10 text-red-500 border border-red-600/20 font-impact italic rounded-xl uppercase text-[10px] hover:bg-red-600 hover:text-white transition-all">Recusar</button>
                        <button onClick={() => handleApproveBalance(req)} className="px-6 py-3 bg-[#a3e635] text-black font-impact italic rounded-xl uppercase text-[10px] hover:scale-105 transition-all shadow-lg">Aprovar PIX</button>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="glass-card p-8 rounded-[2.5rem] border-t-4 border-[#a3e635] h-fit">
              <h3 className="text-xl font-impact italic uppercase mb-6 text-white">Novo Atleta</h3>
              <form onSubmit={handleAddClient} className="space-y-4">
                <input required placeholder="Nome" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none" />
                <input required placeholder="Login" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none" />
                <input required type="password" placeholder="Senha" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none" />
                <button className="w-full py-4 bg-[#a3e635] text-black font-impact italic rounded-xl uppercase text-xs">Cadastrar</button>
              </form>
            </div>
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-[10px] font-black opacity-30 uppercase tracking-widest px-2">Gestão de Saldo dos Atletas</h3>
              {myClients.map(u => (
                <div key={u.id} className="match-card p-5 rounded-3xl border border-white/5 flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <button onClick={() => onDeleteUser(u.id)} className="w-10 h-10 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center border border-red-500/20">
                      <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                    <div>
                      <p className="font-impact italic text-white uppercase text-xs">{u.name}</p>
                      <p className="text-[#a3e635] font-impact italic text-xs mt-1">Saldo: R$ {u.balance.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="R$" value={adjustAmounts[u.id] || ''} onChange={e => setAdjustAmounts({...adjustAmounts, [u.id]: e.target.value})} className="w-16 bg-black/40 border-white/5 border rounded-xl px-2 text-white text-[10px] outline-none text-center" />
                    <button onClick={() => handleTransfer(u.id, true)} className="px-4 py-2 bg-[#a3e635] text-black rounded-xl text-[10px] font-black uppercase shadow-lg shadow-[#a3e635]/10">Recarga</button>
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
              <p className="text-[9px] font-black opacity-30 uppercase mb-2">Apostas Feitas</p>
              <h4 className="text-xl font-impact italic text-white">R$ {totalSales.toFixed(2)}</h4>
            </div>
            <div className="glass-card p-6 rounded-[2rem] text-center border border-[#a3e635]/20">
              <p className="text-[9px] font-black text-[#a3e635] uppercase mb-2">Comissão ({currentUser.commission_rate}%)</p>
              <h4 className="text-xl font-impact italic text-[#a3e635]">R$ {myCommission.toFixed(2)}</h4>
            </div>
            <div className="bg-[#a3e635] p-6 rounded-[2rem] text-center border-2 border-black">
              <p className="text-[9px] font-black text-black/60 uppercase mb-2">Pagar Supervisor</p>
              <h4 className="text-xl font-impact italic text-black">R$ {toPaySupervisor.toFixed(2)}</h4>
            </div>
          </div>
          <div className="glass-card p-8 rounded-[3rem] border border-white/5">
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-xs font-black uppercase opacity-40 tracking-widest">Extrato de Vendas</h3>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-[#a3e635] rounded-full animate-pulse"></div>
                 <span className="text-[8px] font-black opacity-20 uppercase">Atualizado</span>
               </div>
             </div>
             <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
               {myTicketSales.length === 0 ? (
                 <p className="text-center py-10 opacity-20 font-black uppercase text-[10px]">Nenhuma venda registrada</p>
               ) : (
                 myTicketSales.map(t => (
                   <div key={t.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                     <div>
                       <div className="flex items-center gap-2">
                         <p className="text-[8px] font-black text-[#a3e635] uppercase">{t.id}</p>
                       </div>
                       <p className="text-xs font-bold text-white uppercase">{t.user_name}</p>
                     </div>
                     <div className="text-right">
                       <p className="font-impact italic text-white">R$ {t.bet_amount.toFixed(2)}</p>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      )}

      {tab === 'CONFIG' && (
        <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
          <div className="glass-card p-10 rounded-[3rem] border-t-4 border-[#a3e635] space-y-8">
            <div className="text-center">
              <h3 className="text-2xl font-impact italic uppercase text-white mb-2">Meu Perfil de Cambista</h3>
              <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.3em]">Gestão da sua Chave PIX</p>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black opacity-40 uppercase tracking-widest px-2">Sua Chave PIX</label>
                <input value={pixInput} onChange={e => setPixInput(e.target.value)} placeholder="Seu PIX" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635] transition-all font-bold" />
              </div>
              <button onClick={handleUpdatePix} className="w-full py-5 bg-[#a3e635] text-black font-impact italic rounded-2xl uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all">Salvar Chave PIX</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookieDashboard;
