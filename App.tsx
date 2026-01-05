
import React, { useState, useEffect } from 'react';
import { User, UserRole, Match, Ticket, AppSettings, BalanceRequest } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import BookieDashboard from './components/BookieDashboard';
import SupervisorDashboard from './components/SupervisorDashboard';
import BettingArea from './components/BettingArea';
import TicketHistory from './components/TicketHistory';
import Wallet from './components/Wallet';
import Navbar from './components/Navbar';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY = 'dgrau_v1_data';
const SESSION_KEY = 'dgrau_v1_session';
const ADMIN_PIX = '3db60233-bf8c-4364-9513-f3ac32c5b';

const INITIAL_MATCHES: Match[] = Array.from({ length: 12 }, (_, i) => ({
  id: `${i + 1}`,
  home: `Equipe Casa ${i + 1}`,
  away: `Equipe Fora ${i + 1}`,
  league: 'Série A Brasil',
  time: '16:00'
}));

const DEFAULT_ADMIN: User = {
  id: 'admin-1',
  name: 'Diretoria Master',
  username: 'admin',
  password: '123',
  role: UserRole.ADMIN,
  balance: 0,
  commission_rate: 0,
  created_at: Date.now()
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [users, setUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [balanceRequests, setBalanceRequests] = useState<BalanceRequest[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ pix_key: ADMIN_PIX, is_market_open: true });
  const [view, setView] = useState<'BET' | 'HISTORY' | 'WALLET' | 'DASHBOARD'>('BET');

  // --- NÚCLEO DE SINCRONIZAÇÃO EM TEMPO REAL ---
  useEffect(() => {
    const startSync = async () => {
      // 1. Carregamento Inicial (Prioridade: Supabase > LocalStorage)
      if (isSupabaseConfigured) {
        const { data: u } = await supabase.from('users').select('*');
        const { data: m } = await supabase.from('matches').select('*').order('id', { ascending: true });
        const { data: t } = await supabase.from('tickets').select('*').order('timestamp', { ascending: false });
        const { data: r } = await supabase.from('balance_requests').select('*').order('created_at', { ascending: false });
        const { data: s } = await supabase.from('settings').select('*').single();

        if (m && m.length > 0) setMatches(m);
        if (t) setTickets(t);
        if (r) setBalanceRequests(r);
        if (s) setSettings(s);

        // Lógica de Auto-Seed para o Admin
        let userList = u || [];
        if (!userList.some(user => user.role === UserRole.ADMIN)) {
          await supabase.from('users').upsert(DEFAULT_ADMIN);
          userList = [DEFAULT_ADMIN, ...userList];
        }
        setUsers(userList);
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setUsers(parsed.users || [DEFAULT_ADMIN]);
          setMatches(parsed.matches || INITIAL_MATCHES);
          setTickets(parsed.tickets || []);
          setSettings(parsed.settings || { pix_key: ADMIN_PIX, is_market_open: true });
          setBalanceRequests(parsed.balanceRequests || []);
        } else {
          setUsers([DEFAULT_ADMIN]);
        }
      }

      // 2. Escuta de Canais Realtime (Somente se configurado)
      if (isSupabaseConfigured) {
        const channel = supabase.channel('arena-realtime')
          // Sincronizar Jogos/Grade
          .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, payload => {
            const updated = payload.new as Match;
            setMatches(prev => prev.map(m => m.id === updated.id ? updated : m));
          })
          // Sincronizar Configurações (Chave PIX e Status de Mercado)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, payload => {
            setSettings(payload.new as AppSettings);
          })
          // Sincronizar Usuários (Saldos, Novos cadastros, Edições de Perfil)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
            if (payload.eventType === 'DELETE') {
              setUsers(prev => prev.filter(u => u.id !== payload.old.id));
              if (currentUser?.id === payload.old.id) handleLogout();
            } else {
              const updated = payload.new as User;
              setUsers(prev => {
                const exists = prev.find(u => u.id === updated.id);
                return exists ? prev.map(u => u.id === updated.id ? updated : u) : [updated, ...prev];
              });
              // Se o usuário alterado for EU, atualiza minha sessão
              if (currentUser?.id === updated.id) {
                setCurrentUser(updated);
                localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
              }
            }
          })
          // Sincronizar Pedidos de Saldo
          .on('postgres_changes', { event: '*', schema: 'public', table: 'balance_requests' }, payload => {
            if (payload.eventType === 'INSERT') {
              setBalanceRequests(prev => [payload.new as BalanceRequest, ...prev]);
            } else {
              const updated = payload.new as BalanceRequest;
              setBalanceRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
            }
          })
          // Sincronizar Bilhetes
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, payload => {
            setTickets(prev => [payload.new as Ticket, ...prev]);
          })
          .subscribe();

        return () => { supabase.removeChannel(channel); };
      }
    };

    startSync();
  }, [currentUser?.id]);

  // Backup persistente no LocalStorage (para funcionamento offline/instável)
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ users, matches, tickets, settings, balanceRequests }));
    }
  }, [users, matches, tickets, settings, balanceRequests]);

  // Handlers de Ações (Sempre tentam o Supabase primeiro)
  const handleUpdateMatches = async (updater: any) => {
    const next = typeof updater === 'function' ? updater(matches) : updater;
    setMatches(next);
    if (isSupabaseConfigured) await supabase.from('matches').upsert(next);
  };

  const handleUpdateUsers = async (updater: any) => {
    const next = typeof updater === 'function' ? updater(users) : updater;
    setUsers(next);
    if (isSupabaseConfigured) await supabase.from('users').upsert(next);
  };

  const handleUpdateSingleUser = async (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (isSupabaseConfigured) await supabase.from('users').upsert(updatedUser);
  };

  const handleDeleteUser = async (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (isSupabaseConfigured) await supabase.from('users').delete().eq('id', userId);
  };

  const handleUpdateSettings = async (next: AppSettings) => {
    setSettings(next);
    if (isSupabaseConfigured) await supabase.from('settings').upsert({ id: 1, ...next });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    setView('BET');
  };

  // Se não estiver logado, exibe tela de login. O login usa a lista sincronizada de users.
  if (!currentUser) return <Login onLogin={setCurrentUser} users={users} setUsers={handleUpdateUsers} />;

  const pendingCount = balanceRequests.filter(r => r.status === 'PENDING' && (
    users.find(u => u.id === r.user_id)?.parent_id === currentUser.id
  )).length;

  return (
    <div className="min-h-screen bg-[#020617] text-white pt-32 pb-20">
      <Navbar 
        user={currentUser} 
        view={view} 
        setView={setView} 
        onLogout={handleLogout} 
        isMarketOpen={settings.is_market_open} 
        pendingCount={pendingCount} 
      />
      
      <main className="container mx-auto px-4">
        {view === 'DASHBOARD' && currentUser.role === UserRole.ADMIN && (
          <AdminDashboard 
            users={users} setUsers={handleUpdateUsers} onDeleteUser={handleDeleteUser}
            matches={matches} setMatches={handleUpdateMatches} 
            tickets={tickets} settings={settings} setSettings={handleUpdateSettings}
            balanceRequests={balanceRequests} setBalanceRequests={setBalanceRequests}
          />
        )}
        {view === 'DASHBOARD' && currentUser.role === UserRole.SUPERVISOR && <SupervisorDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} users={users} setUsers={handleUpdateUsers} onDeleteUser={handleDeleteUser} tickets={tickets} balanceRequests={balanceRequests} setBalanceRequests={setBalanceRequests} />}
        {view === 'DASHBOARD' && currentUser.role === UserRole.BOOKIE && <BookieDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} users={users} setUsers={handleUpdateUsers} onDeleteUser={handleDeleteUser} tickets={tickets} balanceRequests={balanceRequests} setBalanceRequests={setBalanceRequests} />}
        {view === 'BET' && <BettingArea matches={matches} user={currentUser} onBet={async t => { setTickets([t, ...tickets]); if(isSupabaseConfigured) await supabase.from('tickets').insert(t); }} setUser={setCurrentUser} isMarketOpen={settings.is_market_open} />}
        {view === 'HISTORY' && <TicketHistory tickets={tickets.filter(t => t.user_id === currentUser.id || currentUser.role === UserRole.ADMIN)} currentUser={currentUser} setView={setView} />}
        {view === 'WALLET' && <Wallet user={currentUser} settings={settings} users={users} balanceRequests={balanceRequests} setBalanceRequests={setBalanceRequests} setView={setView} onUpdateUser={handleUpdateSingleUser} onDeleteUser={handleDeleteUser} />}
      </main>
    </div>
  );
};

export default App;
