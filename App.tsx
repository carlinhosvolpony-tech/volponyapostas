
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Mostrar prompt após 3 segundos de navegação
      setTimeout(() => setShowInstallPrompt(true), 3000);
    });

    // Detectar se já está rodando como app
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallPrompt(false);
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  // --- NÚCLEO DE SINCRONIZAÇÃO EM TEMPO REAL ---
  useEffect(() => {
    const startSync = async () => {
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

      if (isSupabaseConfigured) {
        const channel = supabase.channel('arena-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, payload => {
            const updated = payload.new as Match;
            setMatches(prev => prev.map(m => m.id === updated.id ? updated : m));
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, payload => {
            setSettings(payload.new as AppSettings);
          })
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
              if (currentUser?.id === updated.id) {
                setCurrentUser(updated);
                localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
              }
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'balance_requests' }, payload => {
            if (payload.eventType === 'INSERT') {
              setBalanceRequests(prev => [payload.new as BalanceRequest, ...prev]);
            } else {
              const updated = payload.new as BalanceRequest;
              setBalanceRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
            }
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, payload => {
            if (payload.eventType === 'DELETE') {
               setTickets(prev => prev.filter(t => t.id !== payload.old.id));
            } else if (payload.eventType === 'INSERT') {
               setTickets(prev => [payload.new as Ticket, ...prev]);
            }
          })
          .subscribe();

        return () => { supabase.removeChannel(channel); };
      }
    };

    startSync();
  }, [currentUser?.id]);

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ users, matches, tickets, settings, balanceRequests }));
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

  const handleUpdateSingleUser = async (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
    }
    if (isSupabaseConfigured) {
      await supabase.from('users').upsert(updatedUser);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (isSupabaseConfigured) await supabase.from('users').delete().eq('id', userId);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm("Deseja realmente excluir este bilhete permanentemente?")) return;
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    if (isSupabaseConfigured) {
      await supabase.from('tickets').delete().eq('id', ticketId);
    }
    alert("Bilhete excluído com sucesso.");
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
            currentUser={currentUser}
            onUpdateSingleUser={handleUpdateSingleUser}
          />
        )}
        {view === 'DASHBOARD' && currentUser.role === UserRole.SUPERVISOR && <SupervisorDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} users={users} setUsers={handleUpdateUsers} onDeleteUser={handleDeleteUser} tickets={tickets} balanceRequests={balanceRequests} setBalanceRequests={setBalanceRequests} />}
        {view === 'DASHBOARD' && currentUser.role === UserRole.BOOKIE && <BookieDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} users={users} setUsers={handleUpdateUsers} onDeleteUser={handleDeleteUser} tickets={tickets} balanceRequests={balanceRequests} setBalanceRequests={setBalanceRequests} />}
        
        {view === 'BET' && (
          <BettingArea 
            matches={matches} 
            user={currentUser} 
            onBet={async t => { 
              setTickets([t, ...tickets]); 
              if(isSupabaseConfigured) await supabase.from('tickets').insert(t); 
            }} 
            setUser={handleUpdateSingleUser} 
            isMarketOpen={settings.is_market_open} 
          />
        )}
        
        {view === 'HISTORY' && (
          <TicketHistory 
            tickets={tickets.filter(t => t.user_id === currentUser.id || currentUser.role === UserRole.ADMIN)} 
            currentUser={currentUser} 
            setView={setView} 
            onDelete={handleDeleteTicket}
          />
        )}
        {view === 'WALLET' && <Wallet user={currentUser} settings={settings} users={users} balanceRequests={balanceRequests} setBalanceRequests={setBalanceRequests} setView={setView} onUpdateUser={handleUpdateSingleUser} onDeleteUser={handleDeleteUser} />}
      </main>

      {/* PWA INSTALL PROMPT */}
      {showInstallPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[200] pwa-prompt">
          <div className="glass-card p-6 rounded-[2.5rem] border-2 border-[#a3e635]/30 flex flex-col items-center gap-4 text-center shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <div className="w-16 h-16 bg-[#a3e635] rounded-2xl flex items-center justify-center text-slate-950 shadow-lg shadow-[#a3e635]/20">
              <i className="fa-solid fa-mobile-screen-button text-3xl"></i>
            </div>
            <div>
              <p className="font-impact italic text-white uppercase text-lg tracking-tighter">VOLPONY NO CELULAR</p>
              <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-1">Instale o app para a melhor experiência</p>
            </div>
            <div className="flex gap-2 w-full mt-2">
               <button 
                  onClick={() => setShowInstallPrompt(false)}
                  className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
               >
                 Agora Não
               </button>
               <button 
                  onClick={handleInstallClick}
                  className="flex-[2] py-4 bg-[#a3e635] text-black font-impact italic rounded-2xl text-[11px] uppercase tracking-widest shadow-lg shadow-[#a3e635]/10 hover:scale-105 active:scale-95 transition-all"
               >
                 Instalar Grátis
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
