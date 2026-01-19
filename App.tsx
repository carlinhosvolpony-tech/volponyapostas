
import React, { useState, useEffect } from 'react';
import { User, UserRole, Match, Ticket, AppSettings, Settlement } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import BookieDashboard from './components/BookieDashboard';
import SupervisorDashboard from './components/SupervisorDashboard';
import BettingArea from './components/BettingArea';
import TicketHistory from './components/TicketHistory';
import Wallet from './components/Wallet';
import Navbar from './components/Navbar';

const STORAGE_KEY = 'dgrau_v1_numbers_data';
const SESSION_KEY = 'dgrau_v1_session';
const ADMIN_PIX = 'Sua Chave Pix Aqui';

const INITIAL_GAMES: Match[] = [
  { id: '1', home: 'Flamengo', away: 'Palmeiras', label: 'Jogo 01' },
  { id: '2', home: 'São Paulo', away: 'Corinthians', label: 'Jogo 02' },
  { id: '3', home: 'Gremio', away: 'Inter', label: 'Jogo 03' },
  { id: '4', home: 'Atlético-MG', away: 'Cruzeiro', label: 'Jogo 04' },
  { id: '5', home: 'Bahia', away: 'Vitória', label: 'Jogo 05' },
  { id: '6', home: 'Botafogo', away: 'Vasco', label: 'Jogo 06' },
  { id: '7', home: 'Fluminense', away: 'Santos', label: 'Jogo 07' },
  { id: '8', home: 'Fortaleza', away: 'Ceará', label: 'Jogo 08' },
  { id: '9', home: 'Athletico-PR', away: 'Coritiba', label: 'Jogo 09' },
  { id: '10', home: 'Sport', away: 'Náutico', label: 'Jogo 10' },
  { id: '11', home: 'Real Madrid', away: 'Barcelona', label: 'Jogo 11' },
  { id: '12', home: 'Man City', away: 'Arsenal', label: 'Jogo 12' },
];

const DEFAULT_ADMIN: User = {
  id: 'admin-1',
  name: 'Diretoria Master',
  username: 'admin',
  password: '123',
  role: UserRole.ADMIN,
  balance: 0,
  commission_rate: 0,
  whatsapp: '5511999999999',
  pix_key: ADMIN_PIX,
  created_at: Date.now()
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>(INITIAL_GAMES);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ pix_key: ADMIN_PIX, is_market_open: true, prize_multiplier: 500 });
  const [view, setView] = useState<'BET' | 'HISTORY' | 'PROFILE' | 'DASHBOARD'>('BET');

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setUsers(parsed.users || [DEFAULT_ADMIN]);
      setMatches(parsed.matches || INITIAL_GAMES);
      setTickets(parsed.tickets || []);
      setSettlements(parsed.settlements || []);
      setSettings(parsed.settings || { pix_key: ADMIN_PIX, is_market_open: true, prize_multiplier: 500 });
    } else {
      setUsers([DEFAULT_ADMIN]);
    }
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ users, matches, tickets, settings, settlements }));
    }
  }, [users, matches, tickets, settings, settlements]);

  const handleUpdateSingleUser = (updated: User) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    if (currentUser?.id === updated.id) {
      setCurrentUser(updated);
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    }
  };

  if (!currentUser) return <Login onLogin={setCurrentUser} users={users} setUsers={setUsers} />;

  return (
    <div className="min-h-screen bg-[#020617] text-white pt-32 pb-20 overflow-x-hidden">
      <Navbar user={currentUser} view={view} setView={setView} onLogout={() => { setCurrentUser(null); localStorage.removeItem(SESSION_KEY); }} isMarketOpen={settings.is_market_open} />
      <main className="container mx-auto px-4">
        {view === 'BET' && <BettingArea matches={matches} user={currentUser} onBet={t => setTickets([t, ...tickets])} settings={settings} users={users} />}
        {view === 'HISTORY' && <TicketHistory tickets={tickets.filter(t => t.user_id === currentUser.id || currentUser.role !== UserRole.CLIENT)} currentUser={currentUser} users={users} setView={setView} onUpdateStatus={(id, s) => setTickets(tickets.map(t => t.id === id ? {...t, status: s} : t))} />}
        {view === 'PROFILE' && <Wallet user={currentUser} settings={settings} users={users} setView={setView} onUpdateUser={handleUpdateSingleUser} onDeleteUser={id => setUsers(users.filter(u => u.id !== id))} />}
        {view === 'DASHBOARD' && currentUser.role === UserRole.ADMIN && <AdminDashboard users={users} setUsers={setUsers} onDeleteUser={id => setUsers(users.filter(u => u.id !== id))} matches={matches} setMatches={setMatches} tickets={tickets} settings={settings} setSettings={setSettings} currentUser={currentUser} onUpdateSingleUser={handleUpdateSingleUser} settlements={settlements} setSettlements={setSettlements} />}
        {view === 'DASHBOARD' && currentUser.role === UserRole.SUPERVISOR && <SupervisorDashboard currentUser={currentUser} users={users} setUsers={setUsers} onDeleteUser={id => setUsers(users.filter(u => u.id !== id))} tickets={tickets} settlements={settlements} setSettlements={setSettlements} />}
        {view === 'DASHBOARD' && currentUser.role === UserRole.BOOKIE && <BookieDashboard currentUser={currentUser} users={users} setUsers={setUsers} onDeleteUser={id => setUsers(users.filter(u => u.id !== id))} tickets={tickets} setTickets={setTickets} settlements={settlements} setSettlements={setSettlements} />}
      </main>
    </div>
  );
};

export default App;
