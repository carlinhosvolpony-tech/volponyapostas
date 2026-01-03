
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
      <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('BET')}>
        <div className="w-10 h-10 bg-[#a3e635] rounded-xl flex items-center justify-center font-black text-slate-950 text-xl shadow-lg relative">
          D
          {!isMarketOpen && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-slate-900"></div>}
        </div>
        <div className="hidden sm:block">
          <p className="font-impact italic text-lg uppercase leading-none flex items-center gap-2">
            D'Grau <span className="text-[#a3e635]">Apostas</span>
            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${isMarketOpen ? 'bg-[#a3e635]/20 text-[#a3e635]' : 'bg-red-600/20 text-red-500'}`}>
              {isMarketOpen ? 'ABERTO' : 'FECHADO'}
            </span>
          </p>
          <p className="text-[8px] font-black opacity-40 uppercase tracking-widest">{user.role}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-4">
        <button onClick={() => setView('BET')} className={`px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors ${view === 'BET' ? 'text-[#a3e635]' : 'opacity-40 hover:opacity-100'}`}>Jogos</button>
        <button onClick={() => setView('HISTORY')} className={`px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors ${view === 'HISTORY' ? 'text-[#a3e635]' : 'opacity-40 hover:opacity-100'}`}>Bilhetes</button>
        <button onClick={() => setView('WALLET')} className={`px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors ${view === 'WALLET' ? 'text-[#a3e635]' : 'opacity-40 hover:opacity-100'}`}>Banca</button>
        
        {user.role !== UserRole.CLIENT && (
          <button onClick={() => setView('DASHBOARD')} className={`relative px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors ${view === 'DASHBOARD' ? 'text-[#a3e635]' : 'opacity-40 hover:opacity-100'}`}>
            Painel
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-[8px] items-center justify-center text-white border border-slate-900">
                  {pendingCount}
                </span>
              </span>
            )}
          </button>
        )}
        
        <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
        <div className="text-right hidden md:block">
          <p className="text-[8px] font-black opacity-20 uppercase">Saldo</p>
          <p className="text-[#a3e635] font-impact italic">{user.role === UserRole.ADMIN ? 'INFINITO' : `R$ ${user.balance.toFixed(2)}`}</p>
        </div>
        <button onClick={onLogout} className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-power-off"></i></button>
      </div>
    </div>
  </nav>
);

export default Navbar;
