
import React, { useState } from 'react';
import { User, UserRole, Ticket, Settlement } from '../types';

interface Props {
  currentUser: User;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onDeleteUser: (id: string) => void;
  tickets: Ticket[];
  settlements: Settlement[];
  setSettlements: React.Dispatch<React.SetStateAction<Settlement[]>>;
}

const SupervisorDashboard: React.FC<Props> = ({ currentUser, users, setUsers, onDeleteUser, settlements, setSettlements }) => {
  const [tab, setTab] = useState<'NETWORK' | 'FINANCE'>('NETWORK');
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', whatsapp: '', pix_key: '' });

  const myBookies = users.filter(u => u.parent_id === currentUser.id && u.role === UserRole.BOOKIE);
  const pendingFromBookies = settlements.filter(s => s.to_id === currentUser.id && s.status !== 'CONCLUIDO');
  const mySettlementsToAdmin = settlements.filter(s => s.from_id === currentUser.id);

  const handleUpdateSettlement = (id: string, status: Settlement['status']) => {
    setSettlements(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleAddBookie = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.some(u => u.username === newUser.username)) return alert("Login já existe!");
    const bookie: User = { 
      id: Math.random().toString(36).substr(2, 9), ...newUser, role: UserRole.BOOKIE, balance: 0, commission_rate: 10, parent_id: currentUser.id, created_at: Date.now()
    };
    setUsers([...users, bookie]);
    setNewUser({ name: '', username: '', password: '', whatsapp: '', pix_key: '' });
    alert("Cambista cadastrado!");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="flex justify-center gap-4">
        <button onClick={() => setTab('NETWORK')} className={`px-8 py-3 rounded-2xl font-impact italic text-xs uppercase tracking-widest transition-all ${tab === 'NETWORK' ? 'bg-[#a3e635] text-black' : 'bg-white/5 text-white/40'}`}>Rede de Cambistas</button>
        <button onClick={() => setTab('FINANCE')} className={`px-8 py-3 rounded-2xl font-impact italic text-xs uppercase tracking-widest transition-all ${tab === 'FINANCE' ? 'bg-[#a3e635] text-black' : 'bg-white/5 text-white/40'}`}>Tesouraria</button>
      </div>

      {tab === 'NETWORK' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
          <div className="glass-card p-10 rounded-[3rem] border-t-4 border-[#a3e635]">
            <h3 className="text-xl font-impact italic uppercase mb-8 text-white">Novo Cambista</h3>
            <form onSubmit={handleAddBookie} className="space-y-4">
              <input required placeholder="Nome do Cambista" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635]" />
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Login" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635]" />
                <input required type="text" placeholder="Senha" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635]" />
              </div>
              <input required placeholder="WhatsApp" value={newUser.whatsapp} onChange={e => setNewUser({...newUser, whatsapp: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635]" />
              <input required placeholder="Chave PIX" value={newUser.pix_key} onChange={e => setNewUser({...newUser, pix_key: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635]" />
              <button className="w-full py-5 bg-[#a3e635] text-black font-impact italic rounded-2xl uppercase text-xs">CADASTRAR CAMBISTA</button>
            </form>
          </div>
          <div className="space-y-4">
            <h3 className="text-[10px] font-black opacity-30 uppercase tracking-widest px-4">Minha Rede ({myBookies.length})</h3>
            {myBookies.map(u => (
              <div key={u.id} className="match-card p-6 rounded-[2rem] border border-white/5 flex justify-between items-center">
                <div>
                  <p className="font-impact italic text-white uppercase text-lg">{u.name}</p>
                  <p className="text-[10px] text-[#a3e635] font-black tracking-widest uppercase">{u.whatsapp}</p>
                </div>
                <button onClick={() => onDeleteUser(u.id)} className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20"><i className="fa-solid fa-trash-can"></i></button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-[#fbbf24] uppercase tracking-widest px-4">Acertos Pendentes de Cambistas</h3>
            {pendingFromBookies.length === 0 && <p className="text-center py-20 opacity-20 uppercase text-xs font-black">Nenhuma pendência</p>}
            {pendingFromBookies.map(s => (
              <div key={s.id} className="glass-card p-8 rounded-[2.5rem] border border-white/5 flex flex-wrap justify-between items-center gap-6">
                <div>
                  <p className="text-[9px] font-black opacity-30 uppercase tracking-widest">Cambista</p>
                  <p className="font-impact italic text-xl text-white">{s.from_name}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black opacity-30 uppercase tracking-widest">Valor Líquido</p>
                  <p className="font-impact italic text-xl text-[#a3e635]">R$ {s.net_amount.toFixed(2)}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleUpdateSettlement(s.id, 'CONCLUIDO')} className="px-6 py-3 bg-[#a3e635] text-black rounded-xl font-impact italic text-[10px] uppercase">Confirmar Recebimento</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorDashboard;
