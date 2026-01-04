
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

const INITIAL_MATCHES: Match[] = Array.from({ length: 12 }, (_, i) => ({
  id: `${i + 1}`,
  home: `Equipe Casa ${i + 1}`,
  away: `Equipe Fora ${i + 1}`,
  league: 'Série A Brasil',
  time: '16:00'
}));

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.users || [];
      }
    } catch {}
    return [{ id: 'admin-1', name: 'Diretoria Master', username: 'admin', password: '123', role: UserRole.ADMIN, balance: 1000000, commission_rate: 0 }];
  });

  const [matches, setMatches] = useState<Match[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.matches || INITIAL_MATCHES;
      }
    } catch {}
    return INITIAL_MATCHES;
  });

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.tickets || [];
      }
    } catch {}
    return [];
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.settings || { pix_key: 'admin@dgrau.com', is_market_open: true };
      }
    } catch {}
    return { pix_key: 'admin@dgrau.com', is_market_open: true };
  });

  const [balanceRequests, setBalanceRequests] = useState<BalanceRequest[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.balanceRequests || [];
      }
    } catch {}
    return [];
  });

  const [view, setView] = useState<'BET' | 'HISTORY' | 'WALLET' | 'DASHBOARD'>('BET');

  // --- SINCRONIZAÇÃO EM TEMPO REAL ---
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const fetchData = async () => {
      const { data: m } = await supabase.from('matches').select('*').order('id', { ascending: true });
      if (m) setMatches(m);
      const { data: u } = await supabase.from('users').select('*');
      if (u) setUsers(u);
      const { data: t } = await supabase.from('tickets').select('*').order('timestamp', { ascending: false });
      if (t) setTickets(t);
      const { data: r } = await supabase.from('balance_requests').select('*').order('created_at', { ascending: false });
      if (r) setBalanceRequests(r);
    };
    fetchData();

    const channel = supabase.channel('realtime-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, payload => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          setMatches(current => {
            const updated = payload.new as Match;
            return current.map(m => m.id === updated.id ? updated : m);
          });
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
          if (currentUser && updated.id === currentUser.id) setCurrentUser(updated);
        } else if (payload.eventType === 'DELETE') {
          setUsers(current => current.filter(u => u.id !== payload.old.id));
          if (currentUser && payload.old.id === currentUser.id) handleLogout();
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, payload => {
        setTickets(prev => [payload.new as Ticket, ...prev]);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'balance_requests' }, payload => {
        setBalanceRequests(prev => [payload.new as BalanceRequest, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  const handleUpdateMatches = async (updater: any) => {
    setMatches(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (isSupabaseConfigured) supabase.from('matches').upsert(next).then();
      return next;
    });
  };

  const handleUpdateUsers = async (updater: any) => {
    setUsers(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (isSupabaseConfigured) supabase.from('users').upsert(next).then();
      return next;
    });
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("⚠️ ATENÇÃO: Deseja realmente excluir este usuário? Esta ação é irreversível e removerá o acesso dele imediatamente.")) return;
    
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (isSupabaseConfigured) {
      await supabase.from('users').delete().eq('id', userId);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    setView('BET');
  };

  useEffect(() => {
    const data = { users, matches, tickets, settings, balanceRequests };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [users, matches, tickets, settings, balanceRequests]);

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
            tickets={tickets} settings={settings} setSettings={setSettings}
            balanceRequests={balanceRequests} setBalanceRequests={setBalanceRequests}
          />
        )}
        {view === 'DASHBOARD' && currentUser.role === UserRole.SUPERVISOR && <SupervisorDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} users={users} setUsers={handleUpdateUsers} onDeleteUser={handleDeleteUser} tickets={tickets} balanceRequests={balanceRequests} setBalanceRequests={setBalanceRequests} />}
        {view === 'DASHBOARD' && currentUser.role === UserRole.BOOKIE && <BookieDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} users={users} setUsers={handleUpdateUsers} onDeleteUser={handleDeleteUser} tickets={tickets} balanceRequests={balanceRequests} setBalanceRequests={setBalanceRequests} />}
        {view === 'BET' && <BettingArea matches={matches} user={currentUser} onBet={async t => { setTickets([t, ...tickets]); if(isSupabaseConfigured) await supabase.from('tickets').insert(t); }} setUser={setCurrentUser} isMarketOpen={settings.is_market_open} />}
        {view === 'HISTORY' && <TicketHistory tickets={tickets.filter(t => t.user_id === currentUser.id || currentUser.role === UserRole.ADMIN)} currentUser={currentUser} setView={setView} />}
        {view === 'WALLET' && <Wallet user={currentUser} settings={settings} users={users} balanceRequests={balanceRequests} setBalanceRequests={setBalanceRequests} setView={setView} />}
      </main>
    </div>
  );
};

export default App;
