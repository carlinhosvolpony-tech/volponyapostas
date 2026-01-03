
import React, { useState } from 'react';
import { User, UserRole } from '../types';

const Login: React.FC<{ onLogin: (u: User) => void, users: User[], setUsers: (u: User[]) => void }> = ({ onLogin, users, setUsers }) => {
  const [isReg, setIsReg] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', name: '' });

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReg) {
      if (users.some(u => u.username === form.username)) return alert("Este login já está em uso!");
      
      const newUser: User = { 
        id: Math.random().toString(36).substr(2, 9), 
        ...form, 
        role: UserRole.CLIENT, 
        balance: 0, 
        commission_rate: 0, 
        parent_id: 'admin-1', // Vincula diretamente ao Admin Master
        created_at: Date.now() 
      };
      setUsers([...users, newUser]);
      setIsReg(false);
      alert("Cadastro realizado com sucesso! Agora você é um atleta direto da Diretoria Master.");
    } else {
      const user = users.find(u => u.username === form.username && u.password === form.password);
      if (user) onLogin(user);
      else alert("Acesso negado! Verifique seu login e senha.");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md glass-card p-12 rounded-[4rem] text-center border-t-4 border-t-[#a3e635]">
        <div className="w-24 h-24 bg-[#a3e635] rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-6 text-slate-950">
          <i className="fa-solid fa-futbol text-5xl"></i>
        </div>
        <h1 className="text-5xl font-impact italic uppercase text-white mb-2 tracking-tighter">D'Grau <span className="text-[#a3e635]">Apostas</span></h1>
        <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.4em] mb-10">{isReg ? 'Novo Atleta Direto' : 'Entrada na Arena'}</p>
        <form onSubmit={handle} className="space-y-4">
          {isReg && <input required placeholder="Nome Completo" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-[#a3e635]" />}
          <input required placeholder="Login" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-[#a3e635]" />
          <input required type="password" placeholder="Senha" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-[#a3e635]" />
          <button className="btn-primary w-full py-5 rounded-2xl text-sm tracking-widest mt-6 shadow-xl">{isReg ? 'CADASTRAR' : 'ENTRAR'}</button>
        </form>
        <button onClick={() => setIsReg(!isReg)} className="mt-8 text-[10px] font-black opacity-20 uppercase hover:opacity-100">{isReg ? 'Já tenho conta' : 'Criar conta de Atleta'}</button>
      </div>
    </div>
  );
};

export default Login;
