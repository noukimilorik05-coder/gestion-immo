import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Store, CreditCard, 
  Plus, LogOut, Trash2, Phone, 
  CheckCircle, AlertCircle, Search,
  Download, Filter, MessageSquare, Calendar,
  ChevronRight, TrendingUp as TrendingUpIcon,
  Pencil, BarChart as LucideBarChart,
  TrendingDown, Coins, UserPlus, Key, ShieldCheck, Shield, Lock, Unlock,
  User, Landmark, AlertTriangle, Wallet, MinusCircle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// Utilisation d'une URL relative car le front et le back sont sur le même domaine
const API_URL = '/api';
const ADMIN_SECRET_CODE = "1234"; // ✅ Code secret pour l'accès admin

/**
 * UTILS : Formateur monétaire (FCFA / €)
 */
const formatMoney = (amount, currency = 'XAF') => {
  return new Intl.NumberFormat(currency === 'XAF' ? 'fr-CM' : 'fr-FR', {
    style: 'currency',
    currency: currency === 'XAF' ? 'XAF' : 'EUR',
    minimumFractionDigits: currency === 'XAF' ? 0 : 2,
  }).format(amount);
};

/**
 * HELPER : Calcul de la date d'échéance
 */
const addMonthsToPeriod = (period, months) => {
  if (!period) return "";
  const [year, month] = period.split('-').map(Number);
  const date = new Date(year, month - 1);
  date.setMonth(date.getMonth() + months);
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

/**
 * LOGIQUE PRINCIPALE DE L'APPLICATION
 */
export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tenants, setTenants] = useState([]);
  const [shops, setShops] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [isRegistering, setIsRegistering] = useState(false); 
  const [currency, setCurrency] = useState(localStorage.getItem('app_currency') || 'XAF');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // --- LOGIQUE DE DÉCONNEXION ---
  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    setIsAdminUnlocked(false);
  };

  /**
   * WRAPPER API
   */
  const api = useMemo(() => ({
    call: async (method, path, body = null) => {
      try {
        const res = await fetch(`${API_URL}${path}`, {
          method,
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: body ? JSON.stringify(body) : null
        });

        if (res.status === 403) {
          const data = await res.json();
          if (data.error?.includes("SUSPENDU") || data.message?.toLowerCase().includes("bloqué")) {
            alert(data.error || "Votre compte a été suspendu par l'administrateur.");
            handleLogout();
            return null;
          }
        }

        if (res.status === 401) {
          handleLogout();
          return null;
        }

        return await res.json();
      } catch (err) {
        console.error("Erreur API:", err);
        return { error: "Erreur de connexion au serveur" };
      }
    },
    get: (path) => api.call('GET', path),
    post: (path, body) => api.call('POST', path, body),
    put: (path, body) => api.call('PUT', path, body),
    delete: (path) => api.call('DELETE', path),
  }), [token]);

  useEffect(() => {
    localStorage.setItem('app_currency', currency);
  }, [currency]);

  const moneyFormatter = (amount) => formatMoney(amount, currency);
  const isAdmin = user?.role === 'admin';

  // --- AUTHENTIFICATION ---
  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      } else {
        alert(data.message || "Email ou mot de passe incorrect.");
      }
    } catch (err) { 
      alert("Serveur injoignable."); 
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = {
      email: formData.get('email'),
      password: formData.get('password'),
      phone: formData.get('phone'),
      nom_propriete: formData.get('nom_propriete')
    };

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        alert("Compte créé ! Connectez-vous maintenant.");
        setIsRegistering(false);
      } else {
        const err = await res.json();
        alert(err.error || "Erreur d'inscription.");
      }
    } catch (err) {
      alert("Erreur de connexion.");
    }
  };

  const loadAllData = async () => {
    if (!token || (activeTab === 'admin' && isAdmin)) return;
    setLoading(true);
    const [tData, sData, pData, eData] = await Promise.all([
      api.get('/tenants'),
      api.get('/shops'),
      api.get('/payments'),
      api.get('/expenses')
    ]);
    if (tData) setTenants(Array.isArray(tData) ? tData : []);
    if (sData) setShops(Array.isArray(sData) ? sData : []);
    if (pData) setPayments(Array.isArray(pData) ? pData : []);
    if (eData) setExpenses(Array.isArray(eData) ? eData : []);
    setLoading(false);
  };

  useEffect(() => { loadAllData(); }, [token, activeTab, api]);

  const handleRefreshUser = (newData) => {
    setUser(newData);
    localStorage.setItem('user', JSON.stringify(newData));
  };

  const handleAdminAccess = () => {
    if (isAdminUnlocked) {
      setActiveTab('admin');
    } else {
      const code = prompt("Entrez le code de sécurité Administrateur :");
      if (code === ADMIN_SECRET_CODE) {
        setIsAdminUnlocked(true);
        setActiveTab('admin');
      } else if (code !== null) {
        alert("Code incorrect !");
      }
    }
  };

  if (!token) {
    return (
      <LoginPage 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        isRegistering={isRegistering} 
        setIsRegistering={setIsRegistering} 
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 font-bold">
      <style>
        {`
          @media screen { .print-only { display: none; } }
          @media print {
            body * { visibility: hidden; }
            .print-only, .print-only * { visibility: visible; }
            .print-only {
              position: absolute; left: 0; top: 0; width: 100%;
              display: block !important; background: white !important;
            }
          }
        `}
      </style>

      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-20 no-print shadow-2xl">
        <div className="p-8 text-center border-b border-slate-800/50">
          <h1 className="text-2xl font-black text-indigo-400 tracking-tighter uppercase">Daloparg</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">SaaS Pro Edition</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavItem id="dashboard" label="Dashboard" icon={<LayoutDashboard size={20}/>} active={activeTab} set={setActiveTab} />
          <NavItem id="tenants" label="Locataires" icon={<Users size={20}/>} active={activeTab} set={setActiveTab} />
          <NavItem id="shops" label="Boutiques" icon={<Store size={20}/>} active={activeTab} set={setActiveTab} />
          <NavItem id="payments" label="Paiements" icon={<CreditCard size={20}/>} active={activeTab} set={setActiveTab} />
          <NavItem id="expenses" label="Dépenses" icon={<Wallet size={20}/>} active={activeTab} set={setActiveTab} />
          
          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-slate-800">
               <p className="px-6 mb-2 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Contrôle Système</p>
               <button 
                 onClick={handleAdminAccess} 
                 className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold ${activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
               >
                 {isAdminUnlocked ? <Unlock size={20} className="text-emerald-400"/> : <Lock size={20} className="text-orange-400"/>} 
                 Super Admin
               </button>
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-slate-800 space-y-2">
          <button 
            onClick={() => setActiveTab('profile')} 
            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <User size={18}/> Mon Profil
          </button>

          <div className="bg-slate-800/50 p-3 rounded-2xl mb-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block text-center">Devise Locale</label>
            <div className="flex items-center gap-2">
              <Coins size={14} className="text-indigo-400" />
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-transparent text-xs font-bold outline-none cursor-pointer w-full text-white appearance-none"
              >
                <option value="XAF" className="bg-slate-900 text-white">Franc CFA (XAF)</option>
                <option value="EUR" className="bg-slate-900 text-white">Euro (€)</option>
              </select>
            </div>
          </div>

          <button onClick={handleLogout} className="w-full flex items-center gap-2 p-3 text-red-400 hover:bg-red-500/10 rounded-xl font-bold transition-all text-sm group">
            <LogOut size={18} className="group-hover:rotate-180 transition-transform duration-500"/> Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-10 print:m-0 print:p-0 overflow-x-hidden">
        <div className="no-print max-w-7xl mx-auto font-bold">
            <header className="flex justify-between items-center mb-10 text-slate-800">
              <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter">
                  {user.nom_propriete || "Mon Parc Immobilier"}
                </h1>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 italic">
                  {activeTab === 'admin' ? "Supervision du Système SaaS" : "Tableau de Bord de Gestion"}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <span className="bg-amber-100 text-amber-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase shadow-sm flex items-center gap-2 border border-amber-200">
                    <Shield size={14} /> Mode Administrateur
                  </span>
                )}
                <div className="bg-white px-5 py-3 rounded-2xl border shadow-sm flex items-center gap-3 text-sm font-black text-indigo-600 uppercase">
                  <Calendar size={18} /> {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </div>
              </div>
            </header>

            {activeTab === 'dashboard' && <DashboardView tenants={tenants} shops={shops} payments={payments} expenses={expenses} formatMoney={moneyFormatter} />}
            {activeTab === 'tenants' && <TenantsView tenants={tenants} shops={shops} payments={payments} api={api} onRefresh={loadAllData} formatMoney={moneyFormatter} />}
            {activeTab === 'shops' && <ShopsView shops={shops} tenants={tenants} payments={payments} api={api} onRefresh={loadAllData} formatMoney={moneyFormatter} />}
            {activeTab === 'payments' && <PaymentsView tenants={tenants} shops={shops} payments={payments} api={api} onRefresh={loadAllData} formatMoney={moneyFormatter} user={user} />}
            {activeTab === 'expenses' && <ExpensesView expenses={expenses} setExpenses={setExpenses} api={api} formatMoney={moneyFormatter} />}
            {activeTab === 'admin' && isAdmin && <AdminView api={api} formatMoney={moneyFormatter} />}
            {activeTab === 'profile' && <ProfileView user={user} api={api} onRefreshUser={handleRefreshUser} />}
        </div>
      </main>
    </div>
  );
}

