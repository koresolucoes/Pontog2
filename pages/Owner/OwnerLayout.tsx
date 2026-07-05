import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { OwnerDashboardView } from './views/OwnerDashboardView';
import { OwnerVenuesView } from './views/OwnerVenuesView';
import { OwnerClaimVenueView } from './views/OwnerClaimVenueView';

export const OwnerLayout: React.FC = () => {
    const { user, session } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'venues' | 'claim'>('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (!session || !user) {
        return (
            <div className="flex items-center justify-center h-screen bg-dark-900 text-white">
                <p>Você precisa estar logado para acessar o painel de proprietários.</p>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <OwnerDashboardView />;
            case 'venues': return <OwnerVenuesView />;
            case 'claim': return <OwnerClaimVenueView />;
            default: return <OwnerDashboardView />;
        }
    };

    return (
        <div className="flex h-screen bg-dark-900 text-slate-50 font-inter">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-white/10 flex flex-col z-50 transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-rounded text-primary-500 text-3xl">storefront</span>
                        <div>
                            <h1 className="text-xl font-bold font-outfit text-white leading-tight">Painel B2B</h1>
                            <p className="text-xs text-slate-400">Gestão de Locais</p>
                        </div>
                    </div>
                    <button 
                        className="md:hidden text-slate-400 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
                
                <nav className="flex-1 p-4 space-y-2">
                    <button 
                        onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-primary-500/10 text-primary-500' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <span className="material-symbols-rounded">dashboard</span>
                        <span className="font-medium">Dashboard</span>
                    </button>
                    <button 
                        onClick={() => { setActiveTab('venues'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'venues' ? 'bg-primary-500/10 text-primary-500' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <span className="material-symbols-rounded">store</span>
                        <span className="font-medium">Meus Locais</span>
                    </button>
                    <button 
                        onClick={() => { setActiveTab('claim'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'claim' ? 'bg-primary-500/10 text-primary-500' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <span className="material-symbols-rounded">add_business</span>
                        <span className="font-medium">Reivindicar Local</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-rounded">arrow_back</span>
                        <span className="font-medium">Voltar ao App</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-dark-900 relative">
                {/* Mobile Header */}
                <header className="md:hidden bg-slate-900 border-b border-white/10 p-4 flex items-center gap-4">
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="text-slate-400 hover:text-white"
                    >
                        <span className="material-symbols-rounded">menu</span>
                    </button>
                    <h1 className="text-xl font-bold font-outfit text-white">Painel B2B</h1>
                </header>
                
                <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};
