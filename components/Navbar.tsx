
import React from 'react';
import { User, UserRole } from '../types';

interface NavbarProps {
  user: User;
  view: string;
  setView: (v: any) => void;
  onLogout: () => void;
  isMarketOpen: boolean;
  pendingCount?: number;
}

const Navbar: React.FC<NavbarProps> = ({ user, view, setView, onLogout, isMarketOpen, pendingCount = 0 }) => (
  <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-6xl z-[100]">
    <div className="glass-card px-8 py-4 rounded-[2.5rem] flex items-center justify-between">
      <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView(user.role === UserRole.CLIENT ? 'BET' : 'DASHBOARD')}>
        <div className="w-10 h-10 bg-[#a3e635] rounded-xl flex items-center justify-center font-black text-slate-950 text-xl shadow-lg relative">
          R
          {!isMarketOpen && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-slate-900"></div>}
        </div>
        <div className="hidden sm:block">
          <p className="font-impact italic text-lg uppercase leading-none flex items-center gap-2">
            Rodada <span className="text-[#a3e635]">D'grau</span>
          </p>
          <p className="text-[8px] font-black opacity-40 uppercase tracking-widest">{user.role}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-4">
        {user.role === UserRole.CLIENT && (
          <button onClick={() => setView('BET')} className={`px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors ${view === 'BET' ? 'text-[#a3e635]' : 'opacity-40 hover:opacity-100'}`}>Jogos</button>
        )}
        
        <button onClick={() => setView('HISTORY')} className={`px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors ${view === 'HISTORY' ? 'text-[#a3e635]' : 'opacity-40 hover:opacity-100'}`}>
          {user.role === UserRole.CLIENT ? 'Meus Bilhetes' : 'Validações'}
        </button>
        
        <button onClick={() => setView('PROFILE')} className={`px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors ${view === 'PROFILE' ? 'text-[#a3e635]' : 'opacity-40 hover:opacity-100'}`}>Perfil</button>
        
        {user.role !== UserRole.CLIENT && (
          <button onClick={() => setView('DASHBOARD')} className={`relative px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors ${view === 'DASHBOARD' ? 'text-[#a3e635]' : 'opacity-40 hover:opacity-100'}`}>
            Painel
          </button>
        )}
        
        <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
        <button onClick={onLogout} className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-power-off"></i></button>
      </div>
    </div>
  </nav>
);

export default Navbar;
