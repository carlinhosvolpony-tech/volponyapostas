
import React, { useState } from 'react';
import { Match, Ticket, User } from '../types';
import { getVolponyPicks } from '../geminiService';

interface Props {
  matches: Match[];
  user: User;
  onBet: (ticket: Ticket) => void;
  setUser: (u: User) => void;
  isMarketOpen: boolean;
}

const BettingArea: React.FC<Props> = ({ matches, user, onBet, setUser, isMarketOpen }) => {
  const [picks, setPicks] = useState<string[]>(new Array(12).fill(''));
  const [amount, setAmount] = useState<number>(2.00);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handlePick = (index: number, option: 'C' | 'E' | 'A') => {
    if (!isMarketOpen) return;
    const newPicks = [...picks];
    newPicks[index] = option;
    setPicks(newPicks);
  };

  const handleVolponyIndica = async () => {
    if (!isMarketOpen || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const aiPicks = await getVolponyPicks(matches);
      setPicks(aiPicks);
    } catch (err) {
      alert("Falha ao consultar o especialista Volpony. Tente novamente em instantes.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAmountChange = (val: string) => {
    const cleanVal = val.replace(',', '.');
    const num = parseFloat(cleanVal);
    if (!isNaN(num)) {
      setAmount(num);
    } else if (val === '') {
      setAmount(0);
    }
  };

  const isComplete = picks.every(p => p !== '');

  const handlePlaceBet = () => {
    if (!isMarketOpen) {
      alert("O mercado foi encerrado. Não é possível registrar novos bilhetes.");
      return;
    }
    if (!isComplete) return alert("Complete os 12 palpites!");
    if (amount < 1.00) return alert("O valor mínimo da aposta é R$ 1,00");
    if (user.balance < amount) return alert("Saldo insuficiente!");

    const ticket: Ticket = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      user_id: user.id,
      user_name: user.name,
      bet_amount: amount,
      potential_prize: amount * 100,
      status: 'PENDENTE',
      is_settled: false,
      timestamp: Date.now(),
      parent_id: user.parent_id || 'admin-1',
      matches: matches,
      picks: picks
    };

    onBet(ticket);
    setUser({ ...user, balance: user.balance - amount });
    setPicks(new Array(12).fill(''));
    alert("Bilhete registrado com sucesso!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 relative">
      {!isMarketOpen && (
        <div className="bg-red-600/20 border-2 border-red-600/50 p-6 rounded-[2rem] text-center animate-pulse">
          <p className="font-impact italic text-red-500 uppercase tracking-widest flex items-center justify-center gap-3">
            <i className="fa-solid fa-lock"></i> Mercado Encerrado - Grade em Processamento
          </p>
        </div>
      )}

      {/* Header Info Panel */}
      <div className={`flex flex-col md:flex-row justify-between items-center bg-white/5 p-8 rounded-[3rem] border border-white/5 gap-6 relative overflow-hidden group ${!isMarketOpen ? 'opacity-50 grayscale' : ''}`}>
        <div className="absolute -top-10 -right-10 opacity-[0.03] pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
          <i className="fa-solid fa-futbol text-[12rem]"></i>
        </div>
        
        <div className="text-center md:text-left z-10">
           <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.4em]">Estimativa de Prêmio (12 Acertos)</p>
           <p className="text-5xl font-impact italic text-[#a3e635]">R$ {(amount * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 z-10 w-full md:w-auto">
          <button 
            onClick={handleVolponyIndica}
            disabled={!isMarketOpen || isAnalyzing}
            className={`px-8 py-4 rounded-2xl font-impact italic text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 border-2 ${isAnalyzing ? 'bg-white/5 text-white/20 border-white/5 animate-pulse' : 'bg-[#a3e635]/10 text-[#a3e635] border-[#a3e635]/30 hover:bg-[#a3e635] hover:text-black shadow-lg shadow-[#a3e635]/20 scale-100 hover:scale-105 active:scale-95'}`}
          >
            <i className={`fa-solid ${isAnalyzing ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
            {isAnalyzing ? 'Analisando...' : 'Volpony Indica'}
          </button>

          <div className="flex items-center gap-2 bg-black/40 p-2 rounded-3xl border border-white/5">
             <button 
                onClick={() => setAmount(Math.max(1, amount - 0.5))} 
                disabled={!isMarketOpen} 
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 text-white/40 disabled:opacity-20"
              >
                -
              </button>
             <div className="px-2 text-center flex flex-col items-center">
               <p className="text-[7px] font-black opacity-20 uppercase">Valor do Bilhete</p>
               <div className="flex items-center gap-1">
                 <span className="text-[10px] font-impact text-white/40">R$</span>
                 <input 
                    type="text" 
                    value={amount === 0 ? '' : amount.toString().replace('.', ',')}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    disabled={!isMarketOpen}
                    className="w-20 bg-transparent border-none outline-none font-impact italic text-lg text-white text-center focus:text-[#a3e635] transition-colors"
                    placeholder="1,00"
                 />
               </div>
             </div>
             <button 
                onClick={() => setAmount(amount + 0.5)} 
                disabled={!isMarketOpen} 
                className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 text-white/40 disabled:opacity-20"
              >
                +
              </button>
          </div>
        </div>
      </div>

      {/* Grid de Jogos */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!isMarketOpen ? 'pointer-events-none' : ''}`}>
        {matches.map((m, i) => (
          <div key={m.id} className={`match-card p-6 rounded-[2rem] border border-white/5 space-y-4 ${!isMarketOpen ? 'opacity-30' : ''}`}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-[#a3e635] uppercase tracking-wider">{m.league}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black opacity-20 uppercase">{m.time}</span>
                <span className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[9px] font-impact italic text-white/20">#{i + 1}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2">
               <p className="text-xs font-black uppercase text-right truncate text-white">{m.home}</p>
               <span className="text-[10px] font-black opacity-10 italic">X</span>
               <p className="text-xs font-black uppercase text-left truncate text-white">{m.away}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
               {[
                 { label: 'CASA', val: 'C' },
                 { label: 'EMPATE', val: 'E' },
                 { label: 'FORA', val: 'A' }
               ].map(opt => (
                 <button 
                  key={opt.val}
                  disabled={!isMarketOpen}
                  onClick={() => handlePick(i, opt.val as any)}
                  className={`py-3.5 rounded-xl text-[10px] font-impact italic uppercase transition-all border-2 ${picks[i] === opt.val ? 'bg-[#a3e635] text-black border-[#a3e635] shadow-lg shadow-[#a3e635]/20 scale-[1.02]' : 'bg-white/5 text-white/40 border-transparent hover:border-white/10 disabled:hover:border-transparent'}`}
                 >
                   {opt.label}
                 </button>
               ))}
            </div>
          </div>
        ))}
      </div>

      <button 
        disabled={!isComplete || !isMarketOpen || amount < 1.00}
        onClick={handlePlaceBet}
        className={`fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-lg py-6 rounded-3xl font-impact italic text-xl uppercase tracking-widest shadow-2xl transition-all z-50 ${isMarketOpen ? (isComplete && amount >= 1.00 ? 'bg-[#a3e635] text-black hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-black/50' : 'bg-slate-800 text-white/20 cursor-not-allowed') : 'bg-red-600 text-white cursor-not-allowed'}`}
      >
        {!isMarketOpen ? (
          <span className="flex items-center justify-center gap-3">
            <i className="fa-solid fa-lock"></i> MERCADO FECHADO
          </span>
        ) : (
          amount < 1.00 ? 'VALOR MÍNIMO R$ 1,00' :
          isComplete ? 'CONFIRMAR BILHETE' : `FALTAM ${picks.filter(p => p === '').length} PALPITES`
        )}
      </button>
    </div>
  );
};

export default BettingArea;
