
import React, { useState } from 'react';
import { User, UserRole, Match, Ticket, AppSettings, Settlement } from '../types';

interface Props {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onDeleteUser: (id: string) => void;
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  tickets: Ticket[];
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  currentUser: User;
  onUpdateSingleUser: (u: User) => void;
  settlements: Settlement[];
  setSettlements: React.Dispatch<React.SetStateAction<Settlement[]>>;
}

const AdminDashboard: React.FC<Props> = ({ users, setUsers, onDeleteUser, currentUser, settings, setSettings, onUpdateSingleUser, settlements, setSettlements }) => {
  const [tab, setTab] = useState<'MANAGEMENT' | 'TREASURY'>('MANAGEMENT');
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: UserRole.SUPERVISOR, whatsapp: '', pix_key: '' });

  const supervisors = users.filter(u => u.role === UserRole.SUPERVISOR);
  const pendingSettlements = settlements.filter(s => s.to_id === currentUser.id && s.status !== 'CONCLUIDO');

  const handleUpdateSettlement = (id: string, status: Settlement['status']) => {
    setSettlements(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.some(u => u.username === newUser.username)) return alert("Login já existe!");
    const user: User = { 
      id: Math.random().toString(36).substr(2, 9), ...newUser, commission_rate: 10, balance: 0, parent_id: currentUser.id, created_at: Date.now()
    };
    setUsers([...users, user]);
    setNewUser({ name: '', username: '', password: '', role: UserRole.SUPERVISOR, whatsapp: '', pix_key: '' });
    alert("Supervisor cadastrado!");
  };

  return (
    <div className="space-y-12 pb-20 px-4">
      <div className="flex justify-center gap-4">
        <button onClick={() => setTab('MANAGEMENT')} className={`px-8 py-3 rounded-2xl font-impact italic text-xs uppercase tracking-widest transition-all ${tab === 'MANAGEMENT' ? 'bg-[#a3e635] text-black' : 'bg-white/5 text-white/40'}`}>Gestão Geral</button>
        <button onClick={() => setTab('TREASURY')} className={`px-8 py-3 rounded-2xl font-impact italic text-xs uppercase tracking-widest transition-all ${tab === 'TREASURY' ? 'bg-[#a3e635] text-black' : 'bg-white/5 text-white/40'}`}>Tesouraria Master</button>
      </div>

      {tab === 'MANAGEMENT' ? (
        <div className="space-y-12 animate-in fade-in">
          <div className="glass-card p-8 rounded-[3rem] border-t-4 border-[#a3e635] shadow-2xl">
            <h3 className="text-xl font-impact italic uppercase mb-8 text-white">Novo Supervisor</h3>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required placeholder="Nome Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input required placeholder="Login" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none" />
                <input required type="text" placeholder="Senha" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none" />
              </div>
              <input required placeholder="WhatsApp" value={newUser.whatsapp} onChange={e => setNewUser({...newUser, whatsapp: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none" />
              <input required placeholder="Chave PIX" value={newUser.pix_key} onChange={e => setNewUser({...newUser, pix_key: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none" />
              <button className="md:col-span-2 py-4 bg-[#a3e635] text-black font-impact italic rounded-2xl uppercase text-xs">CADASTRAR SUPERVISOR</button>
            </form>
          </div>
          <div className="space-y-4">
            <h3 className="text-[10px] font-black opacity-30 uppercase tracking-widest px-4">Supervisores Ativos</h3>
            {supervisors.map(u => (
              <div key={u.id} className="match-card p-6 rounded-[2rem] border border-white/5 flex justify-between items-center">
                <div>
                  <p className="font-impact italic text-white uppercase text-lg">{u.name}</p>
                  <p className="text-[8px] font-black text-[#a3e635] uppercase">Login: {u.username}</p>
                </div>
                <button onClick={() => onDeleteUser(u.id)} className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20"><i className="fa-solid fa-trash"></i></button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <h3 className="text-[10px] font-black text-[#fbbf24] uppercase tracking-widest px-4">Aguardando Repasse de Supervisores</h3>
          {pendingSettlements.length === 0 && <p className="text-center py-20 opacity-20 uppercase text-xs font-black">Tesouraria em dia</p>}
          {pendingSettlements.map(s => (
            <div key={s.id} className="glass-card p-8 rounded-[2.5rem] border border-white/5 flex flex-wrap justify-between items-center gap-6">
              <div>
                <p className="text-[9px] font-black opacity-30 uppercase tracking-widest">Supervisor</p>
                <p className="font-impact italic text-xl text-white">{s.from_name}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-black opacity-30 uppercase tracking-widest">Valor a Receber</p>
                <p className="font-impact italic text-xl text-[#a3e635]">R$ {s.net_amount.toFixed(2)}</p>
              </div>
              <button onClick={() => handleUpdateSettlement(s.id, 'CONCLUIDO')} className="px-8 py-4 bg-[#a3e635] text-black rounded-xl font-impact italic text-[10px] uppercase">Validar Depósito</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
