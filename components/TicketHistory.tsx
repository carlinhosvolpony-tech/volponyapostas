
import React from 'react';
import { Ticket, User, UserRole } from '../types';
import html2canvas from 'html2canvas';

interface TicketHistoryProps {
  tickets: Ticket[];
  currentUser: User;
  onDelete?: (id: string) => void;
  setView: (v: 'BET') => void;
}

const TicketHistory: React.FC<TicketHistoryProps> = ({ tickets, setView, currentUser, onDelete }) => {
  
  const downloadTicketImage = async (ticket: Ticket) => {
    const element = document.getElementById(`ticket-container-${ticket.id}`);
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#020617',
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `dgrau-ticket-${ticket.id}.png`;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar bilhete.");
    }
  };

  const getStatusColor = (status: Ticket['status']) => {
    switch (status) {
      case 'GANHOU': return 'text-[#fbbf24] bg-[#fbbf24]/10 border-[#fbbf24]/20';
      case 'PERDEU': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'VALIDADO': return 'text-[#a3e635] bg-[#a3e635]/10 border-[#a3e635]/20';
      case 'PENDENTE': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-white/40 bg-white/5 border-white/10';
    }
  };

  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-48 px-4">
      <div className="flex justify-between items-center">
        <button 
          onClick={() => setView('BET')} 
          className="flex items-center gap-3 px-6 py-4 glass-card rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-[#a3e635] transition-all"
        >
          <i className="fa-solid fa-chevron-left"></i> Arena Principal
        </button>
        <div className="flex items-center gap-3 px-6 py-4 glass-card rounded-[2rem]">
          <div className="live-dot"></div>
          <span className="text-[10px] font-black text-[#a3e635] uppercase tracking-widest">Sincronizado</span>
        </div>
      </div>

      {tickets.length === 0 && (
        <div className="text-center py-40 glass-card rounded-[4rem] border-dashed border-2 border-white/10">
          <i className="fa-solid fa-receipt text-9xl text-white/5 mb-8"></i>
          <p className="text-white/20 font-black uppercase text-xs tracking-[0.6em]">Aguardando sua jogada</p>
        </div>
      )}
      
      {tickets.map(ticket => {
        const prize12 = ticket.bet_amount * 100;
        const prize11 = ticket.bet_amount * 50;
        const prize10 = ticket.bet_amount * 25;

        return (
          <div key={ticket.id} className="relative animate-in slide-in-from-bottom-10 duration-700">
            {/* ACTIONS */}
            <div className="absolute -top-6 right-8 z-30 flex gap-4">
              <button 
                onClick={() => downloadTicketImage(ticket)}
                className="w-16 h-16 rounded-3xl bg-[#a3e635] text-black shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-4 border-[#020617]"
              >
                <i className="fa-solid fa-download text-xl"></i>
              </button>
              {isAdmin && onDelete && (
                <button 
                  onClick={() => onDelete(ticket.id)}
                  className="w-16 h-16 rounded-3xl bg-red-600 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-4 border-[#020617]"
                >
                  <i className="fa-solid fa-trash text-xl"></i>
                </button>
              )}
            </div>

            {/* TICKET CARD */}
            <div 
              id={`ticket-container-${ticket.id}`}
              className={`bg-[#020617] border-4 rounded-[4rem] overflow-hidden shadow-2xl ${ticket.status === 'GANHOU' ? 'border-[#fbbf24]' : 'border-white/10'}`}
            >
              <div className={`p-10 text-center relative overflow-hidden ${ticket.status === 'GANHOU' ? 'bg-[#78350f]' : 'bg-[#064e3b]'}`}>
                 <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                 <h2 className="relative z-10 text-4xl font-impact italic text-white tracking-tighter uppercase">
                    D'GRAU <span className={ticket.status === 'GANHOU' ? 'text-[#fbbf24]' : 'text-[#a3e635]'}>APOSTAS</span>
                 </h2>
                 <div className={`mt-6 inline-block px-12 py-2.5 rounded-full border-2 font-impact italic text-[11px] uppercase tracking-widest ${getStatusColor(ticket.status)}`}>
                  STATUS: {ticket.status}
                </div>
              </div>

              <div className="p-8 md:p-14 space-y-4 relative">
                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                {ticket.matches.map((match, i) => (
                  <div key={i} className="grid grid-cols-[40px_1fr_120px_1fr] items-center py-3 px-6 bg-white/5 rounded-3xl border border-white/5">
                    <span className="text-xs font-impact italic text-white/10">#{i + 1}</span>
                    <span className="text-[12px] font-black uppercase text-right text-white truncate px-3">{match.home}</span>
                    <div className="flex justify-center gap-1.5">
                       {/* Corrigido: 'C' para Casa, 'E' para Empate, 'A' para Away (Fora) conforme BettingArea.tsx */}
                       {['C', 'E', 'A'].map(opt => (
                         <div 
                            key={opt} 
                            className={`w-8 h-8 rounded-xl flex items-center justify-center border font-impact italic text-[10px] transition-all ${ticket.picks[i] === opt ? (ticket.status === 'GANHOU' ? 'bg-[#fbbf24] text-black border-[#fbbf24]' : 'bg-[#a3e635] text-black border-[#a3e635]') : 'border-white/5 text-transparent bg-white/[0.02]'}`}
                         >
                           {opt === 'C' ? 'C' : opt === 'E' ? 'E' : 'F'}
                         </div>
                       ))}
                    </div>
                    <span className="text-[12px] font-black uppercase text-left text-white truncate px-3">{match.away}</span>
                  </div>
                ))}

                {/* PRIZE TABLE */}
                <div className="mt-12 pt-12 border-t-4 border-dashed border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 flex flex-col justify-center text-center">
                       <p className="text-[10px] font-black text-white/40 uppercase mb-2 tracking-widest">Valor Investido</p>
                       <p className="font-impact italic text-5xl text-white">R$ {ticket.bet_amount.toFixed(2)}</p>
                    </div>
                    
                    <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 space-y-4">
                      <div className="flex justify-between items-center text-white">
                        <span className="text-[11px] font-black uppercase opacity-40">12 Acertos (100x)</span>
                        <span className="font-impact italic text-2xl text-[#a3e635]">R$ {prize12.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-white/80">
                        <span className="text-[11px] font-black uppercase opacity-30">11 Acertos (50x)</span>
                        <span className="font-impact italic text-xl">R$ {prize11.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-white/60">
                        <span className="text-[11px] font-black uppercase opacity-20">10 Acertos (25x)</span>
                        <span className="font-impact italic text-lg">R$ {prize10.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6 px-4">
                    <div className="text-center md:text-left">
                       <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.5em]">AUTH: {ticket.id}</p>
                       <p className="text-[10px] font-black text-[#a3e635] uppercase mt-1">ATLETA: {ticket.user_name}</p>
                    </div>
                    <div className="text-center md:text-right">
                       <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">REGISTRADO EM</p>
                       <p className="text-[11px] text-white font-bold">{new Date(ticket.timestamp).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TicketHistory;
