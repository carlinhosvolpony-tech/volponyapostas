
import React, { useState } from 'react';
import { User, AppSettings, BalanceRequest, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

interface WalletProps {
  user: User;
  settings: AppSettings;
  users: User[];
  balanceRequests: BalanceRequest[];
  setBalanceRequests: React.Dispatch<React.SetStateAction<BalanceRequest[]>>;
  setView: (v: 'BET') => void;
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUser: (userId: string) => void;
}

const Wallet: React.FC<WalletProps> = ({ 
  user, settings, users, balanceRequests, setBalanceRequests, setView, onUpdateUser, onDeleteUser 
}) => {
  const [activeTab, setActiveTab] = useState<'FINANCE' | 'PROFILE'>('FINANCE');
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [showPix, setShowPix] = useState(false);
  
  // Estados para edição de perfil
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    username: user.username,
    password: user.password
  });

  const isAdmin = user.role === UserRole.ADMIN;
  const parent = user.parent_id ? users.find(u => u.id === user.parent_id) : null;
  const admin = users.find(u => u.id === 'admin-1');
  const pixKey = parent?.pix_key || admin?.pix_key || settings.pix_key;
  const targetName = parent ? `${parent.role === UserRole.BOOKIE ? 'Cambista' : 'Supervisor'}: ${parent.name}` : "Diretoria Master";

  const handleRequest = async () => {
    if (customAmount < 1) return alert("Digite um valor válido (mínimo R$ 1,00)");

    const request: BalanceRequest = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      user_name: user.name,
      amount: customAmount,
      status: 'PENDING',
      created_at: Date.now()
    };
    
    setBalanceRequests([request, ...balanceRequests]);
    if (isSupabaseConfigured) await supabase.from('balance_requests').insert([request]);
    setShowPix(true);
  };

  const handleUpdateProfile = () => {
    if (!profileForm.name || !profileForm.username || !profileForm.password) {
      return alert("Preencha todos os campos!");
    }
    
    // Verifica se o login já existe em outro usuário
    const loginExists = users.some(u => u.username === profileForm.username && u.id !== user.id);
    if (loginExists) return alert("Este login já está em uso por outro atleta!");

    const updatedUser = { ...user, ...profileForm };
    onUpdateUser(updatedUser);
    alert("Perfil atualizado com sucesso!");
  };

  const handleSelfDelete = () => {
    if (isAdmin) return alert("O Administrador Master não pode excluir a própria conta por segurança.");
    
    const confirm1 = confirm("⚠️ VOCÊ TEM CERTEZA? Ao excluir sua conta, seu saldo e histórico de bilhetes serão perdidos permanentemente.");
    if (confirm1) {
      const confirm2 = confirm("CONFIRMAÇÃO FINAL: Deseja realmente encerrar sua conta e sair do sistema agora?");
      if (confirm2) {
        onDeleteUser(user.id);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center px-2">
        <button 
          onClick={() => setView('BET')} 
          className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#a3e635] transition-all"
        >
          <i className="fa-solid fa-arrow-left"></i> Voltar
        </button>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => setActiveTab('FINANCE')}
            className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'FINANCE' ? 'bg-[#a3e635] text-black shadow-lg' : 'text-white/40'}`}
          >
            Banca
          </button>
          <button 
            onClick={() => setActiveTab('PROFILE')}
            className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'PROFILE' ? 'bg-[#a3e635] text-black shadow-lg' : 'text-white/40'}`}
          >
            Perfil
          </button>
        </div>
      </div>

      {activeTab === 'FINANCE' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[2.5rem] border-4 border-[#a3e635] text-center shadow-2xl">
            <p className="text-[10px] font-black uppercase text-[#064e3b] mb-2 tracking-[0.3em]">Meu Saldo Atual</p>
            <h2 className="text-5xl font-impact italic text-black uppercase">
              {isAdmin ? 'ILIMITADO' : `R$ ${user.balance.toFixed(2)}`}
            </h2>
          </div>

          {!isAdmin && (
            <>
              <div className="bg-slate-900/60 p-10 rounded-[3rem] border border-white/10 space-y-8 backdrop-blur-xl shadow-2xl">
                <div className="text-center">
                  <h3 className="text-[10px] font-black uppercase text-[#a3e635] tracking-[0.4em]">SOLICITAR CRÉDITO</h3>
                  <p className="text-[9px] font-black opacity-30 uppercase mt-2">O valor será liberado após o envio do PIX</p>
                </div>
                
                <div className="space-y-4">
                  <div className="relative group">
                    <span className="absolute left-8 top-1/2 -translate-y-1/2 font-impact italic text-white/20 text-2xl group-focus-within:text-[#a3e635] transition-colors">R$</span>
                    <input 
                      type="number" 
                      value={customAmount || ''} 
                      onChange={e => setCustomAmount(Number(e.target.value))}
                      placeholder="0.00" 
                      className="w-full bg-black/40 border-2 border-white/5 rounded-[2rem] py-8 pl-16 pr-8 text-4xl font-impact italic text-white outline-none focus:border-[#a3e635] transition-all text-center"
                    />
                  </div>
                </div>

                <button onClick={handleRequest} className="w-full py-6 bg-[#a3e635] text-black font-impact italic uppercase rounded-2xl hover:scale-[1.02] active:scale-95 transition-all text-sm tracking-widest shadow-xl shadow-[#a3e635]/20">
                  Solicitar Recarga Agora
                </button>
              </div>

              {showPix && (
                <div className="bg-[#a3e635] p-10 rounded-[3rem] border-4 border-black text-center animate-in slide-in-from-bottom-5 shadow-2xl">
                  <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <i className="fa-solid fa-qrcode text-2xl text-[#a3e635]"></i>
                  </div>
                  <p className="text-[10px] font-black uppercase text-black/60 mb-2">Enviar PIX para seu gerente:</p>
                  <p className="font-impact italic text-black uppercase text-lg mb-6">{targetName}</p>
                  <div className="bg-white/90 p-6 rounded-2xl mb-8 font-mono text-[11px] break-all text-black border-2 border-black/10 shadow-inner">
                    {pixKey}
                  </div>
                  <button 
                    onClick={() => {navigator.clipboard.writeText(pixKey); alert("Chave PIX copiada!");}} 
                    className="w-full py-5 bg-black text-[#a3e635] text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-105 transition-transform"
                  >
                    Copiar Chave PIX
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/60 p-10 rounded-[3rem] border border-white/10 space-y-8 backdrop-blur-xl shadow-2xl animate-in slide-in-from-right-10 duration-500">
          <div className="text-center">
            <h3 className="text-2xl font-impact italic uppercase text-white mb-2">Meu Perfil</h3>
            <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.3em]">Gerencie seu acesso à arena</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black opacity-30 uppercase tracking-widest px-2">Nome Completo</label>
              <input 
                value={profileForm.name} 
                onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635] transition-all font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black opacity-30 uppercase tracking-widest px-2">Login de Acesso</label>
              <input 
                value={profileForm.username} 
                onChange={e => setProfileForm({...profileForm, username: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635] transition-all font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black opacity-30 uppercase tracking-widest px-2">Senha</label>
              <input 
                type="text"
                value={profileForm.password} 
                onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635] transition-all font-bold"
              />
            </div>

            <button 
              onClick={handleUpdateProfile}
              className="w-full py-5 bg-[#a3e635] text-black font-impact italic rounded-2xl uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] transition-all"
            >
              Salvar Alterações
            </button>

            {!isAdmin && (
              <div className="pt-8 border-t border-white/5">
                <button 
                  onClick={handleSelfDelete}
                  className="w-full py-5 bg-red-600/10 text-red-500 border border-red-600/30 font-impact italic rounded-2xl uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all"
                >
                  <i className="fa-solid fa-user-minus mr-2"></i> Encerrar Minha Conta
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
