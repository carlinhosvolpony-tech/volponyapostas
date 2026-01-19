
import React, { useState } from 'react';
import { User, UserRole, Ticket, Settlement } from '../types';

interface Props {
  currentUser: User;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onDeleteUser: (id: string) => void;
  tickets: Ticket[];
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
  settlements: Settlement[];
  setSettlements: React.Dispatch<React.SetStateAction<Settlement[]>>;
}

const BookieDashboard: React.FC<Props> = ({ currentUser, users, setUsers, onDeleteUser, tickets, settlements, setSettlements }) => {
  const [tab, setTab] = useState<'CLIENTS' | 'FINANCE'>('CLIENTS');
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '' });

  const myClients = users.filter(u => u.parent_id === currentUser.id && u.role === UserRole.CLIENT);
  const myValidatedTickets = tickets.filter(t => t.parent_id === currentUser.id && t.status !== 'PENDENTE' && !t.is_settled);
  const mySettlements = settlements.filter(s => s.from_id === currentUser.id);

  const totalVolume = myValidatedTickets.reduce((acc, t) => acc + t.bet_amount, 0);
  const commission = totalVolume * (currentUser.commission_rate / 100);
  const netDue = totalVolume - commission;

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.some(u => u.username === newUser.username)) return alert("Login já existe!");
    const client: User = { 
      id: Math.random().toString(36).substr(2, 9), ...newUser, role: UserRole.CLIENT, balance: 0, commission_rate: 0, parent_id: currentUser.id, created_at: Date.now()
    };
    setUsers([...users, client]);
    setNewUser({ name: '', username: '', password: '' });
    alert("Atleta cadastrado!");
  };

  const handleRequestSettlement = () => {
    if (totalVolume <= 0) return alert("Nenhum saldo para prestar contas!");
    const confirm = window.confirm(`Deseja fechar o caixa de R$ ${totalVolume.toFixed(2)} e solicitar acerto?`);
    if (!confirm) return;

    const newSettlement: Settlement = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      from_id: currentUser.id,
      from_name: currentUser.name,
      to_id: currentUser.parent_id || 'admin-1',
      total_volume: totalVolume,
      commission_amount: commission,
      net_amount: netDue,
      status: 'PENDENTE',
      timestamp: Date.now(),
      ticket_ids: myValidatedTickets.map(t => t.id)
    };

    setSettlements([newSettlement, ...settlements]);
    alert("Prestação de contas enviada ao seu supervisor!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="flex justify-center gap-4">
        <button onClick={() => setTab('CLIENTS')} className={`px-8 py-3 rounded-2xl font-impact italic text-xs uppercase tracking-widest transition-all ${tab === 'CLIENTS' ? 'bg-[#a3e635] text-black shadow-lg' : 'bg-white/5 text-white/40'}`}>Atletas</button>
        <button onClick={() => setTab('FINANCE')} className={`px-8 py-3 rounded-2xl font-impact italic text-xs uppercase tracking-widest transition-all ${tab === 'FINANCE' ? 'bg-[#a3e635] text-black shadow-lg' : 'bg-white/5 text-white/40'}`}>Financeiro</button>
      </div>

      {tab === 'CLIENTS' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
          <div className="glass-card p-10 rounded-[3rem] border-t-4 border-[#a3e635]">
            <h3 className="text-xl font-impact italic uppercase mb-8 text-white">Novo Atleta</h3>
            <form onSubmit={handleAddClient} className="space-y-6">
              <input required placeholder="Nome Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635]" />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Login" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635]" />
                <input required type="text" placeholder="Senha" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635]" />
              </div>
              <button className="w-full py-5 bg-[#a3e635] text-black font-impact italic rounded-2xl uppercase text-xs shadow-xl">CADASTRAR ATLETA</button>
            </form>
          </div>
          <div className="space-y-4">
            <h3 className="text-[10px] font-black opacity-30 uppercase tracking-widest px-4">Meus Atletas ({myClients.length})</h3>
            {myClients.map(u => (
              <div key={u.id} className="match-card p-6 rounded-[2rem] border border-white/5 flex justify-between items-center">
                <div>
                  <p className="font-impact italic text-white uppercase text-lg">{u.name}</p>
                  <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Login: {u.username}</p>
                </div>
                <button onClick={() => onDeleteUser(u.id)} className="w-12 h-12 bg-red-600/10 text-red-500 rounded-2xl border border-red-600/20"><i className="fa-solid fa-trash-can"></i></button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-8 rounded-[2.5rem] border-l-4 border-[#a3e635]">
              <p className="text-[9px] font-black opacity-30 uppercase tracking-widest mb-2">Vendas Brutas</p>
              <p className="text-3xl font-impact italic text-white">R$ {totalVolume.toFixed(2)}</p>
            </div>
            <div className="glass-card p-8 rounded-[2.5rem] border-l-4 border-[#fbbf24]">
              <p className="text-[9px] font-black opacity-30 uppercase tracking-widest mb-2">Comissão ({currentUser.commission_rate}%)</p>
              <p className="text-3xl font-impact italic text-[#fbbf24]">R$ {commission.toFixed(2)}</p>
            </div>
            <div className="glass-card p-8 rounded-[2.5rem] border-l-4 border-blue-500">
              <p className="text-[9px] font-black opacity-30 uppercase tracking-widest mb-2">Líquido p/ Supervisor</p>
              <p className="text-3xl font-impact italic text-blue-400">R$ {netDue.toFixed(2)}</p>
            </div>
          </div>

          <button onClick={handleRequestSettlement} disabled={totalVolume <= 0} className="w-full py-8 bg-[#a3e635] text-black font-impact italic rounded-[2.5rem] uppercase text-xl shadow-2xl disabled:opacity-30">FECHAR CAIXA E PRESTAR CONTAS</button>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black opacity-30 uppercase tracking-widest px-4">Histórico de Acertos</h3>
            {mySettlements.map(s => (
              <div key={s.id} className="glass-card p-6 rounded-3xl border border-white/5 flex justify-between items-center">
                <div>
                  <p className="font-impact italic text-white">#ACERTO-{s.id}</p>
                  <p className="text-[9px] font-black opacity-30 uppercase mt-1">{new Date(s.timestamp).toLocaleDateString()} - R$ {s.net_amount.toFixed(2)}</p>
                </div>
                <span className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase ${s.status === 'CONCLUIDO' ? 'bg-[#a3e635]/20 text-[#a3e635]' : 'bg-[#fbbf24]/20 text-[#fbbf24]'}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookieDashboard;
