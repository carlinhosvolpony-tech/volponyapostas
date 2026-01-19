
import React from 'react';
import { Ticket, User, UserRole } from '../types';
import html2canvas from 'html2canvas';

interface TicketHistoryProps {
  tickets: Ticket[];
  currentUser: User;
  users?: User[]; 
  onDelete?: (id: string) => void;
  onUpdateStatus?: (ticketId: string, status: Ticket['status']) => void;
  setView: (v: any) => void;
}

const TicketHistory: React.FC<TicketHistoryProps> = ({ tickets, setView, currentUser, onDelete, onUpdateStatus }) => {
  
  const downloadTicketImage = async (ticket: Ticket) => {
    const element = document.getElementById(`ticket-capture-${ticket.id}`);
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { backgroundColor: '#000', scale: 3, windowWidth: 400 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `CUPOM-${ticket.id}.png`;
      link.click();
    } catch (err) { console.error(err); }
  };

  const getStatusLabel = (status: Ticket['status']) => {
    switch (status) {
      case 'GANHOU': return '🏆 PREMIADO';
      case 'PERDEU': return '❌ NÃO PREMIADO';
      case 'VALIDADO': return '✅ VALIDADO';
      default: return '⏳ AGUARDANDO';
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 pb-48 px-4">
      <div className="flex justify-between items-center">
        <button onClick={() => setView('BET')} className="flex items-center gap-3 px-6 py-4 glass-card rounded-[2rem] text-[10px] font-black uppercase text-white/60">
          <i className="fa-solid fa-chevron-left"></i> Voltar
        </button>
      </div>

      {tickets.map(ticket => (
        <div key={ticket.id} className="relative group">
          <div className="absolute -top-4 right-0 z-[60]">
            <button onClick={() => downloadTicketImage(ticket)} className="bg-[#a3e635] text-black px-6 py-3 rounded-xl font-impact italic text-[10px] shadow-2xl">
              <i className="fa-solid fa-camera mr-2"></i> SALVAR CUPOM
            </button>
          </div>

          <div id={`ticket-capture-${ticket.id}`} className="w-full max-w-[380px] mx-auto bg-white text-black p-8 font-mono shadow-2xl relative">
            <div className="text-center border-b-2 border-dashed border-black/20 pb-6 mb-6">
              <h2 className="text-2xl font-black tracking-tighter mb-1">RODADA D'GRAU</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest">Recibo de Aposta - 12 Jogos</p>
              <p className="text-[9px] mt-2">ID: #{ticket.id} | {new Date(ticket.timestamp).toLocaleString()}</p>
            </div>

            <div className="space-y-1 mb-6 border-b border-black/5 pb-4">
              <p className="text-[8px] opacity-60">ATLETA: <span className="text-black font-black">{ticket.user_name}</span></p>
            </div>

            <div className="space-y-2 mb-8 text-[10px]">
               <div className="flex justify-between font-black border-b border-black/10 pb-2 mb-2">
                 <span>CONFRONTO</span>
                 <span>PALPITE</span>
               </div>
               {ticket.matches.map((m, i) => (
                 <div key={i} className="flex justify-between items-center py-1">
                   <span className="truncate max-w-[200px]">{i+1}. {m.home} X {m.away}</span>
                   <span className="font-black bg-black text-white px-2 rounded">{ticket.picks[i] === 'CASA' ? '1' : ticket.picks[i] === 'EMPATE' ? 'X' : '2'}</span>
                 </div>
               ))}
            </div>

            <div className="flex justify-between items-center text-sm border-t-2 border-dashed border-black/20 pt-6 mb-8">
               <span className="font-bold">TOTAL APOSTADO:</span>
               <span className="font-black">R$ {ticket.bet_amount.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm mb-10">
               <span className="font-bold">PRÊMIO FINAL:</span>
               <span className="font-black text-xl">R$ {ticket.potential_prize.toFixed(2)}</span>
            </div>

            <div className="text-center pt-6 border-t-2 border-dashed border-black/20">
              <p className="text-[11px] font-black mb-4">{getStatusLabel(ticket.status)}</p>
              <div className="h-10 w-full bg-black mb-2 flex items-end justify-around px-2 pb-1">
                 {Array.from({length: 40}).map((_, i) => <div key={i} className="bg-white" style={{ width: '2px', height: `${Math.random() * 80 + 20}%` }}></div>)}
              </div>
            </div>
          </div>

          {currentUser.role !== UserRole.CLIENT && (
            <div className="mt-4 glass-card p-6 rounded-[2rem] flex justify-center gap-3">
              <button onClick={() => onUpdateStatus?.(ticket.id, 'VALIDADO')} className="bg-[#a3e635] text-black px-6 py-3 rounded-xl font-impact italic text-[10px] uppercase">Validar</button>
              <button onClick={() => onUpdateStatus?.(ticket.id, 'GANHOU')} className="bg-[#fbbf24] text-black px-6 py-3 rounded-xl font-impact italic text-[10px] uppercase">Marcar Ganhador</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TicketHistory;
