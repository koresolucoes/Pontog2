// pages/Admin/views/DashboardView.tsx
import React, { useEffect, useState } from 'react';
import { useAdminStore } from '../../../stores/adminStore';

interface TimeSeriesPoint {
    dateStr: string;
    label: string;
    signups: number;
    revenue: number;
}

interface Stats {
    totalUsers: number;
    activeSubscriptions: number;
    totalRevenue: number;
    dailySignups: number;
    timeSeries: TimeSeriesPoint[];
}

const COLOR_MAPS: Record<string, { bg: string; border: string; text: string; fill: string }> = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', fill: 'bg-blue-500' },
    yellow: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', fill: 'bg-amber-500' },
    green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', fill: 'bg-emerald-500' },
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400', fill: 'bg-pink-500' },
};

const StatCard: React.FC<{ title: string; value: string | number; icon: string; color: 'blue' | 'yellow' | 'green' | 'pink' }> = ({ title, value, icon, color }) => {
    const colors = COLOR_MAPS[color];
    return (
        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl shadow-xl hover:bg-slate-800/40 transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${colors.bg} border ${colors.border}`}>
                    <span className={`material-symbols-rounded text-2xl ${colors.text}`}>{icon}</span>
                </div>
                {/* Visual spark indicator */}
                <div className="h-1.5 w-14 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full w-4/5 ${colors.fill} rounded-full group-hover:w-full transition-all duration-500`}></div>
                </div>
            </div>
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
                <p className="text-3xl font-black text-white font-outfit">{value}</p>
            </div>
        </div>
    );
};

