
// pages/Admin/views/DashboardView.tsx
import React, { useEffect, useState } from 'react';
import { useAdminStore } from '../../../stores/adminStore';

interface Stats {
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    dailySignups: number;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-slate-800/50 border border-white/5 p-6 rounded-2xl shadow-lg backdrop-blur-sm hover:bg-slate-800 transition-all">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}>
                <span className={`material-symbols-rounded text-2xl text-${color}-500`}>{icon}</span>
            </div>
            {/* Placeholder sparkline or indicator */}
            <div className="h-1 w-12 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full w-2/3 bg-${color}-500 rounded-full`}></div>
            </div>
        </div>
        <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
            <p className="text-3xl font-black text-white font-outfit">{value}</p>
        </div>
    </div>
);


export const DashboardView: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const token = useAdminStore((state) => state.getToken());

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/admin/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Falha ao buscar estatísticas');
                const data = await response.json();
                setStats(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [token]);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
    
    if (error) return (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center font-bold">
            Erro: {error}
        </div>
    );
    
    if (!stats) return null;

    const formattedRevenue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-black text-white font-outfit tracking-tight">Dashboard</h1>
                <p className="text-slate-400 mt-1">Visão geral do desempenho do Ponto G.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total de Usuários" value={stats.totalUsers} icon="group" color="blue" />
                <StatCard title="Assinantes Plus" value={stats.activeSubscriptions} icon="auto_awesome" color="yellow" />
                <StatCard title="Receita Total" value={formattedRevenue} icon="payments" color="green" />
                <StatCard title="Novos (24h)" value={stats.dailySignups} icon="person_add" color="pink" />
            </div>
            
            {/* Quick Actions Placeholder */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-rounded text-pink-500">monitoring</span>
                        Atividade Recente
                    </h3>
                    <div className="h-40 flex items-center justify-center text-slate-500 text-sm border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/50">
                        Gráfico de atividade em breve
                    </div>
                </div>
                
                <div className="bg-slate-800/30 border border-white/5 rounded-2xl p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-rounded text-purple-500">notifications</span>
                        Alertas do Sistema
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-white/5">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <p className="text-sm text-slate-300">Sistema operando normalmente.</p>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-white/5">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <p className="text-sm text-slate-300">Backup diário realizado com sucesso.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
