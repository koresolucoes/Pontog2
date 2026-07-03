// pages/Admin/AdminLayout.tsx
import React, { useState } from 'react';
import { useAdminStore } from '../../stores/adminStore';
import { DashboardView } from './views/DashboardView';
import { UsersView } from './views/UsersView';
import { PlansView } from './views/PlansView';
import { PaymentsView } from './views/PaymentsView';
import { ReportsView } from './views/ReportsView';
import { VenuesView } from './views/VenuesView';
import { AdminNewsView } from './views/AdminNewsView';
import { AuditLogsView } from './views/AuditLogsView';
import { SettingsView } from './views/SettingsView';

type AdminView = 'dashboard' | 'users' | 'plans' | 'payments' | 'reports' | 'venues' | 'news' | 'audit-logs' | 'settings';

interface NavItem {
    view: AdminView;
    label: string;
    icon: string;
    roles: ('owner' | 'moderator' | 'support' | 'financial')[];
}

const ALL_NAV_ITEMS: NavItem[] = [
    { view: 'dashboard', label: 'Dashboard', icon: 'dashboard', roles: ['owner', 'moderator', 'support', 'financial'] },
    { view: 'users', label: 'Usuários', icon: 'group', roles: ['owner', 'moderator', 'support'] },
    { view: 'news', label: 'Notícias', icon: 'newspaper', roles: ['owner', 'moderator'] },
    { view: 'venues', label: 'Locais (Guia)', icon: 'map', roles: ['owner', 'moderator'] },
    { view: 'plans', label: 'Planos', icon: 'sell', roles: ['owner', 'financial'] },
    { view: 'payments', label: 'Pagamentos', icon: 'receipt_long', roles: ['owner', 'financial'] },
    { view: 'reports', label: 'Denúncias', icon: 'flag', roles: ['owner', 'moderator', 'support'] },
    { view: 'audit-logs', label: 'Logs de Auditoria', icon: 'security', roles: ['owner', 'financial'] },
    { view: 'settings', label: 'Configurações', icon: 'settings', roles: ['owner'] },
];

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
    const adminUser = useAdminStore((state) => state.adminUser);
    const [activeView, setActiveView] = useState<AdminView>('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const adminRole = adminUser?.role || 'owner';

    // Get nav items allowed for current admin role
    const allowedNavItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(adminRole));

    const renderView = () => {
        switch (activeView) {
            case 'dashboard': return <DashboardView />;
            case 'users': return <UsersView />;
            case 'plans': return <PlansView />;
            case 'payments': return <PaymentsView />;
            case 'reports': return <ReportsView />;
            case 'venues': return <VenuesView />;
            case 'news': return <AdminNewsView />;
            case 'audit-logs': return <AuditLogsView />;
            case 'settings': return <SettingsView />;
            default: return <DashboardView />;
        }
    };

    const handleNavigation = (view: AdminView) => {
        setActiveView(view);
        setSidebarOpen(false);
    };

    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
            case 'moderator': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'support': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'financial': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            default: return 'bg-slate-700/10 text-slate-400 border-slate-500/10';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'owner': return 'Owner';
            case 'moderator': return 'Moderador';
            case 'support': return 'Suporte';
            case 'financial': return 'Financeiro';
            default: return 'Admin';
        }
    };
    
    const SidebarContent = () => (
         <div className="flex flex-col h-full bg-slate-950 border-r border-white/5 shadow-2xl">
            {/* Header / Brand */}
            <div className="p-6 border-b border-white/5 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl shadow-lg">
                    <span className="text-white font-black text-xl">G</span>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white font-outfit leading-none">Ponto G</h2>
                    <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest">Painel Admin</span>
                </div>
            </div>

            {/* Profile Info Card in Sidebar */}
            {adminUser && (
                <div className="p-4 mx-4 mt-4 bg-slate-900/60 border border-white/5 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm border border-white/10 uppercase">
                        {adminUser.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate leading-tight">{adminUser.name}</p>
                        <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">{adminUser.email}</p>
                        <span className={`inline-block px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest border rounded-full mt-1.5 ${getRoleBadgeStyle(adminRole)}`}>
                            {getRoleLabel(adminRole)}
                        </span>
                    </div>
                </div>
            )}
            
            {/* Dynamic Navigation list */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 mt-2">Menu Principal</p>
                {allowedNavItems.map(item => (
                    <NavLink 
                        key={item.view}
                        icon={item.icon} 
                        label={item.label} 
                        isActive={activeView === item.view} 
                        onClick={() => handleNavigation(item.view)} 
                    />
                ))}
            </nav>
            
            <div className="p-4 border-t border-white/5">
                <button onClick={logout} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-450 hover:bg-red-500/10 transition-colors font-bold text-sm">
                    <span className="material-symbols-rounded">logout</span>
                    <span>Sair do Modo Admin</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-dark-900 text-slate-50 font-inter overflow-hidden">
            
            {/* Sidebar for Desktop */}
            <aside className="hidden lg:block w-72 h-full flex-shrink-0 z-35">
                <SidebarContent />
            </aside>

            {/* Sidebar Drawer overlay for Mobile */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-40 animate-fade-in lg:hidden" onClick={() => setSidebarOpen(false)}>
                    <aside 
                        className="fixed top-0 left-0 bottom-0 w-72 z-50 h-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <SidebarContent />
                    </aside>
                </div>
            )}

            <main className="flex-1 flex flex-col overflow-hidden relative z-10">
                {/* Header Global (Mobile Burger Trigger + Header Information) */}
                <header className="p-4 bg-slate-950 border-b border-white/5 flex items-center justify-between z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 bg-slate-800 rounded-full border border-white/10 text-white hover:bg-slate-700 transition-colors shadow-lg">
                            <span className="material-symbols-rounded">menu</span>
                        </button>
                        <h2 className="font-bold text-white font-outfit text-lg">
                            {ALL_NAV_ITEMS.find(n => n.view === activeView)?.label || 'Painel Admin'}
                        </h2>
                    </div>

                    {/* Quick profile pill for top header */}
                    {adminUser && (
                        <div className="flex items-center gap-3 bg-slate-900/50 border border-white/5 px-4 py-2 rounded-xl">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold text-white">{adminUser.name}</p>
                                <span className={`inline-block px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest border rounded-full mt-0.5 ${getRoleBadgeStyle(adminRole)}`}>
                                    {getRoleLabel(adminRole)}
                                </span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-md">
                                {adminUser.name.charAt(0)}
                            </div>
                        </div>
                    )}
                </header>
                
                {/* Main View Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-dark-900 bg-[radial-gradient(ellipse_60%_60%_at_50%_-10%,rgba(120,119,198,0.06),rgba(255,255,255,0))]">
                    <div className="max-w-7xl mx-auto">
                        {renderView()}
                    </div>
                </div>
            </main>
        </div>
    );
};