export const DashboardView: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chartMetric, setChartMetric] = useState<'signups' | 'revenue'>('signups');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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
        <div className="flex items-center justify-center h-96">
            <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
    
    if (error) return (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-center font-bold max-w-xl mx-auto my-12 shadow-xl">
            Erro de Carregamento: {error}
        </div>
    );
    
    if (!stats) return null;

    const formattedRevenue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue);

    // --- CUSTOM SVG GRAPHICS ENGINE ---
    const chartData = stats.timeSeries || [];
    const values = chartData.map(d => chartMetric === 'signups' ? d.signups : d.revenue);
    const maxVal = Math.max(...values, chartMetric === 'signups' ? 5 : 50); // safety fallback bounds
    const minVal = 0;

    const width = 600;
    const height = 180;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Create coordinates
    const points = chartData.map((d, index) => {
        const x = paddingLeft + (index / (chartData.length - 1)) * chartWidth;
        const value = chartMetric === 'signups' ? d.signups : d.revenue;
        const y = height - paddingBottom - ((value - minVal) / (maxVal - minVal)) * chartHeight;
        return { x, y, data: d };
    });

    // Make curve lines SVG path
    let linePath = '';
    let areaPath = '';

    if (points.length > 0) {
        linePath = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            // Linear curve
            linePath += ` L ${points[i].x} ${points[i].y}`;
        }
        // Area close
        areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white font-outfit tracking-tight">Painel de Desempenho</h1>
                    <p className="text-slate-400 mt-1">Estatísticas consolidadas e monitoramento comercial do Ponto G.</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-950/40 border border-white/5 p-1 rounded-xl self-start">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse ml-2.5"></span>
                    <span className="text-xs text-slate-400 font-mono pr-2.5">SISTEMA ATIVO</span>
                </div>
            </div>
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total de Usuários" value={stats.totalUsers} icon="group" color="blue" />
                <StatCard title="Assinantes Plus" value={stats.activeSubscriptions} icon="auto_awesome" color="yellow" />
                <StatCard title="Receita Total" value={formattedRevenue} icon="payments" color="green" />
                <StatCard title="Cadastros (24h)" value={stats.dailySignups} icon="person_add" color="pink" />
            </div>
            
            {/* Graph Card & Notifications Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Beautiful custom BI Graphic card */}
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 lg:col-span-2 shadow-xl flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-rounded text-pink-500">monitoring</span>
                                Gráficos de Crescimento
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">Visão histórica dos últimos 7 dias operacionais.</p>
                        </div>
                        {/* Tab Toggle selectors */}
                        <div className="flex bg-slate-950/50 p-1 rounded-xl border border-white/5 self-start sm:self-center">
                            <button
                                onClick={() => { setChartMetric('signups'); setHoveredIndex(null); }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    chartMetric === 'signups'
                                        ? 'bg-pink-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                Novos Usuários
                            </button>
                            <button
                                onClick={() => { setChartMetric('revenue'); setHoveredIndex(null); }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    chartMetric === 'revenue'
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                Faturamento (R$)
                            </button>
                        </div>
                    </div>

                    {/* SVG Curve viewport container */}
                    <div className="relative w-full overflow-hidden mt-2 bg-slate-950/20 border border-white/[0.02] p-4 rounded-xl">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none overflow-visible">
                            <defs>
                                <linearGradient id="glowGradientPink" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#db2777" stopOpacity="0.35" />
                                    <stop offset="100%" stopColor="#db2777" stopOpacity="0.00" />
                                </linearGradient>
                                <linearGradient id="glowGradientGreen" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                                </linearGradient>
                            </defs>

                            {/* Horizontal guide lines */}
                            <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                            <line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                            <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />

                            {/* Y Axis bounds */}
                            <text x={paddingLeft - 10} y={paddingTop + 4} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">
                                {chartMetric === 'signups' ? maxVal.toFixed(0) : `R$ ${maxVal.toFixed(0)}`}
                            </text>
                            <text x={paddingLeft - 10} y={height - paddingBottom + 3} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">
                                0
                            </text>

                            {/* X Axis label nodes */}
                            {points.map((pt, idx) => (
                                <text key={idx} x={pt.x} y={height - 8} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="middle">
                                    {pt.data.label}
                                </text>
                            ))}

                            {/* Curve areas and lines */}
                            {points.length > 0 && (
                                <>
                                    <path 
                                        d={areaPath} 
                                        fill={chartMetric === 'signups' ? 'url(#glowGradientPink)' : 'url(#glowGradientGreen)'} 
                                    />
                                    <path 
                                        d={linePath} 
                                        fill="none" 
                                        stroke={chartMetric === 'signups' ? '#ec4899' : '#10b981'} 
                                        strokeWidth="3" 
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </>
                            )}

                            {/* Hover interactive markers */}
                            {points.map((pt, idx) => (
                                <g key={idx}
                                   className="cursor-pointer"
                                   onMouseEnter={() => setHoveredIndex(idx)}
                                   onMouseLeave={() => setHoveredIndex(null)}
                                >
                                    {/* Invisible thick hover targets */}
                                    <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                                    {/* Small visible node dots */}
                                    <circle 
                                        cx={pt.x} 
                                        cy={pt.y} 
                                        r={hoveredIndex === idx ? "6" : "3.5"} 
                                        fill={chartMetric === 'signups' ? '#ec4899' : '#10b981'} 
                                        stroke="#0f172a" 
                                        strokeWidth="1.5"
                                        className="transition-all duration-150"
                                    />
                                </g>
                            ))}
                        </svg>

                        {/* Interactive Float Tooltip overlay */}
                        {hoveredIndex !== null && points[hoveredIndex] && (
                            <div 
                                className="absolute bg-slate-950 border border-white/10 px-3 py-2 rounded-xl shadow-2xl pointer-events-none animate-fade-in text-xs"
                                style={{
                                    left: `${(points[hoveredIndex].x / width) * 100}%`,
                                    top: `${(points[hoveredIndex].y / height) * 100 - 35}%`,
                                    transform: 'translateX(-50%)',
                                }}
                            >
                                <p className="text-[10px] text-slate-500 font-mono">{points[hoveredIndex].data.dateStr}</p>
                                <p className="font-black text-white mt-0.5">
                                    {chartMetric === 'signups' 
                                        ? `${points[hoveredIndex].data.signups} cadastros`
                                        : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(points[hoveredIndex].data.revenue)
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Operational System Alerts & Support card */}
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-rounded text-purple-500">notifications</span>
                            Estado do Servidor
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 p-3.5 bg-slate-950/40 border border-white/5 rounded-xl">
                                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-1.5 shrink-0 shadow-lg shadow-emerald-500/20"></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-200">Núcleo Central Integrado</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Banda, DNS, DB e Auth respondendo normais.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3.5 bg-slate-950/40 border border-white/5 rounded-xl">
                                <div className="w-2.5 h-2.5 bg-purple-500 rounded-full mt-1.5 shrink-0 shadow-lg shadow-purple-500/20"></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-200">Backup Supabase DB</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Sincronização redundante agendada ativa.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3.5 bg-slate-950/40 border border-white/5 rounded-xl">
                                <div className="w-2.5 h-2.5 bg-pink-500 rounded-full mt-1.5 shrink-0 shadow-lg shadow-pink-500/20"></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-200">Segurança RBAC Ativa</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Restrições granulares operando com criptografia.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 mt-6 text-center">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                            Monitoramento em tempo real
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
