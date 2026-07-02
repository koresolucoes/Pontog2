
// pages/Admin/AdminLayout.tsx
import React, { useState } from 'react';
import { useAdminStore } from '../../stores/adminStore';
import { DashboardView } from './views/DashboardView';
import { UsersView } from './views/UsersView';
import { PlansView } from './views/PlansView';
import { PaymentsView } from './views/PaymentsView';
import { ReportsView } from './views/ReportsView';
import { VenuesView } from './views/VenuesView';
import { AdminNewsView } from './views/AdminNewsView'; // New Import

type AdminView = 'dashboard' | 'users' | 'plans' | 'payments' | 'reports' | 'venues' | 'news';

const NavLink: React.FC<{
    icon: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <button 
        onClick={onClick} 
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${
            isActive 
            ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-900/20' 
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`}
    >
        <span className={`material-symbols-rounded text-xl ${isActive ? 'filled' : ''}`}>{icon}</span>
        <span>{label}</span>
    </button>
);

export const AdminLayout: React.FC = () => {
    const logout = useAdminStore((state) => state.logout);
    const [activeView, setActiveView] = useState<AdminView>('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const renderView = () => {
        switch (activeView) {
            case 'dashboard': return <DashboardView />;
            case 'users': return <UsersView />;
            case 'plans': return <PlansView />;
            case 'payments': return <PaymentsView />;
            case 'reports': return <ReportsView />;
            case 'venues': return <VenuesView />;
            case 'news': return <AdminNewsView />; // New View
            default: return <DashboardView />;
        }
    };

    // Função centralizada para navegar e fechar o menu (útil no mobile e desktop agora)
    const handleNavigation = (view: AdminView) => {
        setActiveView(view);
        setSidebarOpen(false);
    };
    
    const SidebarContent = () => (
         <div className="flex flex-col h-full bg-dark-950/95 backdrop-blur-xl border-r border-white/10 shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center gap-3">
                <img 
                    src="https://wwmiqdovqgysncmqnmvp.supabase.co/storage/v1/object/public/venues/Logo/Logo.png" 
                    alt="Logo" 
                    className="h-10 w-auto object-contain drop-shadow-md"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                            (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                        }
                    }}
                />
                <div className="hidden items-center justify-center w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl shadow-lg" style={{ display: 'none' }}>
                    <span className="text-white font-black text-xl">G</span>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white font-outfit leading-none">Ponto G</h2>
                    <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">Admin Panel</span>
                </div>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 mt-2">Menu Principal</p>
                <NavLink icon="dashboard" label="Dashboard" isActive={activeView === 'dashboard'} onClick={() => handleNavigation('dashboard')} />
                <NavLink icon="group" label="Usuários" isActive={activeView === 'users'} onClick={() => handleNavigation('users')} />
                <NavLink icon="newspaper" label="Notícias" isActive={activeView === 'news'} onClick={() => handleNavigation('news')} />
                <NavLink icon="map" label="Locais (Guia)" isActive={activeView === 'venues'} onClick={() => handleNavigation('venues')} />
                <NavLink icon="sell" label="Planos" isActive={activeView === 'plans'} onClick={() => handleNavigation('plans')} />
                <NavLink icon="receipt_long" label="Pagamentos" isActive={activeView === 'payments'} onClick={() => handleNavigation('payments')} />
                <NavLink icon="flag" label="Denúncias" isActive={activeView === 'reports'} onClick={() => handleNavigation('reports')} />
            </nav>
            
            <div className="p-4 border-t border-white/5">
                <button onClick={logout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-bold text-sm">
                    <span className="material-symbols-rounded">logout</span>
                    <span>Sair</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-dark-900 text-slate-50 font-inter overflow-hidden">
            
            {/* Sidebar Drawer (Overlay para Mobile e Desktop) */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setSidebarOpen(false)}>
                    <aside 
                        className="fixed top-0 left-0 bottom-0 w-72 z-50 animate-slide-in-up h-full"
                        onClick={(e) => e.stopPropagation()} // Impede fechar ao clicar dentro da sidebar
                    >
                        <SidebarContent />
                    </aside>
                </div>
            )}

            <main className="flex-1 flex flex-col overflow-hidden relative z-10">
                {/* Header Global (Visível em Mobile e Desktop) */}
                <header className="p-4 bg-dark-900/90 backdrop-blur-md border-b border-white/5 flex items-center gap-4 z-20">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 bg-slate-800 rounded-full border border-white/10 text-white hover:bg-slate-700 transition-colors shadow-lg">
                        <span className="material-symbols-rounded">menu</span>
                    </button>
                    <h2 className="font-bold text-white font-outfit text-lg">{activeView.charAt(0).toUpperCase() + activeView.slice(1)}</h2>
                </header>
                
                {/* Main View Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-dark-900">
                    <div className="max-w-7xl mx-auto">
                        {renderView()}
                    </div>
                </div>
            </main>
        </div>
    );
};
