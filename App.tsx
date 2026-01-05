
import React, { useState, useEffect, useRef } from 'react';
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

  // --- AUTOMAÇÃO DE SINCRONIZAÇÃO E AUTO-SEED ---
  useEffect(() => {
    const initApp = async () => {
      if (!isSupabaseConfigured) {
        // Fallback para LocalStorage
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            let currentUsers = parsed.users || [];
            
            // Auto-Seed Admin se não existir
            if (!currentUsers.some((u: User) => u.role === UserRole.ADMIN)) {
              currentUsers = [DEFAULT_ADMIN, ...currentUsers];
            }
            
            setUsers(currentUsers);
            if (parsed.matches) setMatches(parsed.matches);
            if (parsed.tickets) setTickets(parsed.tickets);
            if (parsed.settings) setSettings(parsed.settings);
            if (parsed.balanceRequests) setBalanceRequests(parsed.balanceRequests);
          } else {
            // App virgem, cria o admin
            setUsers([DEFAULT_ADMIN]);
          }
        } catch {}
        return;
      }

      // Supabase Ligado
      const fetchData = async () => {
        const { data: m } = await supabase.from('matches').select('*').order('id', { ascending: true });
        if (m && m.length > 0) setMatches(m);
        
        const { data: u } = await supabase.from('users').select('*');
        let currentUsers = u || [];

        // Auto-Seed no Supabase se não houver Admin
        if (!currentUsers.some((u: User) => u.role === UserRole.ADMIN)) {
          await supabase.from('users').upsert(DEFAULT_ADMIN);
          currentUsers = [DEFAULT_ADMIN, ...currentUsers];
        }
        setUsers(currentUsers);
        
        const { data: t } = await supabase.from('tickets').select('*').order('timestamp', { ascending: false });
        if (t) setTickets(t);
        
        const { data: r } = await supabase.from('balance_requests').select('*').order('created_at', { ascending: false });
        if (r) setBalanceRequests(r);

        const { data: s } = await supabase.from('settings').select('*').single();
        if (s) setSettings(s);
      };
      
      fetchData();

      // Realtime subscription
      const channel = supabase.channel('global-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, payload => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as Match;
            setMatches(current => current.map(m => m.id === updated.id ? updated : m));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, payload => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setSettings(payload.new as AppSettings);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as User;
            setUsers(current => {
              const exists = current.find(u => u.id === updated.id);
              if (exists) return current.map(u => u.id === updated.id ? updated : u);
              return [...current, updated];
            });
            if (currentUser && updated.id === currentUser.id) {
              setCurrentUser(updated);
              localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
            }
          } else if (payload.eventType === 'DELETE') {
            setUsers(current => current.filter(u => u.id !== payload.old.id));
            if (currentUser && payload.old.id === currentUser.id) handleLogout();
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, payload => {
          setTickets(prev => [payload.new as Ticket, ...prev]);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'balance_requests' }, payload => {
          if (payload.eventType === 'INSERT') {
            setBalanceRequests(prev => [payload.new as BalanceRequest, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as BalanceRequest;
            setBalanceRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };

    initApp();
  }, [currentUser?.id]);

  useEffect(() => {
    if (users.length > 0) {
      const data = { users, matches, tickets, settings, balanceRequests };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [users, matches, tickets, settings, balanceRequests]);

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

  const handleSingleUserUpdate = async (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (updatedUser.id === currentUser?.id) {
      setCurrentUser(updatedUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    }
    if (isSupabaseConfigured) await supabase.from('users').upsert(updatedUser);
  };

  const handleUpdateSettings = async (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    if (isSupabaseConfigured) await supabase.from('settings').upsert({ id: 1, ...nextSettings });
  };

  const handleDeleteUser = async (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (currentUser && currentUser.id === userId) handleLogout();
    if (isSupabaseConfigured) await supabase.from('users').delete().eq('id', userId);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    setView('BET');
  };

  if (!currentUser) return <Login onLogin={setCurrentUser} users={users} setUsers={handleUpdateUsers} />;

  const pendingCount = balanceRequests.filter(r => r.status === 'PENDING' && (
    users.find(u => u.id === r.user_id)?.parent_id === currentUser.id
  )).length;

  return (
    <div className="min-h-screen bg-[#020617] text-white pt-32 pb-20">
      <Navbar user={currentUser} view={view} setView={setView} onLogout={handleLogout} isMarketOpen={settings.is_market_open} pendingCount={pendingCount} />
      
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
        {view === 'WALLET' && <Wallet user={currentUser} settings={settings} users={users} balanceRequests={balanceRequests} setBalanceRequests={setBalanceRequests} setView={setView} onUpdateUser={handleSingleUserUpdate} onDeleteUser={handleDeleteUser} />}
      </main>
    </div>
  );
};

export default App;
