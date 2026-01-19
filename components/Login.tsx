
import React, { useState } from 'react';
import { User, UserRole } from '../types';

interface LoginProps {
  onLogin: (u: User) => void;
  users: User[];
  setUsers: (u: User[]) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, users, setUsers }) => {
  const [isReg, setIsReg] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isReg) {
        if (users.some(u => u.username.toLowerCase() === form.username.toLowerCase())) {
          return alert("Este login já está em uso!");
        }
        
        const newUser: User = { 
          id: Math.random().toString(36).substr(2, 9), 
          ...form, 
          role: UserRole.CLIENT, 
          balance: 0, 
          commission_rate: 0, 
          parent_id: 'admin-1',
          created_at: Date.now() 
        };
        
        setUsers([...users, newUser]);
        setIsReg(false);
        alert("Cadastro realizado! Bem-vindo à arena.");
      } else {
        const user = users.find(u => 
          u.username.toLowerCase() === form.username.toLowerCase() && 
          u.password === form.password
        );

        if (user) {
          onLogin(user);
          localStorage.setItem('dgrau_v1_session', JSON.stringify(user));
        } else {
          alert("Login ou senha incorretos. Tente novamente.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#a3e635]/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md glass-card p-10 md:p-14 rounded-[4rem] text-center border-t-4 border-t-[#a3e635] shadow-2xl relative z-10 animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-[#a3e635] rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-6 text-slate-950 ring-4 ring-white/5">
          <i className="fa-solid fa-futbol text-4xl"></i>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-impact italic uppercase text-white mb-2 tracking-tighter">
          Rodada <span className="text-[#a3e635]">D'grau</span>
        </h1>
        <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.4em] mb-10">
          {isReg ? 'Recrutamento de Atletas' : 'Portal de Entrada'}
        </p>

        <form onSubmit={handle} className="space-y-4">
          {isReg && (
            <input 
              required 
              placeholder="Nome Completo" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})} 
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-[#a3e635] transition-all" 
            />
          )}
          <input 
            required 
            placeholder="Seu Login" 
            value={form.username} 
            onChange={e => setForm({...form, username: e.target.value})} 
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-[#a3e635] transition-all" 
          />
          <input 
            required 
            type="password" 
            placeholder="Sua Senha" 
            value={form.password} 
            onChange={e => setForm({...form, password: e.target.value})} 
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-[#a3e635] transition-all" 
          />
          <button 
            disabled={loading}
            className="btn-primary w-full py-5 rounded-2xl text-sm tracking-widest mt-6 shadow-xl active:scale-95 disabled:opacity-50"
          >
            {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : (isReg ? 'CADASTRAR' : 'ENTRAR NA ARENA')}
          </button>
        </form>

        <button 
          onClick={() => setIsReg(!isReg)} 
          className="mt-8 text-[9px] font-black opacity-30 uppercase hover:opacity-100 transition-opacity tracking-widest"
        >
          {isReg ? 'Já possui acesso? Conecte-se' : 'Não tem conta? Registre-se agora'}
        </button>
      </div>
    </div>
  );
};

export default Login;
