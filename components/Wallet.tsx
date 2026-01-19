
import React, { useState } from 'react';
import { User, AppSettings, UserRole } from '../types';

interface WalletProps {
  user: User;
  settings: AppSettings;
  users: User[];
  // Removed non-existent BalanceRequest and unused props that were causing build errors
  setView: (v: any) => void;
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUser: (userId: string) => void;
}

const Wallet: React.FC<WalletProps> = ({ 
  user, users, setView, onUpdateUser, onDeleteUser 
}) => {
  // Estados para edição de perfil
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    username: user.username,
    password: user.password,
    whatsapp: user.whatsapp || '',
    pix_key: user.pix_key || ''
  });

  const isAdmin = user.role === UserRole.ADMIN;

  const handleUpdateProfile = () => {
    if (!profileForm.name || !profileForm.username || !profileForm.password) {
      return alert("Preencha todos os campos obrigatórios!");
    }
    
    // Verifica se o login já existe em outro usuário
    const loginExists = users.some(u => u.username === profileForm.username && u.id !== user.id);
    if (loginExists) return alert("Este login já está em uso por outro usuário!");

    const updatedUser = { ...user, ...profileForm };
    onUpdateUser(updatedUser);
    alert("Perfil atualizado com sucesso!");
  };

  const handleSelfDelete = () => {
    if (isAdmin) return alert("O Administrador Master não pode excluir a própria conta.");
    
    const confirm1 = confirm("⚠️ ATENÇÃO: Esta ação é irreversível. Seus dados serão apagados.");
    if (confirm1) {
      onDeleteUser(user.id);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20">
      <div className="flex justify-start items-center px-2">
        <button 
          onClick={() => setView('BET')} 
          className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-[#a3e635] transition-all"
        >
          <i className="fa-solid fa-arrow-left"></i> Voltar
        </button>
      </div>

      <div className="bg-slate-900/60 p-10 rounded-[3rem] border border-white/10 space-y-8 backdrop-blur-xl shadow-2xl animate-in fade-in duration-500">
        <div className="text-center">
          <h3 className="text-2xl font-impact italic uppercase text-white mb-2">Meu Perfil</h3>
          <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.3em]">Minhas informações de acesso</p>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black opacity-30 uppercase tracking-widest px-2">Login</label>
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
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black opacity-30 uppercase tracking-widest px-2">WhatsApp</label>
            <input 
              placeholder="5511999999999"
              value={profileForm.whatsapp} 
              onChange={e => setProfileForm({...profileForm, whatsapp: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-[#a3e635] transition-all font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black opacity-30 uppercase tracking-widest px-2">Chave PIX</label>
            <input 
              placeholder="Chave para recebimento"
              value={profileForm.pix_key} 
              onChange={e => setProfileForm({...profileForm, pix_key: e.target.value})}
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
    </div>
  );
};

export default Wallet;
