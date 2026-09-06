import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { OwnerVenuesView } from './views/OwnerVenuesView';
import { OwnerMarketingSecureView } from './views/OwnerMarketingSecureView';

export const OwnerLayout: React.FC = () => {
    const { user, session } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'business' | 'marketing'>('business');
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
            case 'business': return <OwnerVenuesView />;
            case 'marketing': return <OwnerMarketingSecureView />;
            default: return <OwnerVenuesView />;
        }
    };

    return (
        <div className="flex h-screen bg-dark-900 text-slate-50 font-inter">
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

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
                        onClick={() => { setActiveTab('business'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'business' ? 'bg-primary-500/10 text-primary-500' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <span className="material-symbols-rounded">dashboard</span>
                        <span className="font-medium">Meu Negócio</span>
                    </button>

                    <button
                        onClick={() => { setActiveTab('marketing'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'marketing' ? 'bg-primary-500/10 text-primary-500' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <span className="material-symbols-rounded">campaign</span>
                        <span className="font-medium">Hub de Marketing</span>
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

            <main className="flex-1 flex flex-col overflow-hidden bg-dark-900 relative">
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
