
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
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.users || [];
    }
    return [{ id: 'admin-1', name: 'Diretoria Master', username: 'admin', password: '123', role: UserRole.ADMIN, balance: 1000000, commission_rate: 0 }];
  });

  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.matches || INITIAL_MATCHES;
    }
    return INITIAL_MATCHES;
  });

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.tickets || [];
    }
    return [];
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.settings || { pix_key: 'admin@dgrau.com', is_market_open: true };
    }
    return { pix_key: 'admin@dgrau.com', is_market_open: true };
  });

  const [balanceRequests, setBalanceRequests] = useState<BalanceRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.balanceRequests || [];
    }
    return [];
  });

  const [notification, setNotification] = useState<{show: boolean, msg: string} | null>(null);
  const prevReqCount = useRef(balanceRequests.length);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [view, setView] = useState<'BET' | 'HISTORY' | 'WALLET' | 'DASHBOARD'>('BET');

  // --- REALTIME SYNC LOGIC ---
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Sincronização Inicial
    const fetchData = async () => {
      const { data: m } = await supabase.from('matches').select('*');
      if (m) setMatches(m);
      const { data: u } = await supabase.from('users').select('*');
      if (u) setUsers(u);
      const { data: t } = await supabase.from('tickets').select('*').order('timestamp', { ascending: false });
      if (t) setTickets(t);
      const { data: r } = await supabase.from('balance_requests').select('*').order('created_at', { ascending: false });
      if (r) setBalanceRequests(r);
    };
    fetchData();

    // Inscrição em Tempo Real para mudanças globais
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, payload => {
        setMatches(current => {
          if (payload.eventType === 'INSERT') return [...current, payload.new as Match];
          if (payload.eventType === 'UPDATE') return current.map(m => m.id === payload.new.id ? payload.new as Match : m);
          if (payload.eventType === 'DELETE') return current.filter(m => m.id !== payload.old.id);
          return current;
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
        setUsers(current => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as User;
            if (currentUser && updated.id === currentUser.id) {
              setCurrentUser(updated);
            }
            return current.map(u => u.id === updated.id ? updated : u);
          }
          if (payload.eventType === 'INSERT') return [...current, payload.new as User];
          return current;
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, payload => {
        if (payload.eventType === 'INSERT') setTickets(prev => [payload.new as Ticket, ...prev]);
        if (payload.eventType === 'UPDATE') setTickets(prev => prev.map(t => t.id === payload.new.id ? payload.new as Ticket : t));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'balance_requests' }, payload => {
        if (payload.eventType === 'INSERT') setBalanceRequests(prev => [payload.new as BalanceRequest, ...prev]);
        if (payload.eventType === 'UPDATE') setBalanceRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new as BalanceRequest : r));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Função helper para persistir mudanças tanto local quanto remotamente
  const updateDB = async (table: string, data: any) => {
    if (isSupabaseConfigured) {
      await supabase.from(table).upsert(data);
    }
  };

  // Monitorar novas solicitações para notificar o Gerente/Criador
  useEffect(() => {
    if (currentUser && balanceRequests.length > prevReqCount.current) {
      const lastReq = balanceRequests[0];
      const requester = users.find(u => u.id === lastReq.user_id);
      const parentId = requester?.parent_id || 'admin-1';

      if (lastReq.status === 'PENDING' && currentUser.id === parentId) {
        setNotification({ show: true, msg: `Nova recarga de R$ ${lastReq.amount.toFixed(2)} solicitada por ${lastReq.user_name}` });
        try {
          if (!audioRef.current) {
            audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          }
          audioRef.current.play().catch(() => {});
        } catch (e) {}
        setTimeout(() => setNotification(null), 5000);
      }
    }
    prevReqCount.current = balanceRequests.length;
  }, [balanceRequests, currentUser, users]);

  useEffect(() => {
    const dataToSave = { users, matches, tickets, settings, balanceRequests };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [users, matches, tickets, settings, balanceRequests]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser]);

  if (!currentUser) return <Login onLogin={setCurrentUser} users={users} setUsers={(u) => { setUsers(u); updateDB('users', u); }} />;

  const handleLogout = () => {
    setCurrentUser(null);
    setView('BET');
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (window.confirm("Excluir este bilhete permanentemente?")) {
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      if (isSupabaseConfigured) await supabase.from('tickets').delete().eq('id', ticketId);
    }
  };

  const pendingCount = balanceRequests.filter(r => r.status === 'PENDING' && (
    users.find(u => u.id === r.user_id)?.parent_id === currentUser.id
  )).length;

  const renderContent = () => {
    switch (view) {
      case 'DASHBOARD':
        if (currentUser.role === UserRole.ADMIN) return (
          <AdminDashboard 
            users={users} 
            setUsers={(u) => { setUsers(u); updateDB('users', u); }} 
            matches={matches} 
            setMatches={(m) => { setMatches(m); updateDB('matches', m); }} 
            tickets={tickets} 
            setTickets={setTickets}
            settings={settings}
            setSettings={setSettings}
            balanceRequests={balanceRequests}
            setBalanceRequests={setBalanceRequests}
          />
        );
        if (currentUser.role === UserRole.SUPERVISOR) return <SupervisorDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} users={users} setUsers={(u) => { setUsers(u); updateDB('users', u); }} tickets={tickets} setTickets={setTickets} balanceRequests={balanceRequests} setBalanceRequests={setBalanceRequests} />;
        if (currentUser.role === UserRole.BOOKIE) return <BookieDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} users={users} setUsers={(u) => { setUsers(u); updateDB('users', u); }} tickets={tickets} setTickets={setTickets} balanceRequests={balanceRequests} setBalanceRequests={setBalanceRequests} />;
        return <BettingArea matches={matches} user={currentUser} onBet={async t => { setTickets([t, ...tickets]); if(isSupabaseConfigured) await supabase.from('tickets').insert(t); }} setUser={setCurrentUser} isMarketOpen={settings.is_market_open} />;
      case 'HISTORY':
        return <TicketHistory tickets={tickets.filter(t => t.user_id === currentUser.id || currentUser.role === UserRole.ADMIN)} currentUser={currentUser} setView={v => setView(v as any)} onDelete={handleDeleteTicket} />;
      case 'WALLET':
        return <Wallet user={currentUser} settings={settings} users={users} balanceRequests={balanceRequests} setBalanceRequests={async r => { setBalanceRequests(r); if(isSupabaseConfigured) await updateDB('balance_requests', r); }} setView={v => setView(v as any)} />;
      default:
        return <BettingArea matches={matches} user={currentUser} onBet={async t => { setTickets([t, ...tickets]); if(isSupabaseConfigured) await supabase.from('tickets').insert(t); }} setUser={setCurrentUser} isMarketOpen={settings.is_market_open} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-[#a3e635] selection:text-black pt-32 pb-20">
      <Navbar user={currentUser} view={view} setView={setView} onLogout={handleLogout} isMarketOpen={settings.is_market_open} pendingCount={pendingCount} />
      
      {notification && (
        <div className="fixed top-28 right-6 z-[200] animate-in slide-in-from-right-10 duration-500">
          <div className="bg-[#a3e635] text-black px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 border-4 border-black font-impact italic uppercase text-xs">
            <div className="w-10 h-10 bg-black text-[#a3e635] rounded-full flex items-center justify-center animate-bounce">
              <i className="fa-solid fa-bell"></i>
            </div>
            <span>{notification.msg}</span>
            <button onClick={() => setNotification(null)} className="ml-4 opacity-40 hover:opacity-100">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