// --- VUES ---

/**
 * DASHBOARD VIEW
 */
function DashboardView({ tenants, shops, payments, expenses, formatMoney }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const availableShopsCount = shops.filter(s => 
    s.status === 'available' || s.status === 'Disponible'
  ).length;

  const occupancyRate = shops.length > 0 
    ? Math.round(((shops.length - availableShopsCount) / shops.length) * 100) 
    : 0;

  const totalDeposits = tenants
    .filter(t => t.is_active !== false) 
    .reduce((sum, t) => sum + (Number(t.deposit) || 0), 0);

  const totalRevenue = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const netProfit = totalRevenue - totalExpenses;
  const isProfitPositive = netProfit >= 0;

  const tenantsStatus = tenants
    .filter(t => t.is_active !== false) 
    .map(t => {
      const tenantPayments = payments.filter(p => Number(p.tenant_id) === Number(t.id));
      const latestPayment = [...tenantPayments].sort((a,b) => b.month.localeCompare(a.month))[0];
      const expiryDate = addMonthsToPeriod(latestPayment?.month, latestPayment?.months_covered || 1) || "0000-00";
      const isLate = expiryDate <= currentMonth;
      return { ...t, expiryDate, isLate };
    });

  const pipelineecheances = tenantsStatus
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
    .map(t => {
      const today = new Date();
      const expiry = new Date(t.expiryDate + "-01"); 
      const diffTime = expiry - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...t, daysLeft: diffDays };
    });

  const lateTenants = tenantsStatus.filter(t => t.isLate);

  const calculateLostRevenue = () => {
    return shops.filter(s => s.status === 'available' || s.status === 'Disponible').reduce((acc, s) => acc + Number(s.price || 0), 0);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 font-bold text-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
        
        {/* BÉNÉFICE NET */}
        <div className={`p-6 rounded-[32px] border-2 shadow-sm transition-all hover:scale-105 flex flex-col justify-between ${isProfitPositive ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`text-[9px] font-black uppercase tracking-widest ${isProfitPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              Bénéfice Net
            </span>
            <div className={`p-3 rounded-2xl ${isProfitPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {isProfitPositive ? <TrendingUpIcon size={20} /> : <TrendingDown size={20} />}
            </div>
          </div>
          <div>
            <h3 className={`text-2xl font-black tracking-tighter ${isProfitPositive ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatMoney(netProfit)}
            </h3>
            <p className={`mt-2 text-[9px] font-bold uppercase italic ${isProfitPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {isProfitPositive ? "Résultat positif" : "Résultat déficitaire"}
            </p>
          </div>
        </div>

        <StatCard label="Revenus Bruts" value={formatMoney(totalRevenue)} icon={<ArrowUpRight className="text-indigo-600"/>} color="border-indigo-100" />
        
        <StatCard label="Frais & Charges" value={formatMoney(totalExpenses)} icon={<ArrowDownRight className="text-red-500"/>} color="border-red-100" />

        <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm transition-all hover:scale-105 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Cautions en main
            </span>
            <div className="p-3 bg-slate-50 rounded-2xl text-slate-600">
              <Landmark size={20} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter">
                {totalDeposits.toLocaleString()}
              </h3>
              <span className="text-[10px] font-bold text-slate-400">FCFA</span>
            </div>
            <p className="mt-2 text-[9px] text-slate-400 font-bold uppercase italic">
              Fonds de garantie
            </p>
          </div>
        </div>

        <StatCard label="Retards" value={lateTenants.length} icon={<AlertCircle className="text-red-600"/>} color="border-red-100" highlight={lateTenants.length > 0} />
        <StatCard label="Perte Vacance" value={formatMoney(calculateLostRevenue())} icon={<TrendingDown className="text-orange-500"/>} color="border-orange-100" sub="Mensuel" />
        <StatCard label="Locataires" value={tenants.filter(t => t.is_active !== false).length} icon={<Users className="text-blue-600"/>} color="border-blue-200" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Pipeline des Échéances</h3>
          <div className="space-y-4">
            {pipelineecheances.slice(0, 5).map(t => (
              <div key={t.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100 group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${t.daysLeft < 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-black">{t.name}</p>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter font-bold">Boutique {shops.find(s => Number(s.id) === Number(t.shop_id))?.name || 'N/A'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${t.daysLeft < 0 ? 'text-red-600 underline decoration-2' : 'text-emerald-600'}`}>
                    {t.daysLeft < 0 ? `En retard : ${Math.abs(t.daysLeft)} j` : `Dans ${t.daysLeft} jours`}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 italic uppercase">Expire le : {t.expiryDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-indigo-600 p-8 rounded-[32px] text-white shadow-xl shadow-indigo-200 flex flex-col justify-between">
           <div>
             <h3 className="text-xl font-black mb-2 uppercase tracking-tighter">Note de Gestion</h3>
             <p className="text-indigo-100 text-sm leading-relaxed italic font-bold">
               Votre taux d'occupation actuel est de <span className="text-white underline font-black">{occupancyRate}%</span>. 
               Optimisez vos charges pour augmenter votre bénéfice net.
             </p>
           </div>
           <div className="mt-8 pt-8 border-t border-indigo-500">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1 font-bold">Opportunités</p>
              <div className="flex items-end gap-2">
                <p className="text-4xl font-black">{availableShopsCount}</p>
                <p className="text-sm font-bold text-indigo-300 pb-1">boutiques libres</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

/**
 * TENANTS VIEW
 */
function TenantsView({ tenants, shops, payments, api, onRefresh, formatMoney }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const handleAdd = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      rent_amount: Number(formData.get('rent')),
      shop_id: formData.get('shop_id'),
      deposit: Number(formData.get('deposit') || 0) 
    };

    const res = await api.post('/tenants', body);
    if (res && !res.error) { setShowAdd(false); onRefresh(); }
    else { alert(res?.error || "Erreur lors de l'envoi"); }
  };

  const handleUpdateTenant = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      rent_amount: Number(formData.get('rent'))
    };
    const res = await api.put(`/tenants/${editingTenant.id}`, body);
    if (res && !res.error) { setEditingTenant(null); onRefresh(); }
    else { alert(res?.error || "Erreur lors de la mise à jour"); }
  };

  const handleTerminateLease = async (id) => {
    if (window.confirm("Voulez-vous résilier ce bail ? Les paiements seront conservés et la boutique sera libérée.")) {
      const res = await api.put(`/tenants/${id}/terminate`);
      if (res && !res.error) {
        onRefresh();
      } else {
        alert(res?.error || "Erreur lors de la résiliation");
      }
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 text-slate-800 font-bold">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black">Gestion Locataires</h2>
        <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2">
          <Plus size={20}/> Recruter Locataire
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 font-bold">
        {tenants
          .filter(t => t.is_active !== false)
          .map(t => {
            const tenantPayments = payments.filter(p => Number(p.tenant_id) === Number(t.id));
            const latestPayment = [...tenantPayments].sort((a,b) => b.month.localeCompare(a.month))[0];
            const expiryDate = addMonthsToPeriod(latestPayment?.month, latestPayment?.months_covered || 1) || "0000-00";
            const isLate = expiryDate <= currentMonth;

            return (
              <div key={t.id} className={`bg-white p-6 rounded-3xl border shadow-sm flex items-center justify-between transition-all ${isLate ? 'border-red-100 bg-red-50/20' : 'border-slate-100 hover:shadow-md'}`}>
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl ${isLate ? 'bg-red-100 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 font-bold">
                      <p className="text-xl font-black">{t.name}</p>
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${isLate ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                        {isLate ? 'IMPAYÉ' : 'RÈGLEMENT OK'}
                      </span>
                    </div>
                    <div className="flex gap-4 items-center mt-1">
                      <span className="flex items-center gap-1 text-slate-400 font-bold text-xs"><Phone size={12}/> {t.phone}</span>
                      <span className="text-indigo-500 font-black text-xs uppercase tracking-widest font-bold">Unité: {shops.find(s => Number(s.id) === Number(t.shop_id))?.name || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-10 font-bold">
                  <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Échéance</p>
                      <p className={`text-lg font-black ${isLate ? 'text-red-600 underline' : 'text-slate-800'}`}>
                        {expiryDate === "0000-00" ? "Inconnue" : expiryDate}
                      </p>
                  </div>
                  <div className="flex items-center gap-3">
                      <a href={`https://wa.me/${t.phone}`} target="_blank" className={`p-4 rounded-2xl transition-all ${isLate ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                          <MessageSquare size={18} />
                      </a>
                      <button onClick={() => setEditingTenant(t)} className="p-3 text-slate-400 hover:text-indigo-600 transition-colors font-bold">
                          <Pencil size={18} />
                      </button>
                      <button onClick={() => handleTerminateLease(t.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={18}/>
                      </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 z-50 no-print text-slate-800 font-bold">
          <form onSubmit={handleAdd} className="bg-white rounded-[40px] p-10 w-full max-w-lg space-y-6 shadow-2xl animate-in zoom-in-95 font-bold">
            <h3 className="text-2xl font-black tracking-tight text-center uppercase font-bold">Ajouter un Locataire</h3>
            <div className="space-y-4 font-bold">
              <input name="name" placeholder="Nom complet" className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
              <input name="phone" placeholder="WhatsApp" className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Loyer Mensuel</label>
                  <input name="rent" type="number" placeholder="Ex: 50000" className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold text-emerald-600 font-bold" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Caution Versée</label>
                  <input name="deposit" type="number" placeholder="Ex: 100000" className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold text-orange-600 font-bold" required />
                </div>
              </div>
              <div className="space-y-1 font-bold">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Attribution Boutique</label>
                <select name="shop_id" required className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold appearance-none font-bold" defaultValue="">
                  <option value="" disabled>-- Sélectionner une boutique libre --</option>
                  {shops.filter(s => s.status === 'available' || s.status === 'Disponible').map(shop => (
                    <option key={shop.id} value={shop.id}>{shop.name} - {formatMoney(shop.price)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4 pt-4 font-bold">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 p-5 font-bold text-slate-400 font-bold">Fermer</button>
              <button type="submit" className="flex-1 p-5 bg-indigo-600 text-white rounded-3xl font-black shadow-lg font-bold">Confirmer</button>
            </div>
          </form>
        </div>
      )}

      {editingTenant && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 z-50 no-print text-slate-800 font-bold">
          <form onSubmit={handleUpdateTenant} className="bg-white rounded-[40px] p-10 w-full max-w-lg space-y-6 shadow-2xl animate-in zoom-in-95 font-bold">
            <h3 className="text-2xl font-black tracking-tight text-center uppercase text-sm font-bold">Modifier Locataire</h3>
            <div className="space-y-4 font-bold">
              <input name="name" defaultValue={editingTenant.name} className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
              <input name="phone" defaultValue={editingTenant.phone} className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold font-bold" required />
              <input name="rent" type="number" defaultValue={editingTenant.rent_amount} className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold text-indigo-600 font-bold" required />
            </div>
            <div className="flex gap-4 pt-4 font-bold">
              <button type="button" onClick={() => setEditingTenant(null)} className="flex-1 p-5 font-bold text-slate-400 font-bold">Annuler</button>
              <button type="submit" className="flex-1 p-5 bg-indigo-600 text-white rounded-3xl font-black shadow-lg font-bold">Enregistrer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * SHOPS VIEW
 */
function ShopsView({ shops, tenants, payments, api, onRefresh, formatMoney }) {
  const handleAddShop = async (e) => {
    e.preventDefault();
    const body = { name: e.target.name.value, price: Number(e.target.price.value), status: 'available' };
    const res = await api.post('/shops', body);
    if (res && res.id) { e.target.reset(); onRefresh(); }
  };

  const getRendementAnnuel = (shopId) => {
    const unAnAvant = new Date();
    unAnAvant.setFullYear(unAnAvant.getFullYear() - 1);

    return payments
      .filter(p => {
        const tenant = tenants.find(t => Number(t.id) === Number(p.tenant_id));
        return (
          tenant && 
          Number(tenant.shop_id) === Number(shopId) && 
          new Date(p.created_at) > unAnAvant
        );
      })
      .reduce((acc, p) => acc + Number(p.amount), 0);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 text-slate-800 font-bold">
      <div className="flex justify-between items-center bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm no-print font-bold">
        <div>
          <h2 className="text-3xl font-black tracking-tight font-bold">Parc Immobilier</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 font-bold">Inventaire des boutiques</p>
        </div>
        <form onSubmit={handleAddShop} className="flex gap-3 items-center font-bold">
          <input name="name" placeholder="Code" className="p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-indigo-500 w-32 font-bold" required />
          <input name="price" type="number" placeholder="Loyer" className="p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-indigo-500 w-32 font-bold" required />
          <button type="submit" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all text-sm shadow-lg font-bold">Ajouter</button>
        </form>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 no-print text-slate-800 font-bold">
        {shops.map(s => {
          const tenant = tenants.find(t => Number(t.shop_id) === Number(s.id) && t.is_active !== false);
          const isOccupied = !!tenant;
          const rendement = getRendementAnnuel(s.id);
          
          return (
            <div key={s.id} className={`p-8 rounded-[40px] bg-white border-2 shadow-sm transition-all hover:scale-105 ${isOccupied ? 'border-indigo-50' : 'border-dashed border-indigo-100'} font-bold`}>
              <div className="flex justify-between items-center mb-8 font-bold">
                 <h3 className="text-2xl font-black tracking-tighter">{s.name}</h3>
                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${isOccupied ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                   {isOccupied ? 'Occupée' : 'Libre'}
                 </span>
              </div>

              <div className="mb-6 p-4 bg-slate-50 rounded-2xl font-bold">
                 <div className="flex items-center gap-2 mb-1 font-bold">
                    <LucideBarChart size={14} className="text-indigo-500" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Revenus (12 mois)</p>
                 </div>
                 <p className="text-xl font-black tracking-tighter font-bold">{formatMoney(rendement)}</p>
              </div>

              {tenant ? (
                <div className="space-y-2">
                  <div className="h-px bg-slate-100 w-full mb-4 font-bold" />
                  <p className="font-black text-indigo-600 truncate text-lg uppercase text-xs font-bold">{tenant.name}</p>
                </div>
              ) : (
                <div className="space-y-2 font-bold">
                  <div className="h-px bg-slate-100 w-full mb-4 font-bold" />
                  <p className="text-2xl font-black font-bold">{formatMoney(s.price)}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * PAYMENTS VIEW
 */
function PaymentsView({ tenants, shops, payments, api, onRefresh, formatMoney, user }) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [nbMonths, setNbMonths] = useState(1);
  const [receiptToPrint, setReceiptToPrint] = useState(null); 
  const currentMonthValue = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (receiptToPrint) {
      const timer = setTimeout(() => {
        window.print();
        setReceiptToPrint(null); 
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [receiptToPrint]);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault(); 
    const formData = new FormData(e.target);
    const tenantIdNum = Number(formData.get('tenant_id'));
    const startMonth = formData.get('month');          
    const monthsCovered = parseInt(formData.get('months_covered')); 

    const tenant = tenants.find(t => Number(t.id) === tenantIdNum);
    if (!tenant) return;

    const totalAmount = tenant.rent_amount * monthsCovered;

    const res = await api.post('/payments', {
      tenant_id: tenantIdNum, amount: totalAmount,      
      month: startMonth, months_covered: monthsCovered, 
      status: 'Paid'
    });

    if (res && !res.error) {
      onRefresh(); 
      setShowAdd(false); 
      const fullPaymentData = {
        ...res, tenant: tenant,
        shop: shops.find(s => Number(s.id) === Number(tenant.shop_id))
      };
      setReceiptToPrint(fullPaymentData); 
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-slate-800 font-bold">
      <div className="flex justify-between items-center font-bold">
        <div>
          <h2 className="text-3xl font-black tracking-tight font-bold">Journal Financier</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 italic font-bold">Flux de trésorerie validés</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 text-sm uppercase font-bold">
          <Plus size={20}/> Nouvel encaissement
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden text-slate-800 font-bold">
        <table className="w-full text-left text-sm font-bold">
          <thead className="bg-slate-50/50 border-b font-bold">
            <tr>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Locataire</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Période</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center font-bold">Durée</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Montant</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-bold">
            {payments.map(p => {
              const t = tenants.find(x => Number(x.id) === Number(p.tenant_id));
              return (
                <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors font-bold">
                  <td className="px-8 py-6 font-black uppercase text-xs font-bold">{t?.name || 'Inconnu'}</td>
                  <td className="px-8 py-6 font-bold text-slate-500 uppercase text-[10px] tracking-widest font-bold">{p.month}</td>
                  <td className="px-8 py-6 text-xs font-bold text-center font-bold">
                    <span className="px-3 py-1 bg-slate-100 rounded-full font-bold">{p.months_covered || 1} MOIS</span>
                  </td>
                  <td className="px-8 py-6 font-black text-emerald-600 font-bold">{formatMoney(p.amount)}</td>
                  <td className="px-8 py-6 text-right font-bold">
                    <button 
                      onClick={() => {
                        const tenant = tenants.find(x => Number(x.id) === Number(p.tenant_id));
                        const shop = shops.find(sh => Number(sh.id) === Number(tenant?.shop_id));
                        setReceiptToPrint({ ...p, tenant, shop });
                      }} 
                      className="p-3 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-700 hover:text-white transition-all flex items-center gap-2 justify-end font-bold"
                    >
                      <Download size={16} /> <span className="text-[10px] font-black uppercase font-bold">Reçu</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {receiptToPrint && (
        <div className="print-only">
          <Receipt 
            payment={receiptToPrint} 
            tenant={receiptToPrint.tenant} 
            shop={receiptToPrint.shop} 
            formatMoney={formatMoney} 
            user={user} 
          />
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 z-50 no-print text-slate-800 font-bold">
          <form onSubmit={handlePaymentSubmit} className="bg-white rounded-[40px] p-10 w-full max-w-lg space-y-6 shadow-2xl animate-in zoom-in-95 text-slate-800 font-bold">
            <h3 className="text-2xl font-black tracking-tight text-center uppercase text-sm font-bold">Validation Encaissement</h3>
            <div className="space-y-4 font-bold">
              <select name="tenant_id" className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold appearance-none font-bold" required
                onChange={(e) => setSelectedTenant(tenants.find(t => Number(t.id) === Number(e.target.value) && t.is_active !== false))}>
                <option value="">Locataire concerné...</option>
                {tenants.filter(t => t.is_active !== false).map(t => <option key={t.id} value={t.id}>{t.name} ({formatMoney(t.rent_amount)})</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4 font-bold">
                <input name="month" type="month" defaultValue={currentMonthValue} className="p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
                <input name="months_covered" type="number" min="1" defaultValue="1" 
                    onChange={(e) => setNbMonths(Number(e.target.value) || 1)}
                    className="p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
              </div>
              {selectedTenant && (
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex justify-between items-center font-bold">
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase mb-1 tracking-widest font-bold">Encaissement total</p>
                    <p className="text-4xl font-black tracking-tighter font-bold">{formatMoney(selectedTenant.rent_amount * nbMonths)}</p>
                  </div>
                  <CheckCircle className="text-emerald-500 font-bold" size={32} />
                </div>
              )}
            </div>
            <button type="submit" className="w-full p-6 bg-emerald-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-emerald-700 transition-all uppercase font-bold">Confirmer</button>
            <button type="button" onClick={() => setShowAdd(false)} className="w-full text-slate-400 font-bold hover:text-slate-600 transition-colors font-bold">Fermer</button>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * EXPENSES VIEW
 */
function ExpensesView({ expenses, setExpenses, api, formatMoney }) {
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'Maintenance' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await api.post('/expenses', newExpense);
    if (res && !res.error) {
      setExpenses([res, ...expenses]); 
      setNewExpense({ description: '', amount: '', category: 'Maintenance' });
    } else {
      alert(res?.error || "Erreur lors de l'enregistrement de la dépense");
    }
  };

  const totalExpensesAmount = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-bold text-slate-800">
      <div className="flex justify-between items-center font-bold">
        <h2 className="text-2xl font-black uppercase font-bold tracking-tight">Gestion des Dépenses</h2>
        <div className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-black shadow-sm border border-red-100 font-bold">
          Total : {totalExpensesAmount.toLocaleString()} FCFA
        </div>
      </div>

      {/* Formulaire d'ajout rapide */}
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 flex gap-6 items-end font-bold">
        <div className="flex-1 space-y-2 font-bold">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">Description</label>
          <input 
            type="text" 
            placeholder="Ex: Réparation clim, plomberie, taxes..."
            className="w-full p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold"
            value={newExpense.description}
            onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
            required
          />
        </div>
        <div className="w-64 space-y-2 font-bold">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 font-bold">Montant</label>
          <input 
            type="number" 
            className="w-full p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-red-600 font-bold"
            value={newExpense.amount}
            onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
            required
          />
        </div>
        <button type="submit" className="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black hover:bg-indigo-600 transition-all shadow-lg uppercase tracking-widest text-xs font-bold">
          AJOUTER
        </button>
      </form>

      {/* Liste des dépenses */}
      <div className="grid gap-4 font-bold">
        {expenses.length === 0 ? (
           <div className="bg-white p-20 rounded-[32px] border border-dashed border-slate-200 text-center text-slate-400 italic font-bold">
             Nessuna spesa registrata.
           </div>
        ) : (
          expenses.map(exp => (
            <div key={exp.id} className="bg-white p-6 rounded-[24px] flex justify-between items-center border border-slate-50 hover:border-red-100 hover:shadow-md transition-all group font-bold">
              <div className="flex items-center gap-5 font-bold">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform font-bold">
                   <MinusCircle size={24} className="font-bold"/>
                </div>
                <div className="font-bold">
                  <p className="font-black text-slate-800 uppercase text-sm tracking-tight font-bold">{exp.description}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-black italic font-bold">{new Date(exp.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <p className="font-black text-red-600 text-lg font-bold">-{Number(exp.amount).toLocaleString()} FCFA</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * PROFILE VIEW
 */
function ProfileView({ user, api, onRefreshUser }) {
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData);
    const res = await api.call('PUT', '/auth/profile', body);
    if (res && res.id) {
      alert("Profil mis à jour avec succès !");
      onRefreshUser(res); 
    } else if (res) {
      alert("Erreur durant l'aggiornamento.");
    }
    setLoading(false);
  };

  const handleResetAccount = async () => {
    const confirmFirst = window.confirm("ATTENTION: Cette action supprimera DEFINITIVEMENT tous vos locataires et l'historique des paiements. Vos boutiques resteront enregistrées mais redeviendront toutes libres. Voulez-vous continuer?");
    
    if (confirmFirst) {
        const secondConfirm = window.prompt("Tapez 'EFFACER' pour confirmer la suppression définitive.");
        
        if (secondConfirm === "EFFACER") {
            try {
                await api.post('/reset-account');
                alert("Account ripulito!");
                window.location.reload(); 
            } catch (err) {
                alert("Erreur durant le reset");
            }
        }
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500 text-slate-800 font-bold">
      <div className="flex items-center gap-4 mb-8 font-bold">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold">
           <User size={32} className="font-bold"/>
        </div>
        <div className="font-bold">
          <h2 className="text-3xl font-black tracking-tight">Mon Profil</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Paramètres de votre espace</p>
        </div>
      </div>
      
      <div className="space-y-8 font-bold">
        <form onSubmit={handleUpdate} className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-6 text-slate-800 font-bold">
          <div className="grid grid-cols-2 gap-6 font-bold">
            <div className="space-y-2 font-bold">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest font-bold">Email de contact</label>
              <input name="email" defaultValue={user.email} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-indigo-500 font-bold" required />
            </div>
            <div className="space-y-2 font-bold">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest font-bold">Mot de passe</label>
              <input name="password" type="password" defaultValue={user.password} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-indigo-500 font-bold" required />
            </div>
          </div>
          <div className="space-y-2 font-bold">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest font-bold">Nom de la Propriété / Parc</label>
            <input name="nom_propriete" defaultValue={user.nom_propriete} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-indigo-500 font-bold" required />
          </div>
          <div className="space-y-2 font-bold">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest font-bold">Numéro WhatsApp</label>
            <input name="phone" defaultValue={user.phone} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-indigo-500 font-bold" required />
          </div>
          <button type="submit" disabled={loading} className="w-full p-6 bg-slate-900 text-white rounded-3xl font-black shadow-lg hover:bg-indigo-600 transition-all disabled:opacity-50 uppercase tracking-widest font-bold">
            {loading ? "Enregistrement..." : "Sauvegarder les modifications"}
          </button>
        </form>

        <div className="bg-red-50/50 p-10 rounded-[40px] border-2 border-red-100 space-y-6 font-bold">
          <div className="flex items-center gap-3 text-red-600 font-bold">
            <AlertTriangle size={24} className="font-bold"/>
            <h3 className="text-lg font-black uppercase tracking-tighter font-bold">Zone de danger</h3>
          </div>
          <p className="text-xs text-red-400 font-bold leading-relaxed font-bold">
            La réinitialisation supprimera définitivement tous vos locataires et l'historique de vos paiements. 
            Vos boutiques resteront enregistrées mais redeviendront toutes libres.
          </p>
          <button 
            type="button"
            onClick={handleResetAccount}
            className="w-full p-6 bg-white border-2 border-red-200 text-red-600 rounded-3xl font-black shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all uppercase tracking-widest flex items-center justify-center gap-2 font-bold"
          >
            <Trash2 size={18} className="font-bold"/> Réinitialiser tout mon compte
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ADMIN VIEW
 */
function AdminView({ api, formatMoney }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    const data = await api.get('/admin/users');
    if (data) setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, [api]);

  const toggleStatus = async (u) => {
    const res = await api.put(`/admin/users/${u.id}`, { is_active: !u.is_active });
    if (res) loadUsers();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-bold">
      <div className="flex justify-between items-center font-bold">
        <div className="font-bold">
          <h2 className="text-3xl font-black tracking-tight font-bold">Supervision SaaS</h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1 font-bold">Controllo globale della plateforme</p>
        </div>
        <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg font-bold">
          Total Plateforme : {formatMoney(users.reduce((acc, u) => acc + (u.totalCA || 0), 0))}
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden font-bold">
        <table className="w-full text-left font-bold">
          <thead className="bg-slate-50/50 border-b font-bold">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest font-bold">Propriétaire & Parc</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-center tracking-widest font-bold">Unités</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-center tracking-widest font-bold">Baux Actifs</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest font-bold">Chiffre d'Affaires</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-right tracking-widest font-bold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-bold">
            {users
              .filter(u => u.role !== 'admin') 
              .map(u => (
                <tr key={u.id} className="hover:bg-slate-50/30 transition-colors font-bold">
                  <td className="p-6 font-bold">
                    <p className="font-black text-slate-800 text-lg leading-tight uppercase font-bold">{u.nom_propriete}</p>
                    <p className="text-xs text-slate-400 font-bold">{u.email} • {u.phone}</p>
                  </td>
                  <td className="p-6 text-center font-bold">
                    <span className="font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg text-sm font-bold">
                      {u.shopCount || 0}
                    </span>
                  </td>
                  <td className="p-6 text-center font-bold">
                    <span className="font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-lg text-sm font-bold">
                      {u.tenantCount || 0}
                    </span>
                  </td>
                  <td className="p-6 font-bold">
                    <p className="font-black text-emerald-600 text-lg tracking-tight font-bold">{formatMoney(u.totalCA || 0)}</p>
                    <p className="text-[9px] font-black text-slate-300 uppercase font-bold">Volume cumulé</p>
                  </td>
                  <td className="p-6 text-right font-bold">
                    <button 
                      onClick={() => toggleStatus(u)}
                      className={`px-5 py-2 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm font-bold ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                    >
                      {u.is_active ? 'Bloquer' : 'Débloquer'}
                    </button>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- UI HELPERS ---

function NavItem({ id, label, icon, active, set }) {
  const isActive = active === id;
  return (
    <button onClick={() => set(id)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
      {icon} {label}
    </button>
  );
}

function StatCard({ label, value, icon, color, highlight, sub }) {
  return (
    <div className={`bg-white p-6 rounded-[32px] border-2 ${color} shadow-sm transition-all hover:scale-105 flex flex-col justify-between font-bold`}>
      <div className="flex justify-between items-start mb-4 font-bold">
        <div className="p-3 bg-slate-50 rounded-2xl font-bold">{icon}</div>
        {highlight && <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse border-4 border-white shadow-sm font-bold"></span>}
      </div>
      <div>
        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mb-1 truncate font-bold">{label}</p>
        <p className="text-2xl font-black text-slate-800 tracking-tighter font-bold">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-1 italic font-bold">{sub}</p>}
      </div>
    </div>
  );
}

function LoginPage({ onLogin, isRegistering, setIsRegistering, onRegister }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-bold">
      <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500 font-bold">
        <div className="text-center font-bold">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-800 font-bold">Daloparg</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 font-bold">SaaS Immobilier</p>
        </div>
        <form onSubmit={isRegistering ? onRegister : onLogin} className="space-y-4 font-bold">
          <input name="email" type="email" placeholder="Email" className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
          <input name="password" type="password" placeholder="Mot de passe" className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
          {isRegistering && (
            <>
              <input name="phone" placeholder="WhatsApp" className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
              <input name="nom_propriete" placeholder="Nom de la Propriété" className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
            </>
          )}
          <button type="submit" className="w-full p-6 bg-indigo-600 text-white rounded-3xl font-black shadow-xl hover:bg-indigo-700 transition-all text-lg uppercase tracking-widest font-bold">
            {isRegistering ? "Créer l'Espace" : "Accéder"}
          </button>
        </form>
        <button onClick={() => setIsRegistering(!isRegistering)} className="w-full text-slate-400 font-black text-xs uppercase tracking-widest hover:text-indigo-600 transition-all text-center font-bold">
          {isRegistering ? "Retour au Login" : "S'enregistrer"}
        </button>
      </div>
    </div>
  );
}

const Receipt = ({ payment, tenant, shop, user, formatMoney }) => {
  if (!payment || !tenant) return null;
  return (
    <div className="p-8 bg-white border-2 border-slate-100 rounded-[32px] shadow-xl max-w-2xl mx-auto font-sans text-slate-800 font-bold">
      <div className="flex justify-between items-start border-b-2 border-slate-50 pb-8 mb-8 font-bold">
        <div className="font-bold">
          <h2 className="text-2xl font-black uppercase text-indigo-600 tracking-tight font-bold">
            {user?.nom_propriete || "REÇU DE LOYER"}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest font-bold">
            Quittance de loyer officielle
          </p>
        </div>
        <div className="text-right font-bold">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-bold">Contact Bailleur</p>
          <p className="font-bold text-sm text-slate-700 font-bold">{user?.phone || "N/A"}</p>
          <p className="text-[9px] font-bold text-slate-300 font-bold">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-8 font-bold">
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl font-bold">
          <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest font-bold">Référence :</span>
          <span className="font-black text-indigo-600 tracking-widest text-sm font-bold">#{payment.id?.toString().padStart(5, '0')}</span>
        </div>

        <div className="grid grid-cols-2 gap-6 font-bold">
          <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100/50 font-bold">
            <p className="text-[9px] font-black text-indigo-50 uppercase mb-2 tracking-widest font-bold">Locataire</p>
            <p className="text-lg font-black text-slate-800 uppercase font-bold">{tenant.name}</p>
            <p className="text-xs font-bold text-slate-400 italic font-bold">Boutique : {shop?.name || 'N/A'}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100/50 text-right font-bold">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest font-bold">Date Émission</p>
            <p className="text-lg font-black text-slate-800 font-bold">{new Date(payment.created_at || Date.now()).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        <div className="border-2 border-slate-50 rounded-[24px] overflow-hidden shadow-sm font-bold">
          <table className="w-full font-bold">
            <thead className="bg-slate-50/50 font-bold">
              <tr>
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 font-bold">Désignation</th>
                <th className="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest text-slate-400 font-bold">Période</th>
                <th className="px-8 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-400 font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold">
              <tr>
                <td className="px-6 py-6 font-bold text-sm text-slate-700 font-bold">Loyer Boutique - {shop?.name || 'N/A'}</td>
                <td className="px-6 py-6 text-center font-black text-slate-600 text-xs font-bold">{payment.month} ({payment.months_covered} mois)</td>
                <td className="px-8 py-6 text-right font-black text-2xl text-indigo-600 tracking-tighter font-bold">{formatMoney(payment.amount)}</td>
              </tr>
            </tbody>
            <tfoot>
               <tr>
                 <td colSpan="3" className="px-8 py-10 text-[10px] text-slate-400 italic font-bold">Ce reçu constitue quittance pour la période indiquée ci-dessus sous réserve d'encaissement.</td>
               </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center mt-10 pt-10 border-t border-dashed border-slate-200 font-bold">
        <div className="w-48 h-24 border-2 border-slate-100 rounded-2xl flex flex-col items-center justify-center font-bold">
          <p className="text-[9px] font-black text-slate-300 mb-4 tracking-widest font-bold">Cachet & Signature</p>
        </div>
      </div>
    </div>
  );
};