import React, { useState, useEffect, useMemo } from 'react';
import { 
 LayoutDashboard, Users, Store, CreditCard, 
 Plus, LogOut, Trash2, Phone, 
 CheckCircle, AlertCircle, Search,
 Download, Filter, MessageSquare, Calendar,
 ChevronRight, TrendingUp as TrendingUpIcon,
 Pencil, BarChart as LucideBarChart,
 TrendingDown, Coins, UserPlus, Key, ShieldCheck, Shield, Lock, Unlock,
 User, Landmark, AlertTriangle, Wallet, MinusCircle, ArrowUpRight, ArrowDownRight,
 Menu, X, Percent
} from 'lucide-react';
import { 
 BarChart, Bar, XAxis, YAxis, CartesianGrid, 
 Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// Configuration Supabase (Clés intégrées directement pour éviter import.meta)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js';

const supabaseUrl = 'https://nizrvwumstftlkbwnrvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5penJ2d3Vtc3RmdGxrYnducnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1OTI1NjksImV4cCI6MjA5MTE2ODU2OX0.MnVAo0u9i5KwFejRAKrodwHfcNs9xh6L8jKckBo9TXE';

/**
 * FONCTION UTILITAIRE : addLog
 * Permet d'enregistrer une trace de chaque action importante dans Supabase
 */
const addLog = async (currentUser, action, details = "") => {
  if (typeof window === 'undefined' || !window.supabase || !currentUser) return;
  
  const client = window.supabase.createClient(supabaseUrl, supabaseKey);
  await client.from('logs').insert({
    user_id: String(currentUser.id),
    user_name: currentUser.nom_propriete || currentUser.email,
    action: action,
    details: details,
    is_admin_action: currentUser.role === 'admin'
  });
};

const API_URL = '/api';
const ADMIN_SECRET_CODE = "1234"; 

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
 const [supabase, setSupabase] = useState(null); 

 // --- ÉTAPE B : LOGIQUE D'IMPERSONNALISATION OPTIMISÉE ---
 const [adminData, setAdminData] = useState(null);

 const handleImpersonate = async (targetUser) => {
  setAdminData(user); // Sauvegarde de ton profil Admin
  
  // 1. On vide les listes actuelles pour éviter les mélanges visuels
  setTenants([]);
  setShops([]);
  setPayments([]);
  setExpenses([]);

  // 2. On change l'utilisateur actif
  setUser(targetUser); 
  
  // 3. On force le rechargement immédiat des données du nouveau "user"
  // On utilise setTimeout pour laisser le temps à l'état 'user' de se mettre à jour
  setTimeout(() => {
    loadAllData(); 
    setActiveTab('dashboard');
  }, 100);

  addLog(adminData || user, "ESPIONNAGE", `Accès au compte de ${targetUser.nom_propriete}`);
};

 const stopImpersonating = () => {
   setUser(adminData);
   setAdminData(null);
   setActiveTab('admin');
 };
  
 // États des paramètres
 const [settings, setSettings] = useState({
   tauxImpot: 0,
   abattement: 0,
   devise: localStorage.getItem('app_currency') || 'XAF'
 });

 const [isMenuOpen, setIsMenuOpen] = useState(false); 
 const [isRegistering, setIsRegistering] = useState(false); 
 const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

 // --- CHARGEMENT DYNAMIQUE DE SUPABASE ---
 useEffect(() => {
   const loadSupabase = async () => {
     if (window.supabase) {
       setSupabase(window.supabase.createClient(supabaseUrl, supabaseKey));
       return;
     }
     const script = document.createElement('script');
     script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js';
     script.async = true;
     script.onload = () => {
       if (window.supabase) {
         setSupabase(window.supabase.createClient(supabaseUrl, supabaseKey));
       }
     };
     document.head.appendChild(script);
   };
   loadSupabase();
 }, []);

 // --- ÉTAPE 1 : CHARGEMENT DES PARAMÈTRES DEPUIS LE CLOUD ---
 useEffect(() => {
   const chargerParametres = async () => {
     if (supabase && user?.id) {
       const { data, error } = await supabase
         .from('parametres')
         .select('*')
         .eq('user_id', user.id)
         .single();

       if (data) {
         setSettings({
           tauxImpot: data.taux_impot || 0,
           abattement: data.taux_abattement || 0,
           devise: data.devise || 'XAF'
         });
       }
     }
   };
   chargerParametres();
 }, [user?.id, supabase]);

 // --- LOGIQUE DE DÉCONNEXION ---
 const handleLogout = () => {
   localStorage.clear();
   setToken(null);
   setUser(null);
   setAdminData(null);
   setIsAdminUnlocked(false);
   setIsMenuOpen(false);
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
   localStorage.setItem('app_currency', settings.devise);
 }, [settings.devise]);

 const moneyFormatter = (amount) => formatMoney(amount, settings.devise);
 const isAdmin = user?.role === 'admin' || !!adminData; // On reste Admin même en mode espion pour voir l'onglet

 // --- AUTHENTICATION ---
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
       
       // PIÈGE : LOG DE CONNEXION
       addLog(data.user, "CONNEXION", "L'utilisateur s'est connecté");

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
   // On vérifie qu'on a un utilisateur, un token et le client Supabase
   if (!token || !user || !supabase) return;
   
   // Vérification spécifique pour l'onglet admin (ne pas charger les données du parc si on est en vue système pure)
   if (activeTab === 'admin' && user?.role === 'admin' && !adminData) return;
   
   setLoading(true);
   
   try {
     // On récupère les données filtrées par l'ID de l'utilisateur cible (très important pour le mode espion)
     const [tRes, sRes, pRes, eRes] = await Promise.all([
       supabase.from('tenants').select('*').eq('user_id', user.id),
       supabase.from('shops').select('*').eq('user_id', user.id),
       supabase.from('payments').select('*').eq('user_id', user.id),
       supabase.from('expenses').select('*').eq('user_id', user.id)
     ]);

     if (tRes.data) setTenants(tRes.data);
     if (sRes.data) setShops(sRes.data);
     if (pRes.data) setPayments(pRes.data);
     if (eRes.data) setExpenses(eRes.data);

     // Note: On peut garder la structure fallback si nécessaire, mais ici on privilégie Supabase direct
   } catch (err) {
     console.error("Erreur de chargement Supabase:", err);
   }

   setLoading(false);
 };

 useEffect(() => { loadAllData(); }, [token, activeTab, api, user?.id, supabase]);

 const handleRefreshUser = (newData) => {
   setUser(newData);
   localStorage.setItem('user', JSON.stringify(newData));
 };

 const handleAdminAccess = () => {
   if (isAdminUnlocked || !!adminData) {
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
   <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 font-bold overflow-x-hidden">
     <style>
       {`
         @media screen { 
           .print-only { display: none; } 
         }
         @media print {
           body * { visibility: hidden; }
           .print-only-container, .print-only-container * { visibility: visible; }
           .print-only-container {
             position: absolute; left: 0; top: 0; width: 100%;
             display: block !important;
           }
         }
         /* Correction pour mobile : on veut voir le reçu même si on n'imprime pas encore */
         .print-only-container { display: block; }

         /* Forcer le zoom pour la capture d'écran sur mobile */
         @media (max-width: 640px) {
           .print-only-container {
             padding: 10px;
             transform: scale(0.95); /* Réduit légèrement pour que tout entre dans l'écran */
             transform-origin: top center;
           }
           /* On réduit la taille des gros titres sur mobile */
           .receipt-title { font-size: 1.25rem !important; }
         }
       `}
     </style>

     {/* Overlay pour mobile */}
     {isMenuOpen && (
       <div 
         className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
         onClick={() => setIsMenuOpen(false)}
       />
     )}

     {/* Sidebar escamotable */}
     <aside className={`
       ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
       fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white shadow-2xl transition-transform duration-300 ease-in-out no-print flex flex-col
       md:relative md:translate-x-0 md:shadow-none
     `}>
       <div className="p-8 text-center border-b border-slate-800/50 relative">
         <button 
           onClick={() => setIsMenuOpen(false)}
           className="absolute top-4 right-4 text-slate-500 hover:text-white md:hidden"
         >
           <X size={20} />
         </button>

         <h1 className="text-2xl font-black text-indigo-400 tracking-tighter uppercase">GestionLocataire</h1>
         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">SaaS Pro Edition</p>
       </div>

       {/* BANNIÈRE MODE ESPION (SIDEBAR) */}
       {adminData && (
          <div className="p-4 bg-orange-500/20 border-b border-orange-500/30 text-center no-print">
            <p className="text-[10px] font-black uppercase text-orange-400 mb-2 italic tracking-tighter">Mode Espion : {user?.nom_propriete}</p>
            <button 
              onClick={stopImpersonating} 
              className="w-full py-2 bg-orange-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2"
            >
              <LogOut size={12}/> Quitter l'accès
            </button>
          </div>
       )}
       
       <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
         <NavItem id="dashboard" label="Dashboard" icon={<LayoutDashboard size={20}/>} active={activeTab} set={(id) => { setActiveTab(id); setIsMenuOpen(false); }} />
         <NavItem id="tenants" label="Locataires" icon={<Users size={20}/>} active={activeTab} set={(id) => { setActiveTab(id); setIsMenuOpen(false); }} />
         <NavItem id="shops" label="Boutiques" icon={<Store size={20}/>} active={activeTab} set={(id) => { setActiveTab(id); setIsMenuOpen(false); }} />
         <NavItem id="payments" label="Paiements" icon={<CreditCard size={20}/>} active={activeTab} set={(id) => { setActiveTab(id); setIsMenuOpen(false); }} />
         <NavItem id="expenses" label="Dépenses" icon={<Wallet size={20}/>} active={activeTab} set={(id) => { setActiveTab(id); setIsMenuOpen(false); }} />
         
         {(user?.role === 'admin' || !!adminData) && (
           <div className="pt-4 mt-4 border-t border-slate-800">
              <p className="px-6 mb-2 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Contrôle Système</p>
              <button 
                onClick={() => { handleAdminAccess(); setIsMenuOpen(false); }} 
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold ${activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              >
                {isAdminUnlocked || !!adminData ? <Unlock size={20} className="text-emerald-400"/> : <Lock size={20} className="text-orange-400"/>} 
                Super Admin
              </button>
           </div>
         )}
       </nav>

       <div className="p-6 border-t border-slate-800 space-y-2">
         <button 
           onClick={() => { setActiveTab('profile'); setIsMenuOpen(false); }} 
           className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
         >
           <User size={18}/> Paramètres
         </button>

         <div className="bg-slate-800/50 p-3 rounded-2xl mb-2 text-center">
           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Devise active</label>
           <p className="text-white text-xs font-black">{settings.devise === 'XAF' ? 'Franc CFA (XAF)' : 'Euro (€)'}</p>
         </div>

         <button onClick={handleLogout} className="w-full flex items-center gap-2 p-3 text-red-400 hover:bg-red-500/10 rounded-xl font-bold transition-all text-sm group">
           <LogOut size={18} className="group-hover:rotate-180 transition-transform duration-500"/> Déconnexion
         </button>
       </div>
     </aside>

     {/* Zone de contenu principale */}
     <main className="flex-1 p-4 md:p-10 print:m-0 print:p-0 overflow-x-hidden pt-16 md:pt-10">
       
       {/* BANDEAU DE SÉCURITÉ "MODE ESPION" */}
       {adminData && (
          <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-2 z-[100] flex justify-between items-center px-4 md:px-10 shadow-2xl animate-pulse no-print">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest truncate max-w-[200px] md:max-w-none">
                MODE SUPERVISION : Vous agissez en tant que {user?.nom_propriete}
              </span>
            </div>
            <button 
              onClick={stopImpersonating}
              className="bg-white text-red-600 px-3 py-1 md:px-4 md:py-1 rounded-full text-[9px] font-black uppercase hover:scale-105 transition-all flex-shrink-0"
            >
              Quitter
            </button>
          </div>
       )}

       <div className="no-print max-w-7xl mx-auto font-bold">
           <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 text-slate-800 gap-4">
             <div className="flex items-center gap-4 w-full md:w-auto">
               <button 
                 onClick={() => setIsMenuOpen(!isMenuOpen)}
                 className="md:hidden p-3 bg-white rounded-2xl border shadow-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center"
               >
                 <Menu size={24} />
               </button>
               
               <div>
                 <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter line-clamp-1">
                   {user?.nom_propriete || "Mon Parc Immobilier"}
                 </h1>
                 <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 italic">
                   {activeTab === 'admin' ? "Supervision du Système SaaS" : "Tableau de Bord de Gestion"}
                 </p>
               </div>
             </div>
             
             <div className="flex items-center gap-4 w-full md:w-auto justify-end">
               {(user?.role === 'admin' || !!adminData) && (
                 <span className="bg-amber-100 text-amber-600 px-3 py-1.5 md:px-4 md:py-2 rounded-2xl text-[9px] md:text-[10px] font-black uppercase shadow-sm flex items-center gap-2 border border-amber-200">
                   <Shield size={14} /> <span className="hidden sm:inline">Mode Administrateur</span>
                 </span>
               )}
               <div className="bg-white px-3 py-2 md:px-5 md:py-3 rounded-2xl border shadow-sm flex items-center gap-3 text-[11px] md:text-sm font-black text-indigo-600 uppercase">
                 <Calendar size={18} className="hidden xs:block" /> {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
               </div>
             </div>
           </header>

           <div className="pb-20 md:pb-0">
             {activeTab === 'dashboard' && <DashboardView tenants={tenants} shops={shops} payments={payments} expenses={expenses} formatMoney={moneyFormatter} settings={settings} />}
             {activeTab === 'tenants' && <TenantsView tenants={tenants} shops={shops} payments={payments} api={api} onRefresh={loadAllData} formatMoney={moneyFormatter} user={user} />}
             {activeTab === 'shops' && <ShopsView shops={shops} tenants={tenants} payments={payments} api={api} onRefresh={loadAllData} formatMoney={moneyFormatter} />}
             {activeTab === 'payments' && <PaymentsView tenants={tenants} shops={shops} payments={payments} api={api} onRefresh={loadAllData} formatMoney={moneyFormatter} user={user} />}
             {activeTab === 'expenses' && <ExpensesView expenses={expenses} setExpenses={setExpenses} api={api} formatMoney={moneyFormatter} />}
             {activeTab === 'admin' && (user?.role === 'admin' || !!adminData) && <AdminView api={api} formatMoney={moneyFormatter} onImpersonate={handleImpersonate} />}
             {activeTab === 'profile' && user && <ProfileView user={user} api={api} onRefreshUser={handleRefreshUser} settings={settings} setSettings={setSettings} supabase={supabase} tenants={tenants} shops={shops} />}
           </div>
       </div>
     </main>
   </div>
 );
}

// --- VUES ---

/**
 * DASHBOARD VIEW
 */
function DashboardView({ tenants, shops, payments, expenses, formatMoney, settings }) {
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
 
 // Calcul Fiscal
 const brutNetExpenses = totalRevenue - totalExpenses;
 const abattementMontant = brutNetExpenses * (settings.abattement / 100);
 const baseImposable = Math.max(0, brutNetExpenses - abattementMontant);
 const impotsEstimation = baseImposable * (settings.tauxImpot / 100);
  
 const netProfit = brutNetExpenses - impotsEstimation;
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
     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
       
       {/* BÉNÉFICE NET APRÈS IMPÔTS */}
       <div className={`p-6 rounded-[32px] border-2 shadow-sm transition-all hover:scale-105 flex flex-col justify-between ${isProfitPositive ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
         <div className="flex items-center justify-between mb-4">
           <span className={`text-[9px] font-black uppercase tracking-widest ${isProfitPositive ? 'text-emerald-600' : 'text-red-600'}`}>
             Profit Net (Après Taxes)
           </span>
           <div className={`p-3 rounded-2xl ${isProfitPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
             {isProfitPositive ? <TrendingUpIcon size={20} /> : <TrendingDown size={20} />}
           </div>
         </div>
         <div>
           <h3 className={`text-xl md:text-2xl font-black tracking-tighter ${isProfitPositive ? 'text-emerald-700' : 'text-red-700'}`}>
             {formatMoney(netProfit)}
           </h3>
           <p className={`mt-2 text-[8px] font-bold uppercase italic ${isProfitPositive ? 'text-emerald-500' : 'text-red-500'}`}>
             Impôts : -{formatMoney(impotsEstimation)} ({settings.tauxImpot}%)
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
             <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter">
               {totalDeposits.toLocaleString()}
             </h3>
             <span className="text-[10px] font-bold text-slate-400">{settings.devise}</span>
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
       <div className="xl:col-span-2 bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm">
         <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Pipeline des Échéances</h3>
         <div className="space-y-4">
           {pipelineecheances.slice(0, 5).map(t => (
             <div key={t.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100 group gap-4">
               <div className="flex items-center gap-4">
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black flex-shrink-0 ${t.daysLeft < 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                   {t.name[0]}
                 </div>
                 <div>
                   <p className="font-black truncate max-w-[150px]">{t.name}</p>
                   <p className="text-[10px] font-bold text-indigo-50 uppercase tracking-tighter">Boutique {shops.find(s => Number(s.id) === Number(t.shop_id))?.name || 'N/A'}</p>
                 </div>
               </div>
               <div className="sm:text-right w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-0 pt-3 sm:pt-0">
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
                Votre base imposable bénéficie d'un abattement de <span className="text-white font-black">{settings.abattement}%</span> avant impôt de {settings.tauxImpot}%.
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
function TenantsView({ tenants, shops, payments, api, onRefresh, formatMoney, user }) {
 const [showAdd, setShowAdd] = useState(false);
 const [editingTenant, setEditingTenant] = useState(null);
 const currentMonth = new Date().toISOString().slice(0, 7);

 // Fonction WhatsApp intégrée pour les relances
 const envoyerWhatsAppRelance = (tenant, shop) => {
   const message = `*RAPPEL DE PAIEMENT*%0A` +
     `--------------------------------%0A` +
     `Bonjour *${tenant.name}*,%0A%0A` +
     `Sauf erreur de notre part, le loyer de la boutique *${shop?.name || 'N/A'}* est arrivé à échéance.%0A%0A` +
     `Merci de bien vouloir régulariser votre situation dès que possible.%0A%0A` +
     `_Si le paiement a déjà été effectué, merci d'ignorer ce message._`;

   let cleanPhone = tenant.phone.replace(/\D/g, ''); 
   if (cleanPhone.length === 9) cleanPhone = '237' + cleanPhone;

   window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
 };

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
       // PIÈGE : LOG DE FIN DE BAIL
       addLog(user, "FIN_BAIL", "Fin de bail pour un locataire");
     } else {
       alert(res?.error || "Erreur lors de la résiliation");
     }
   }
 };

 return (
   <div className="space-y-8 animate-in slide-in-from-bottom-4 text-slate-800 font-bold">
     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
       <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Gestion Locataires</h2>
       <button onClick={() => setShowAdd(true)} className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
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
           const shop = shops.find(s => Number(s.id) === Number(t.shop_id));

           return (
             <div key={t.id} className={`bg-white p-4 md:p-6 rounded-3xl border shadow-sm flex flex-col lg:flex-row lg:items-center justify-between transition-all gap-6 ${isLate ? 'border-red-100 bg-red-50/20' : 'border-slate-100 hover:shadow-md'}`}>
               <div className="flex items-center gap-4 md:gap-6">
                 <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex flex-shrink-0 items-center justify-center font-black text-xl md:text-2xl ${isLate ? 'bg-red-100 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                   {t.name[0]}
                 </div>
                 <div>
                   <div className="flex flex-wrap items-center gap-2 font-bold">
                     <p className="text-lg md:text-xl font-black">{t.name}</p>
                     <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${isLate ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                       {isLate ? 'IMPAYÉ' : 'RÈGLEMENT OK'}
                     </span>
                   </div>
                   <div className="flex flex-wrap gap-2 md:gap-4 items-center mt-1">
                     <span className="flex items-center gap-1 text-slate-400 font-bold text-xs"><Phone size={12}/> {t.phone}</span>
                     <span className="text-indigo-500 font-black text-xs uppercase tracking-widest">Unité: {shop?.name || 'N/A'}</span>
                   </div>
                 </div>
               </div>
               
               <div className="flex items-center justify-between lg:justify-end gap-4 md:gap-10 border-t lg:border-0 pt-4 lg:pt-0">
                 <div className="text-left lg:text-right">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Échéance</p>
                     <p className={`text-base md:text-lg font-black ${isLate ? 'text-red-600 underline' : 'text-slate-800'}`}>
                       {expiryDate === "0000-00" ? "Inconnue" : expiryDate}
                     </p>
                 </div>
                 <div className="flex items-center gap-2 md:gap-3">
                     <button 
                       onClick={() => envoyerWhatsAppRelance(t, shop)}
                       className={`p-3 md:p-4 rounded-2xl transition-all ${isLate ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                     >
                         <MessageSquare size={18} />
                     </button>
                     <button onClick={() => setEditingTenant(t)} className="p-2 md:p-3 text-slate-400 hover:text-indigo-600 transition-colors">
                         <Pencil size={18} />
                     </button>
                     <button onClick={() => handleTerminateLease(t.id)} className="p-2 md:p-3 text-slate-300 hover:text-red-500 transition-colors">
                         <Trash2 size={18}/>
                     </button>
                 </div>
               </div>
             </div>
           );
         })}
     </div>

     {showAdd && (
       <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[60] no-print text-slate-800 font-bold">
         <form onSubmit={handleAdd} className="bg-white rounded-[40px] p-6 md:p-10 w-full max-w-lg space-y-6 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
           <h3 className="text-2xl font-black tracking-tight text-center uppercase">Ajouter un Locataire</h3>
           <div className="space-y-4">
             <input name="name" placeholder="Nom complet" className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
             <input name="phone" placeholder="WhatsApp" className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Loyer Mensuel</label>
                 <input name="rent" type="number" placeholder="Ex: 50000" className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold text-emerald-600" required />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Caution Versée</label>
                 <input name="deposit" type="number" placeholder="Ex: 100000" className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold text-orange-600" required />
               </div>
             </div>
             <div className="space-y-1 font-bold">
               <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Attribution Boutique</label>
               <select name="shop_id" required className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold appearance-none" defaultValue="">
                 <option value="" disabled>-- Sélectionner une boutique libre --</option>
                 {shops.filter(s => s.status === 'available' || s.status === 'Disponible').map(shop => (
                   <option key={shop.id} value={shop.id}>{shop.name} - {formatMoney(shop.price)}</option>
                 ))}
               </select>
             </div>
           </div>
           <div className="flex gap-4 pt-4">
             <button type="button" onClick={() => setShowAdd(false)} className="flex-1 p-5 font-bold text-slate-400">Fermer</button>
             <button type="submit" className="flex-1 p-5 bg-indigo-600 text-white rounded-3xl font-black shadow-lg">Confirmer</button>
           </div>
         </form>
       </div>
     )}

     {editingTenant && (
       <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[60] no-print text-slate-800 font-bold">
         <form onSubmit={handleUpdateTenant} className="bg-white rounded-[40px] p-6 md:p-10 w-full max-w-lg space-y-6 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
           <h3 className="text-2xl font-black tracking-tight text-center uppercase">Modifier Locataire</h3>
           <div className="space-y-4">
             <input name="name" defaultValue={editingTenant.name} className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
             <input name="phone" defaultValue={editingTenant.phone} className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
             <input name="rent" type="number" defaultValue={editingTenant.rent_amount} className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold text-indigo-600" required />
           </div>
           <div className="flex gap-4 pt-4">
             <button type="button" onClick={() => setEditingTenant(null)} className="flex-1 p-5 font-bold text-slate-400">Annuler</button>
             <button type="submit" className="flex-1 p-5 bg-indigo-600 text-white rounded-3xl font-black shadow-lg">Enregistrer</button>
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
     <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm no-print gap-6">
       <div>
         <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Parc Immobilier</h2>
         <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Inventaire des boutiques</p>
       </div>
       <form onSubmit={handleAddShop} className="flex flex-wrap gap-3 items-center w-full xl:w-auto">
         <input name="name" placeholder="Code" className="flex-1 xl:flex-none p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-indigo-500 xl:w-32" required />
         <input name="price" type="number" placeholder="Loyer" className="flex-1 xl:flex-none p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-indigo-500 xl:w-32" required />
         <button type="submit" className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-600 transition-all text-sm shadow-lg">Ajouter</button>
       </form>
     </div>
     
     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 no-print text-slate-800 font-bold">
       {shops.map(s => {
         const tenant = tenants.find(t => Number(t.shop_id) === Number(s.id) && t.is_active !== false);
         const isOccupied = !!tenant;
         const rendement = getRendementAnnuel(s.id);
         
         return (
           <div key={s.id} className={`p-6 md:p-8 rounded-[40px] bg-white border-2 shadow-sm transition-all hover:scale-105 ${isOccupied ? 'border-indigo-50' : 'border-dashed border-indigo-100'}`}>
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl md:text-2xl font-black tracking-tighter">{s.name}</h3>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${isOccupied ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {isOccupied ? 'Occupée' : 'Libre'}
                </span>
             </div>

             <div className="mb-6 p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-2 mb-1">
                   <LucideBarChart size={14} className="text-indigo-500" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenus (12 mois)</p>
                </div>
                <p className="text-xl font-black tracking-tighter">{formatMoney(rendement)}</p>
             </div>

             {tenant ? (
               <div className="space-y-2">
                 <div className="h-px bg-slate-100 w-full mb-4" />
                 <p className="font-black text-indigo-600 truncate text-base md:text-lg uppercase">{tenant.name}</p>
               </div>
             ) : (
               <div className="space-y-2">
                 <div className="h-px bg-slate-100 w-full mb-4" />
                 <p className="text-xl md:text-2xl font-black">{formatMoney(s.price)}</p>
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

 // --- FONCTION WHATSAPP VERSION COMPLÈTE ---
 const envoyerWhatsApp = (payment, tenant, shop, type = 'recu') => {
  const dateEcheance = addMonthsToPeriod(payment.month, payment.months_covered || 1);
  const datePaiement = new Date(payment.created_at || Date.now()).toLocaleDateString('fr-FR');
  
  let message = "";

  if (type === 'recu') {
      // MESSAGE DE CONFIRMATION DE PAIEMENT
      message = `*REÇU DE LOYER NUMÉRIQUE*%0A` +
        `--------------------------------%0A` +
        `Bonjour *${tenant.name}*,%0A%0A` +
        `Nous confirmons la réception de votre paiement :%0A%0A` +
        `🏠 *Boutique :* ${shop?.name || 'N/A'}%0A` +
        `📅 *Date :* ${datePaiement}%0A` +
        `💳 *Montant :* ${formatMoney(payment.amount)}%0A` +
        `⏳ *Couverture :* ${payment.months_covered} mois%0A` +
        `🚨 *PROCHAINE ÉCHÉANCE : ${dateEcheance}*%0A%0A` +
        `Merci de votre confiance !`;
  } else {
      // MESSAGE DE RELANCE (POUR LES RETARDS)
      message = `*RAPPEL DE PAIEMENT*%0A` +
        `--------------------------------%0A` +
        `Bonjour *${tenant.name}*,%0A%0A` +
        `Sauf erreur de notre part, le loyer de la boutique *${shop?.name || 'N/A'}* est arrivé à échéance.%0A%0A` +
        `Merci de bien vouloir régulariser votre situation dès que possible.%0A%0A` +
        `_Si le paiement a déjà été effectué, merci d'ignorer ce message._`;
  }

  // Correction automatique du numéro Cameroun
  let cleanPhone = tenant.phone.replace(/\D/g, ''); 
  if (cleanPhone.length === 9) cleanPhone = '237' + cleanPhone;

  window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
 };

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
     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
       <div>
         <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Journal Financier</h2>
         <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 italic">Flux de trésorerie validés</p>
       </div>
       <button onClick={() => setShowAdd(true)} className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 text-sm uppercase">
         <Plus size={20}/> Nouvel encaissement
       </button>
     </div>

     <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-x-auto text-slate-800 font-bold">
       <table className="w-full text-left text-sm min-w-[600px]">
         <thead className="bg-slate-50/50 border-b">
           <tr>
             <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Locataire</th>
             <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Période</th>
             <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Durée</th>
             <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Montant</th>
             <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
           </tr>
         </thead>
         <tbody className="divide-y divide-slate-50">
           {payments.map(p => {
             const t = tenants.find(x => Number(x.id) === Number(p.tenant_id));
             const sh = shops.find(s => Number(s.id) === Number(t?.shop_id));
             return (
               <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors font-bold">
                 <td className="px-8 py-6 font-black uppercase text-xs">{t?.name || 'Inconnu'}</td>
                 <td className="px-8 py-6 font-bold text-slate-500 uppercase text-[10px] tracking-widest">{p.month}</td>
                 <td className="px-8 py-6 text-xs font-bold text-center">
                   <span className="px-3 py-1 bg-slate-100 rounded-full">{p.months_covered || 1} MOIS</span>
                 </td>
                 <td className="px-8 py-6 font-black text-emerald-600">{formatMoney(p.amount)}</td>
                 <td className="px-8 py-6 text-right">
                   <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => envoyerWhatsApp(p, t, sh, 'recu')}
                      className="p-3 text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
                      title="Envoyer par WhatsApp"
                    >
                      <MessageSquare size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        const tenant = tenants.find(x => Number(x.id) === Number(p.tenant_id));
                        const shop = shops.find(sh => Number(sh.id) === Number(tenant?.shop_id));
                        setReceiptToPrint({ ...p, tenant, shop });
                      }} 
                      className="inline-flex p-3 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-700 hover:text-white transition-all items-center gap-2"
                    >
                      <Download size={16} /> <span className="text-[10px] font-black uppercase">Reçu</span>
                    </button>
                   </div>
                 </td>
               </tr>
             );
           })}
         </tbody>
       </table>
     </div>

     {/* Logique d'affichage du reçu : Modale interactive avec bouton X */}
     {receiptToPrint && (
      <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto no-print">
        <div className="relative w-full max-w-2xl my-auto">
          
          {/* BOUTON FERMER */}
          <button 
            onClick={() => setReceiptToPrint(null)}
            className="absolute -top-12 right-0 md:-right-12 p-3 text-white hover:text-red-400 transition-colors bg-slate-800 rounded-full shadow-xl no-print"
            title="Fermer le reçu"
          >
            <X size={28} />
          </button>

          {/* LE REÇU LUI-MÊME */}
          <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden">
            <div className="print-only-container">
              <Receipt 
                payment={receiptToPrint} 
                tenant={receiptToPrint.tenant} 
                shop={receiptToPrint.shop} 
                formatMoney={formatMoney} 
                user={user} 
              />
            </div>

            {/* Boutons d'actions en bas */}
            <div className="p-6 bg-slate-50 border-t flex flex-col gap-3 no-print">
              <button 
                onClick={() => window.print()}
                className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-sm shadow-lg shadow-indigo-200"
              >
                Imprimer ou Sauver en PDF
              </button>
              
              <button 
                onClick={() => setReceiptToPrint(null)}
                className="w-full py-4 text-slate-400 font-bold uppercase text-xs"
              >
                Retour à la liste
              </button>
            </div>
          </div>
        </div>
      </div>
     )}

     {showAdd && (
       <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[60] no-print text-slate-800 font-bold">
         <form onSubmit={handlePaymentSubmit} className="bg-white rounded-[40px] p-6 md:p-10 w-full max-w-lg space-y-6 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
           <h3 className="text-2xl font-black tracking-tight text-center uppercase">Validation Encaissement</h3>
           <div className="space-y-4">
             <select name="tenant_id" className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold appearance-none" required
               onChange={(e) => setSelectedTenant(tenants.find(t => Number(t.id) === Number(e.target.value) && t.is_active !== false))}>
               <option value="">Locataire concerné...</option>
               {tenants.filter(t => t.is_active !== false).map(t => <option key={t.id} value={t.id}>{t.name} ({formatMoney(t.rent_amount)})</option>)}
             </select>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-bold">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Mois de départ</label>
                 <input name="month" type="month" defaultValue={currentMonthValue} className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nombre de mois</label>
                 <input name="months_covered" type="number" min="1" defaultValue="1" 
                   onChange={(e) => setNbMonths(Number(e.target.value) || 1)}
                   className="w-full p-5 bg-slate-50 rounded-2xl outline-none ring-indigo-500 focus:ring-2 font-bold" required />
               </div>
             </div>
             {selectedTenant && (
               <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col xs:flex-row justify-between items-center gap-4">
                 <div className="text-center xs:text-left">
                   <p className="text-[10px] font-black text-emerald-600 uppercase mb-1 tracking-widest">Encaissement total</p>
                   <p className="text-3xl md:text-4xl font-black tracking-tighter">{formatMoney(selectedTenant.rent_amount * nbMonths)}</p>
                 </div>
                 <CheckCircle className="text-emerald-500" size={32} />
               </div>
             )}
           </div>
           <button type="submit" className="w-full p-6 bg-emerald-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-emerald-700 transition-all uppercase">Confirmer</button>
           <button type="button" onClick={() => setShowAdd(false)} className="w-full text-slate-400 font-bold hover:text-slate-600 transition-colors">Fermer</button>
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
     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
       <h2 className="text-2xl font-black uppercase tracking-tight">Gestion des Dépenses</h2>
       <div className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-black shadow-sm border border-red-100">
         Total : {totalExpensesAmount.toLocaleString()} FCFA
       </div>
     </div>

     <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100 flex flex-col xl:flex-row gap-6 items-end">
       <div className="w-full xl:flex-1 space-y-2">
         <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Description</label>
         <input 
           type="text" 
           placeholder="Ex: Réparation clim, plomberie, taxes..."
           className="w-full p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold"
           value={newExpense.description}
           onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
           required
         />
       </div>
       <div className="w-full xl:w-64 space-y-2">
         <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Montant</label>
         <input 
           type="number" 
           className="w-full p-5 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-red-600"
           value={newExpense.amount}
           onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
           required
         />
       </div>
       <button type="submit" className="w-full xl:w-auto bg-slate-900 text-white px-10 py-5 rounded-3xl font-black hover:bg-indigo-600 transition-all shadow-lg uppercase tracking-widest text-xs">
         AJOUTER
       </button>
     </form>

     <div className="grid gap-4">
       {expenses.length === 0 ? (
          <div className="bg-white p-20 rounded-[32px] border border-dashed border-slate-200 text-center text-slate-400 italic">
            Aucune dépense enregistrée.
          </div>
       ) : (
         expenses.map(exp => (
           <div key={exp.id} className="bg-white p-4 md:p-6 rounded-[24px] flex justify-between items-center border border-slate-50 hover:border-red-100 hover:shadow-md transition-all group gap-4">
             <div className="flex items-center gap-4 md:gap-5 flex-1 min-w-0">
               <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 text-red-500 rounded-2xl flex flex-shrink-0 items-center justify-center group-hover:scale-110 transition-transform">
                  <MinusCircle size={24}/>
               </div>
               <div className="min-w-0">
                 <p className="font-black text-slate-800 uppercase text-xs md:text-sm tracking-tight truncate">{exp.description}</p>
                 <p className="text-[10px] text-slate-400 uppercase font-black italic">{new Date(exp.created_at).toLocaleDateString('fr-FR')}</p>
               </div>
             </div>
             <p className="font-black text-red-600 text-base md:text-lg flex-shrink-0">-{Number(exp.amount).toLocaleString()} FCFA</p>
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
function ProfileView({ user, api, onRefreshUser, settings, setSettings, supabase, tenants, shops }) {
 const [loading, setLoading] = useState(false);

 const handleResetCompte = async () => {
  const confirmation = window.confirm(
    "⚠️ ATTENTION : Voulez-vous vraiment supprimer TOUS vos locataires, boutiques, paiements et d'épenses ? Cette action est irréversible."
  );

  if (confirmation) {
    const code = prompt("Entrez 'RESET' en majuscules pour confirmer :");
    if (code === 'RESET') {
      setLoading(true);
      try {
        const tables = ['payments', 'expenses', 'tenants', 'shops'];
        
        for (const table of tables) {
          const { error } = await supabase
            .from(table)
            .delete()
            .eq('user_id', user.id); 
          
          if (error) throw error;
        }

        // PIÈGE : LOG DE RESET COMPTE
        addLog(user, "RESET_COMPTE", "Suppression totale des données du parc");

        alert("✅ Votre compte a été réinitialisé avec succès !");
        window.location.reload(); 
      } catch (err) {
        alert("❌ Erreur lors de la réinitialisation : " + err.message);
      }
      setLoading(false);
    } else {
      alert("Code incorrect, action annulée.");
    }
  }
 };

 const exportToExcel = () => {
  const headers = ["Nom Locataire", "Boutique", "Montant Loyer", "Téléphone", "Statut"];
  const rows = tenants.map(t => {
    const shop = shops.find(s => Number(s.id) === Number(t.shop_id));
    return [
      t.name,
      shop?.name || "N/A",
      t.rent_amount,
      t.phone,
      t.is_active ? "Actif" : "Parti"
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Export_Parc_Immo_${new Date().toLocaleDateString()}.csv`);
  link.click();
 };

 const enregistrerParametresCloud = async () => {
   setLoading(true);
   if (supabase && user) {
     console.log("ID Utilisateur envoyé:", user?.id);
     const { error } = await supabase
       .from('parametres')
       .upsert({ 
         user_id: user.id, 
         taux_impot: Number(settings.tauxImpot) || 0, 
         taux_abattement: Number(settings.abattement) || 0, 
         devise: settings.devise || 'XAF'
       });

     if (!error) {
       alert("✅ Réglages enregistrés sur le serveur !");
     } else {
       alert("❌ Erreur de sauvegarde : " + error.message);
     }
   } else {
       alert("⚠️ Erreur : Supabase n'est pas initialisé ou prêt.");
   }
   setLoading(false);
 };

 const handleUpdateProfile = async (e) => {
   e.preventDefault();
   setLoading(true);
   const formData = new FormData(e.target);
   const body = Object.fromEntries(formData);
   const res = await api.call('PUT', '/auth/profile', body);
   if (res && res.id) {
     alert("Profil mis à jour avec succès !");
     onRefreshUser(res); 
   }
   setLoading(false);
 };

 return (
   <div className="max-w-4xl mx-auto animate-in fade-in duration-500 text-slate-800 font-bold space-y-10 pb-20">
     {/* RÉGLAGES FISCAUX */}
     <div className="bg-white p-6 md:p-10 rounded-[40px] border-2 border-indigo-100 shadow-xl space-y-8">
       <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
         <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg">
            <Percent size={28}/>
         </div>
         <div>
           <h2 className="text-2xl font-black tracking-tight">Réglages du Parc</h2>
           <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1 italic">Configuration fiscale et monétaire</p>
         </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-bold">
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Taux d'Imposition (%)</label>
             <input type="number" value={settings.tauxImpot} onChange={(e) => setSettings({...settings, tauxImpot: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none focus:ring-2 ring-indigo-500 text-red-600" />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Abattement Forfaitaire (%)</label>
             <input type="number" value={settings.abattement} onChange={(e) => setSettings({...settings, abattement: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none focus:ring-2 ring-indigo-500 text-emerald-600" />
          </div>
          <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Devise Locale</label>
             <select value={settings.devise} onChange={(e) => setSettings({...settings, devise: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl font-black outline-none focus:ring-2 ring-indigo-500 appearance-none">
               <option value="XAF">Franc CFA (XAF)</option>
               <option value="EUR">Euro (€)</option>
             </select>
          </div>
          <div className="md:col-span-3 pt-4">
            <button onClick={enregistrerParametresCloud} disabled={loading} className="w-full p-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50">
               {loading ? "Enregistrement..." : "Sauvegarder les paramètres fiscaux"}
            </button>
          </div>
       </div>
     </div>

     {/* INFOS COMPTE */}
     <div className="bg-white p-6 md:p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
       <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
         <User size={20} className="text-slate-400" /> Mon Compte
       </h3>
       <form onSubmit={handleUpdateProfile} className="space-y-6">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-bold">
           <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Email</label>
             <input name="email" defaultValue={user?.email || ""} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-indigo-500" required />
           </div>
           <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Mot de passe</label>
             <input name="password" type="password" defaultValue={user?.password || ""} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-indigo-500" required />
           </div>
         </div>
         <div className="space-y-2">
           <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nom de la Propriété</label>
           <input name="nom_propriete" defaultValue={user?.nom_propriete || ""} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 ring-indigo-500" required />
         </div>

         {/* BLOC DEBUG ID SYSTÈME */}
         <div className="mt-4 p-4 bg-slate-100 rounded-2xl border border-slate-200">
           <p className="text-[10px] font-black uppercase text-slate-400">ID Système (DEBUG)</p>
           <p className="text-xs font-mono font-bold text-slate-600 break-all">{user?.id}</p>
         </div>

         <button type="submit" disabled={loading} className="w-full p-6 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest mt-6">
           Sauvegarder les modifications du compte
         </button>
       </form>
     </div>

     {/* SAUVEGARDE ET EXPORT */}
     <div className="bg-white p-6 md:p-10 rounded-[40px] border border-slate-100 shadow-sm space-y-4">
       <div className="flex items-center gap-4">
         <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl">
            <Download size={28}/>
         </div>
         <div>
           <h2 className="text-2xl font-black tracking-tight text-slate-800">Sauvegarde des données</h2>
           <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Exporter votre parc au format Excel</p>
         </div>
       </div>

       <button 
         onClick={exportToExcel}
         className="w-full p-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all"
       >
         Télécharger la liste des locataires (.CSV)
       </button>
     </div>

     {/* ZONE DE DANGER */}
     <div className="bg-red-50 p-6 md:p-10 rounded-[40px] border border-red-100 shadow-sm space-y-6">
       <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 text-red-600">
         <AlertTriangle size={20} /> Zone de Danger
       </h3>
       <p className="text-sm text-slate-500 font-bold">
         La réinitialisation supprimera définitivement toutes vos données (locataires, boutiques, paiements, d'épenses).
       </p>
       <button 
         onClick={handleResetCompte}
         disabled={loading}
         className="w-full p-6 bg-red-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-lg hover:bg-red-700 transition-all disabled:opacity-50"
       >
         Réinitialiser tout le compte
       </button>
     </div>
   </div>
 );
}

/**
 * ADMIN VIEW
 */
function AdminView({ api, formatMoney, onImpersonate }) {
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

 const handleImpersonate = (u) => {
   if (window.confirm(`Voulez-vous accéder à l'espace de ${u.nom_propriete} ?`)) {
     onImpersonate(u);
   }
 };

 return (
   <div className="space-y-6 animate-in fade-in duration-500 font-bold">
     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
       <div>
         <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Supervision SaaS</h2>
         <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Contrôle global de la plateforme</p>
       </div>
       <div className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg text-center">
         Total : {formatMoney(users.reduce((acc, u) => acc + (u.totalCA || 0), 0))}
       </div>
     </div>

     <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-x-auto">
       <table className="w-full text-left min-w-[800px]">
         <thead className="bg-slate-50/50 border-b">
           <tr>
             <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Propriétaire & Parc</th>
             <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-center tracking-widest">Unités</th>
             <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-center tracking-widest">Baux Actifs</th>
             <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Chiffre d'Affaires</th>
             <th className="p-6 text-[10px] font-black uppercase text-slate-400 text-right tracking-widest">Statut</th>
           </tr>
         </thead>
         <tbody className="divide-y divide-slate-100">
           {users
             .filter(u => u.role !== 'admin') 
             .map(u => (
               <tr key={u.id} className="hover:bg-slate-50/30 transition-colors font-bold">
                 <td className="p-6">
                   <p className="font-black text-slate-800 text-lg leading-tight uppercase font-bold">{u.nom_propriete}</p>
                   <p className="text-xs text-slate-400 font-bold">{u.email} • {u.phone}</p>
                 </td>
                 <td className="p-6 text-center text-indigo-600 font-black">{u.shopCount || 0}</td>
                 <td className="p-6 text-center text-slate-700 font-black">{u.tenantCount || 0}</td>
                 <td className="p-6 text-emerald-600 font-black">{formatMoney(u.totalCA || 0)}</td>
                 <td className="p-6 text-right flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleImpersonate(u)}
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
                    >
                      <User size={14} /> Accéder
                    </button>

                    <button 
                      onClick={() => toggleStatus(u)}
                      className={`px-5 py-2 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
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

/**
 * Receipt Component
 */
const Receipt = ({ payment, tenant, shop, user, formatMoney }) => {
 if (!payment || !tenant) return null;
 return (
   <div className="w-full p-4 sm:p-8 bg-white border-2 border-slate-100 rounded-[24px] sm:rounded-[32px] shadow-xl max-w-2xl mx-auto font-sans text-slate-800 font-bold overflow-hidden">
     <div className="flex justify-between items-start border-b-2 border-slate-50 pb-8 mb-8 font-bold">
       <div>
         <h2 className="receipt-title text-2xl font-black uppercase text-indigo-600 tracking-tight">
           {user?.nom_propriete || "REÇU DE LOYER"}
         </h2>
         <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
           Quittance de loyer officielle
         </p>
       </div>
       <div className="text-right">
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Bailleur</p>
         <p className="font-bold text-sm text-slate-700">{user?.phone || "N/A"}</p>
         <p className="text-[9px] font-bold text-slate-300">{user?.email}</p>
       </div>
     </div>

     <div className="space-y-8 font-bold">
       <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl font-bold">
         <span className="font-bold text-slate-400 uppercase text-[9px] tracking-widest">Référence :</span>
         <span className="font-black text-indigo-600 tracking-widest text-sm font-bold">#{payment.id?.toString().padStart(5, '0')}</span>
       </div>

       <div className="grid grid-cols-2 gap-6 font-bold">
         <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100/50">
           <p className="text-[9px] font-black text-indigo-50 uppercase mb-2 tracking-widest">Locataire</p>
           <p className="text-lg font-black text-slate-800 uppercase">{tenant.name}</p>
           <p className="text-xs font-bold text-slate-400 italic">Boutique : {shop?.name || 'N/A'}</p>
         </div>
         <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100/50 text-right">
           <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Date Émission</p>
           <p className="text-lg font-black text-slate-800">{new Date(payment.created_at || Date.now()).toLocaleDateString('fr-FR')}</p>
         </div>
       </div>

       <div className="border-2 border-slate-50 rounded-[24px] overflow-hidden shadow-sm font-bold">
         <table className="w-full">
           <thead className="bg-slate-50/50">
             <tr>
               <th className="px-4 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Désignation</th>
               <th className="hidden xs:table-cell px-4 py-4 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">Période</th>
               <th className="px-4 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Total</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-50">
             <tr>
               <td className="px-4 py-6 font-bold text-xs sm:text-sm text-slate-700">
                 Loyer Boutique {shop?.name}
                 <div className="xs:hidden text-[10px] text-slate-400">{payment.month}</div>
               </td>
               <td className="hidden xs:table-cell px-4 py-6 text-center font-black text-slate-600 text-xs">{payment.month}</td>
               <td className="px-4 py-6 text-right font-black text-xl sm:text-2xl text-indigo-600 tracking-tighter">
                 {formatMoney(payment.amount)}
               </td>
             </tr>
           </tbody>
           <tfoot>
              <tr>
                <td colSpan="3" className="px-8 py-10 text-[10px] text-slate-400 italic">Ce reçu constitue quittance pour la période indiquée ci-dessus sous réserve d'encaissement.</td>
              </tr>
           </tfoot>
         </table>
       </div>
     </div>

     <div className="flex justify-between items-center mt-10 pt-10 border-t border-dashed border-slate-200">
       <div className="w-48 h-24 border-2 border-slate-100 rounded-2xl flex flex-col items-center justify-center font-bold">
         <p className="text-[9px] font-black text-slate-300 mb-4 tracking-widest">Cachet & Signature</p>
       </div>
     </div>
   </div>
 );
};

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
     <div className="flex justify-between items-start mb-4">
       <div className="p-3 bg-slate-50 rounded-2xl">{icon}</div>
       {highlight && <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse border-4 border-white shadow-sm"></span>}
     </div>
     <div>
       <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mb-1 truncate">{label}</p>
       <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter line-clamp-1">{value}</p>
       {sub && <p className="text-[10px] text-slate-400 mt-1 italic font-bold">{sub}</p>}
     </div>
   </div>
 );
}

function LoginPage({ onLogin, isRegistering, setIsRegistering, onRegister }) {
 return (
   <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-bold">
     <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500">
       <div className="text-center font-bold">
         <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-800">GestionLocataire</h1>
         <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">SaaS Immobilier</p>
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
         <button type="submit" className="w-full p-6 bg-indigo-600 text-white rounded-3xl font-black shadow-xl hover:bg-indigo-700 transition-all text-lg uppercase tracking-widest">
           {isRegistering ? "Créer l'Espace" : "Accéder"}
         </button>
       </form>
       <button onClick={() => setIsRegistering(!isRegistering)} className="w-full text-slate-400 font-black text-xs uppercase tracking-widest hover:text-indigo-600 transition-all text-center">
         {isRegistering ? "Retour au Login" : "S'enregistrer"}
       </button>
     </div>
   </div>
 );
}