
import React, { useState } from 'react';
import { Match, Ticket, User, UserRole, AppSettings } from '../types';
import { getRodadaPicks } from '../geminiService';

interface Props {
  matches: Match[];
  user: User;
  onBet: (ticket: Ticket) => void;
  settings: AppSettings;
  users: User[];
}

const BettingArea: React.FC<Props> = ({ matches, user, onBet, settings, users }) => {
  const [picks, setPicks] = useState<(string | null)[]>(new Array(12).fill(null));
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [lastTicket, setLastTicket] = useState<Ticket | null>(null);

  const amount = 2.00;
  const potentialPrize = amount * (settings.prize_multiplier || 500);
  const isMarketOpen = settings.is_market_open;

  const myBookie = users.find(u => u.id === user.parent_id);
  const responsibleUser = myBookie || users.find(u => u.role === UserRole.ADMIN);

  const handleSelect = (index: number, choice: string) => {
    if (!isMarketOpen) return;
    const newPicks = [...picks];
    newPicks[index] = choice === newPicks[index] ? null : choice;
    setPicks(newPicks);
  };

  const handleAiPicks = async () => {
    setIsAiLoading(true);
    try {
      const results = await getRodadaPicks();
      setPicks(results);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePlaceBet = () => {
    if (picks.includes(null)) return alert("Você precisa preencher todos os 12 jogos da rodada!");
    
    const ticket: Ticket = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      user_id: user.id,
      user_name: user.name,
      bet_amount: amount,
      potential_prize: potentialPrize,
      status: 'PENDENTE',
      is_settled: false,
      timestamp: Date.now(),
      parent_id: responsibleUser?.id,
      matches: matches,
      picks: picks as string[]
    };

    onBet(ticket);
    setLastTicket(ticket);
    setShowPaymentModal(true);
  };

  const sendToWhatsapp = () => {
    if (!responsibleUser || !lastTicket) return;
    const phone = responsibleUser.whatsapp?.replace(/\D/g, '') || '';
    const message = `🎲 *NOVO BILHETE - RODADA D'GRAU*%0AID: #${lastTicket.id}%0AATLETA: ${user.name}%0AStatus: Aguardando Validação`;
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setShowPaymentModal(false);
    setPicks(new Array(12).fill(null));
  };

  const today = new Date();
  const dateParts = [
    today.getDate().toString().padStart(2, '0'),
    (today.getMonth() + 1).toString().padStart(2, '0'),
    today.getFullYear().toString().slice(-2)
  ];

  return (
    <div className="max-w-xl mx-auto pb-48 px-4 pt-10">
      
      {/* HEADER DINÂMICO DA IMAGEM */}
      <div className="relative mb-8 pt-10 px-4">
        {/* Jogador de cima */}
        <img src="https://www.pngall.com/wp-content/uploads/5/Football-Player-PNG-Free-Download.png" className="absolute -top-10 -left-10 w-48 opacity-40 player-img pointer-events-none" alt="" />
        
        {/* Bola central superior */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#a3e635] rounded-full flex items-center justify-center border-4 border-[#020617] shadow-xl z-20">
           <i className="fa-solid fa-futbol text-4xl text-black"></i>
        </div>

        <div className="relative z-10">
          <h1 className="text-6xl font-impact text-white leading-none tracking-tighter uppercase">
            JOGOS DA <br/><span className="text-[#a3e635]">RODADA!</span>
          </h1>
          <p className="text-[10px] font-impact text-white uppercase mt-2 tracking-widest max-w-[280px]">
            ESCOLHA SEU PALPITE E COMEMORE CADA VITÓRIA
          </p>
        </div>
      </div>

      {/* CARTÃO DE APOSTA (Fundo Preto com Borda Branca/Verde) */}
      <div className="bg-black rounded-[3rem] border-4 border-[#a3e635]/20 p-6 md:p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        
        {/* DIA / DATA */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="bg-[#a3e635] px-10 py-2 rounded-xl flex items-center gap-4 font-impact text-black text-2xl">
            DIA: 
            <div className="flex gap-2">
              <span className="bg-black/10 px-2 rounded">{dateParts[0]}</span>/
              <span className="bg-black/10 px-2 rounded">{dateParts[1]}</span>/
              <span className="bg-black/10 px-2 rounded">{dateParts[2]}</span>
            </div>
          </div>
          <div className="bg-[#a3e635] px-6 py-1 rounded-lg font-impact text-xs text-black uppercase">
            CASA / EMPATE / FORA
          </div>
        </div>

        {/* LISTA DE 12 JOGOS COM CÁPSULAS E PARÊNTESES */}
        <div className="space-y-3">
          {matches.slice(0, 12).map((match, idx) => (
            <div key={idx} className="flex items-center gap-3">
               {/* Nome do Jogo em Cápsula */}
               <div className="flex-1 capsule-green h-11 flex items-center justify-center text-[11px] px-6 shadow-md truncate">
                  {match.home} <span className="mx-3 opacity-50">X</span> {match.away}
               </div>
               
               {/* Seleção ( ) ( ) ( ) */}
               <div className="flex items-center gap-1">
                 {["CASA", "EMPATE", "FORA"].map((opt) => {
                   const isSelected = picks[idx] === opt;
                   const label = opt === "CASA" ? "1" : opt === "EMPATE" ? "X" : "2";
                   return (
                     <button
                       key={opt}
                       onClick={() => handleSelect(idx, opt)}
                       className={`parenthesis-btn px-1 flex items-center gap-0.5 hover:scale-110 transition-transform ${isSelected ? 'active' : ''}`}
                     >
                       <span>(</span>
                       <span className={`w-4 text-center text-sm ${isSelected ? 'text-white' : 'opacity-0'}`}>{label}</span>
                       <span>)</span>
                     </button>
                   );
                 })}
               </div>
            </div>
          ))}
        </div>

        {/* Botão IA (Sugestão Rápida) */}
        <div className="mt-8">
          <button 
            onClick={handleAiPicks}
            disabled={isAiLoading || !isMarketOpen}
            className="w-full py-4 border-2 border-dashed border-[#a3e635]/20 text-[#a3e635]/60 rounded-2xl font-impact text-[10px] uppercase tracking-widest hover:border-[#a3e635] hover:text-[#a3e635] transition-all"
          >
            {isAiLoading ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-wand-sparkles mr-2"></i>}
            GERAR PALPITE ALEATÓRIO
          </button>
        </div>
      </div>

      {/* Rodapé Fixo de Envio */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#020617] via-[#020617] to-transparent z-[80]">
        <div className="max-w-md mx-auto bg-slate-900/90 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <div className="flex justify-between items-center mb-6 px-4">
            <div className="text-left">
              <span className="text-[9px] font-black opacity-30 uppercase block">Total (12 Jogos)</span>
              <span className="font-impact text-2xl text-[#a3e635]">R$ 2,00</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black opacity-30 uppercase block">Prêmio Estimado</span>
              <span className="font-impact text-2xl text-yellow-400">R$ {potentialPrize.toFixed(2)}</span>
            </div>
          </div>
          <button 
            onClick={handlePlaceBet}
            disabled={picks.includes(null) || !isMarketOpen}
            className="w-full py-5 rounded-2xl font-impact text-xl bg-[#a3e635] text-black shadow-lg disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
          >
            CONFIRMAR BILHETE
          </button>
        </div>
      </div>

      {/* Jogador de baixo */}
      <img src="https://www.pngall.com/wp-content/uploads/5/Football-Player-PNG-Free-Download.png" className="fixed bottom-10 -right-20 w-80 opacity-20 player-img pointer-events-none z-0 rotate-12" alt="" />

      {/* Modal Pix (Simplificado) */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="glass-card w-full max-w-sm p-10 rounded-[3rem] text-center border-t-4 border-[#a3e635]">
            <h3 className="font-impact text-2xl text-white uppercase mb-8 italic">Validar Bilhete</h3>
            <div className="bg-white/5 p-6 rounded-2xl mb-8">
              <p className="text-[8px] font-black opacity-30 uppercase mb-2">Chave PIX do Responsável</p>
              <p className="font-mono text-xs text-[#a3e635] break-all font-bold">{responsibleUser?.pix_key || settings.pix_key}</p>
            </div>
            <button onClick={sendToWhatsapp} className="w-full py-6 bg-[#25D366] text-white font-impact rounded-2xl uppercase flex items-center justify-center gap-4 shadow-xl">
              <i className="fa-brands fa-whatsapp text-2xl"></i> ENVIAR COMPROVANTE
            </button>
            <button onClick={() => setShowPaymentModal(false)} className="mt-6 text-[10px] font-black opacity-30 uppercase">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BettingArea;
