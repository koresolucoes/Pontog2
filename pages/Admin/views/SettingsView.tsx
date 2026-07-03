// pages/Admin/views/SettingsView.tsx
import React, { useEffect, useState } from 'react';
import { useAdminStore } from '../../../stores/adminStore';
import toast from 'react-hot-toast';

interface AdminAccount {
    id: string;
    email: string;
    name: string;
    role: 'owner' | 'moderator' | 'support' | 'financial';
    is_active: boolean;
    created_at: string;
}

export const SettingsView: React.FC = () => {
    const [settings, setSettings] = useState<Record<string, any>>({
        maintenance_mode: false,
        ad_interval_feed: 5,
        ad_interval_inbox: 10,
        travel_mode_price: 19.90,
        allow_free_travel_weekend: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Admin management state
    const [adminsList, setAdminsList] = useState<AdminAccount[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(false);

    // Form for new admin
    const [newAdminName, setNewAdminName] = useState('');
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newAdminPassword, setNewAdminPassword] = useState('');
    const [newAdminRole, setNewAdminRole] = useState<'owner' | 'moderator' | 'support' | 'financial'>('moderator');
    const [creatingAdmin, setCreatingAdmin] = useState(false);

    // MFA 2FA states
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; otpauthUri: string } | null>(null);
    const [mfaSetupCode, setMfaSetupCode] = useState('');
    const [mfaDisableCode, setMfaDisableCode] = useState('');
    const [showMfaSetup, setShowMfaSetup] = useState(false);
    const [loadingMfa, setLoadingMfa] = useState(false);

    const token = useAdminStore((state) => state.getToken());
    const currentAdminUser = useAdminStore((state) => state.adminUser);

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/admin/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            }
        } catch (err) {
            console.warn('Failed to load settings API, using defaults', err);
        }
    };

    const fetchAdmins = async () => {
        if (currentAdminUser?.role !== 'owner') return; // Only owner can manage admin accounts
        setLoadingAdmins(true);
        try {
            const response = await fetch('/api/admin/accounts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (response.ok) {
                setAdminsList(data);
            } else {
                throw new Error(data.error || 'Erro ao carregar administradores.');
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoadingAdmins(false);
        }
    };

    const fetchMfaStatus = async () => {
        try {
            const response = await fetch('/api/admin/mfa/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setMfaEnabled(data.mfaEnabled);
            }
        } catch (e) {
            console.error('Failed to load MFA status', e);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchSettings(), fetchAdmins(), fetchMfaStatus()]);
            setLoading(false);
        };
        init();
    }, [token]);

    const handleInitiateMfaSetup = async () => {
        setLoadingMfa(true);
        try {
            const response = await fetch('/api/admin/mfa/setup', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao iniciar configuração do MFA.');
            setMfaSetupData(data);
            setShowMfaSetup(true);
            setMfaSetupCode('');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoadingMfa(false);
        }
    };

    const handleEnableMfa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mfaSetupCode || mfaSetupCode.length < 6) {
            toast.error('O código deve conter 6 dígitos.');
            return;
        }

        setLoadingMfa(true);
        try {
            const response = await fetch('/api/admin/mfa/enable', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    secret: mfaSetupData?.secret,
                    code: mfaSetupCode
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao habilitar o MFA.');

            toast.success('Autenticação em duas etapas (2FA) habilitada com sucesso!');
            setMfaEnabled(true);
            setShowMfaSetup(false);
            setMfaSetupData(null);
            setMfaSetupCode('');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoadingMfa(false);
        }
    };

    const handleDisableMfa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mfaDisableCode || mfaDisableCode.length < 6) {
            toast.error('Insira o código de 6 dígitos atual para desativar.');
            return;
        }

        setLoadingMfa(true);
        try {
            const response = await fetch('/api/admin/mfa/disable', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    code: mfaDisableCode
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao desativar o MFA.');

            toast.success('MFA desativado da sua conta com sucesso.');
            setMfaEnabled(false);
            setMfaDisableCode('');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoadingMfa(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ settings })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Erro ao salvar configurações.');
            }

            toast.success('Configurações operacionais atualizadas com sucesso!');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAdminName || !newAdminEmail || !newAdminPassword) {
            toast.error('Preencha todos os campos do novo administrador.');
            return;
        }

        setCreatingAdmin(true);
        try {
            const response = await fetch('/api/admin/accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newAdminName,
                    email: newAdminEmail,
                    password: newAdminPassword,
                    role: newAdminRole
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao criar administrador.');

            toast.success(`Administrador ${data.name} criado com sucesso!`);
            setNewAdminName('');
            setNewAdminEmail('');
            setNewAdminPassword('');
            setNewAdminRole('moderator');
            fetchAdmins();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setCreatingAdmin(false);
        }
    };

    const handleToggleAdminStatus = async (target: AdminAccount) => {
        if (target.email.toLowerCase() === currentAdminUser?.email.toLowerCase()) {
            toast.error('Você não pode desativar ou rebaixar sua própria conta ativa.');
            return;
        }

        try {
            const response = await fetch(`/api/admin/accounts?id=${target.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: target.email,
                    is_active: !target.is_active
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao atualizar status.');

            toast.success(`Status de @${target.name} atualizado com sucesso.`);
            fetchAdmins();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDeleteAdmin = async (id: string, email: string) => {
        if (email.toLowerCase() === currentAdminUser?.email.toLowerCase()) {
            toast.error('Você não pode excluir sua própria conta de login ativa.');
            return;
        }

        if (!confirm('Deseja realmente EXCLUIR permanentemente este administrador? Ele perderá todo o acesso.')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/accounts?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro ao excluir administrador.');

            toast.success('Conta excluída com sucesso.');
            fetchAdmins();
        } catch (err: any) {
            toast.error(err.message);
        }
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

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-black text-white font-outfit tracking-tight">Configurações & Governança</h1>
                <p className="text-slate-400 mt-1">Gerencie os parâmetros globais e as contas administrativas com níveis rígidos de acesso (RBAC).</p>
            </div>

            <div className="max-w-4xl">
                {/* Feature Flags and Configuration form */}
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2 pb-4 border-b border-white/5">
                            <span className="material-symbols-rounded text-pink-500">settings_applications</span>
                            Variáveis Operacionais (Flags)
                        </h3>

                        {/* Toggle Maintenance mode */}
                        <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-white/5 rounded-xl">
                            <div>
                                <h4 className="text-sm font-bold text-white">Modo de Manutenção Geral</h4>
                                <p className="text-xs text-slate-400 mt-1">Se ativo, exibe tela de "Em Manutenção" para todos os usuários comuns.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSettings({ ...settings, maintenance_mode: !settings.maintenance_mode })}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${
                                    settings.maintenance_mode ? 'bg-pink-600' : 'bg-slate-700'
                                }`}
                            >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                                    settings.maintenance_mode ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                            </button>
                        </div>

                        {/* Toggle Free Travel Mode on Weekend */}
                        <div className="flex items-center justify-between p-4 bg-slate-950/40 border border-white/5 rounded-xl">
                            <div>
                                <h4 className="text-sm font-bold text-white">Modo Viajante Grátis no Final de Semana</h4>
                                <p className="text-xs text-slate-400 mt-1">Permite a usuários comuns ativar o Modo Viagem gratuitamente no sábado e domingo.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSettings({ ...settings, allow_free_travel_weekend: !settings.allow_free_travel_weekend })}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${
                                    settings.allow_free_travel_weekend ? 'bg-pink-600' : 'bg-slate-700'
                                }`}
                            >
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                                    settings.allow_free_travel_weekend ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                            </button>
                        </div>

                        {/* Numeric Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Preço Modo Viajante (R$)
                                </label>
                                <input
                                    type="number"
                                    step="0.10"
                                    value={settings.travel_mode_price || 19.90}
                                    onChange={(e) => setSettings({ ...settings, travel_mode_price: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-950/50 rounded-xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500 border border-white/5 text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Anúncios no Feed (Intervalo de Cards)
                                </label>
                                <input
                                    type="number"
                                    value={settings.ad_interval_feed || 5}
                                    onChange={(e) => setSettings({ ...settings, ad_interval_feed: parseInt(e.target.value) })}
                                    className="w-full bg-slate-950/50 rounded-xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500 border border-white/5 text-sm"
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4 border-t border-white/5 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-pink-900/20 active:scale-[0.98] disabled:opacity-50"
                            >
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Two-Factor Authentication (MFA) Section */}
                <div className="bg-slate-900/40 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6 mt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/5">
                        <div>
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                <span className="material-symbols-rounded text-pink-500">security</span>
                                Segurança da Conta & Autenticação (2FA / MFA)
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Ative a proteção em duas etapas utilizando aplicativos autenticadores (Google Authenticator, Authy, Microsoft Authenticator, etc.).
                            </p>
                        </div>
                        <div>
                            {mfaEnabled ? (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold font-mono">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    PROTEGIDO COM MFA
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold font-mono">
                                    MFA DESATIVADO
                                </span>
                            )}
                        </div>
                    </div>

                    {mfaEnabled ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-950/40 border border-white/5 rounded-xl space-y-2">
                                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                                    <span className="material-symbols-rounded text-emerald-400 text-sm">verified_user</span>
                                    Sua conta está altamente protegida
                                </h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Toda vez que você realizar login com seu e-mail e senha, será solicitado o código dinâmico de 6 dígitos gerado em seu smartphone.
                                </p>
                            </div>

                            {/* Disable MFA form */}
                            <form onSubmit={handleDisableMfa} className="space-y-3 pt-2">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Desativar Autenticação em Duas Etapas
                                </label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="Código atual de 6 dígitos"
                                        value={mfaDisableCode}
                                        onChange={(e) => setMfaDisableCode(e.target.value.replace(/\D/g, ''))}
                                        className="bg-slate-950/50 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 border border-white/5 text-sm font-mono text-center tracking-widest w-full sm:max-w-xs"
                                        required
                                        disabled={loadingMfa}
                                    />
                                    <button
                                        type="submit"
                                        disabled={loadingMfa}
                                        className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 font-bold text-xs rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {loadingMfa ? 'Processando...' : 'Desativar MFA'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {!showMfaSetup ? (
                                <div className="space-y-4">
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Para habilitar, você precisará escanear um código QR gerado pelo sistema utilizando o aplicativo autenticador de sua preferência no celular e inserir o código de verificação para confirmar.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleInitiateMfaSetup}
                                        disabled={loadingMfa}
                                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-md hover:shadow-pink-900/10 active:scale-[0.98] disabled:opacity-50"
                                    >
                                        <span className="material-symbols-rounded text-sm">qr_code_2</span>
                                        {loadingMfa ? 'Gerando Chave...' : 'Habilitar Autenticação de Dois Fatores (MFA)'}
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleEnableMfa} className="space-y-6 p-4 bg-slate-950/40 border border-white/5 rounded-xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                        <div className="space-y-3 text-center md:text-left">
                                            <h4 className="text-sm font-bold text-white">1. Escaneie este QR Code</h4>
                                            <p className="text-xs text-slate-400 leading-relaxed">
                                                Abra o Google Authenticator ou aplicativo similar e adicione uma nova conta escaneando o código QR ao lado.
                                            </p>
                                            
                                            {mfaSetupData?.secret && (
                                                <div className="pt-2 text-left">
                                                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Chave Manual (Caso não consiga escanear)</span>
                                                    <div className="px-3 py-1.5 bg-slate-900 border border-white/5 rounded-lg text-xs font-mono text-pink-300 select-all break-all">
                                                        {mfaSetupData.secret}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-center">
                                            {mfaSetupData?.otpauthUri && (
                                                <div className="p-3 bg-white rounded-xl shadow-lg border border-white/10">
                                                    <img 
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mfaSetupData.otpauthUri)}`} 
                                                        alt="QR Code de Configuração MFA" 
                                                        className="w-40 h-40"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/5 space-y-3">
                                        <h4 className="text-sm font-bold text-white">2. Insira o Código de Verificação de 6 Dígitos</h4>
                                        <p className="text-xs text-slate-400">
                                            Digite o código de 6 dígitos que está sendo exibido no seu aplicativo autenticador para confirmar a sincronização.
                                        </p>
                                        
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                                            <input
                                                type="text"
                                                maxLength={6}
                                                placeholder="000 000"
                                                value={mfaSetupCode}
                                                onChange={(e) => setMfaSetupCode(e.target.value.replace(/\D/g, ''))}
                                                className="bg-slate-900 border border-white/5 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-pink-500 text-sm font-mono text-center tracking-widest w-full sm:max-w-xs"
                                                required
                                                disabled={loadingMfa}
                                            />
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={loadingMfa}
                                                    className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50"
                                                >
                                                    {loadingMfa ? 'Confirmando...' : 'Confirmar e Ativar 2FA'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowMfaSetup(false);
                                                        setMfaSetupData(null);
                                                    }}
                                                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Admin Management Section - only visible to owners */}
            {currentAdminUser?.role === 'owner' && (
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                    <div className="border-b border-white/5 pb-4">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                            <span className="material-symbols-rounded text-pink-500">admin_panel_settings</span>
                            Gerenciamento de Administradores
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Cadastre, desative e delegue funções administrativas baseadas em perfil com e-mail e senha.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Left/Middle: List of Admins */}
                        <div className="xl:col-span-2 space-y-4">
                            {loadingAdmins ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : adminsList.length === 0 ? (
                                <div className="p-8 bg-slate-950/40 border border-white/5 rounded-xl text-center text-slate-500 text-sm">
                                    Nenhuma credencial dinâmica registrada. Use o formulário ao lado para adicionar o primeiro administrador do banco de dados!
                                </div>
                            ) : (
                                <div className="overflow-hidden border border-white/5 rounded-xl bg-slate-950/20 divide-y divide-white/5">
                                    {adminsList.map((adm) => (
                                        <div key={adm.id} className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-all gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold font-mono">
                                                    {adm.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-white">{adm.name}</p>
                                                        <span className={`px-2 py-0.5 text-[9px] uppercase tracking-widest font-black border rounded-full ${getRoleBadgeStyle(adm.role)}`}>
                                                            {adm.role}
                                                        </span>
                                                        {!adm.is_active && (
                                                            <span className="px-1.5 py-0.5 text-[9px] uppercase bg-red-500/10 text-red-400 border border-red-500/20 rounded-full font-bold">
                                                                Inativo
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-mono mt-0.5">{adm.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Toggle Status */}
                                                <button
                                                    onClick={() => handleToggleAdminStatus(adm)}
                                                    className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                                                        adm.is_active 
                                                            ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/10' 
                                                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/10'
                                                    }`}
                                                    title={adm.is_active ? 'Desativar acesso' : 'Ativar acesso'}
                                                >
                                                    <span className="material-symbols-rounded text-sm block">
                                                        {adm.is_active ? 'block' : 'check_circle'}
                                                    </span>
                                                </button>

                                                {/* Delete admin */}
                                                <button
                                                    onClick={() => handleDeleteAdmin(adm.id, adm.email)}
                                                    className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/10 rounded-lg transition-all"
                                                    title="Excluir credencial"
                                                >
                                                    <span className="material-symbols-rounded text-sm block">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right: Add Admin form */}
                        <div className="bg-slate-950/40 border border-white/5 p-5 rounded-xl space-y-4">
                            <h4 className="font-bold text-white text-sm flex items-center gap-2">
                                <span className="material-symbols-rounded text-pink-500 text-base">person_add</span>
                                Nova Credencial Admin
                            </h4>

                            <form onSubmit={handleCreateAdmin} className="space-y-3.5">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Pedro Alves"
                                        value={newAdminName}
                                        onChange={(e) => setNewAdminName(e.target.value)}
                                        className="w-full bg-slate-900 border border-white/5 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">E-mail Operacional</label>
                                    <input
                                        type="email"
                                        placeholder="Ex: pedro@pontog.com"
                                        value={newAdminEmail}
                                        onChange={(e) => setNewAdminEmail(e.target.value)}
                                        className="w-full bg-slate-900 border border-white/5 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Senha Provisória</label>
                                    <input
                                        type="password"
                                        placeholder="Senha forte de acesso"
                                        value={newAdminPassword}
                                        onChange={(e) => setNewAdminPassword(e.target.value)}
                                        className="w-full bg-slate-900 border border-white/5 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nível de Permissão (Role)</label>
                                    <select
                                        value={newAdminRole}
                                        onChange={(e) => setNewAdminRole(e.target.value as any)}
                                        className="w-full bg-slate-900 border border-white/5 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-pink-500"
                                    >
                                        <option value="moderator">Moderador (Conteúdo e Locais)</option>
                                        <option value="owner">Owner (Acesso Total e Financeiro)</option>
                                        <option value="support">Suporte (Ajuda e Denúncias)</option>
                                        <option value="financial">Financeiro (Auditoria e Faturamento)</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={creatingAdmin}
                                    className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-xs rounded-lg transition-all shadow-md hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 mt-2"
                                >
                                    {creatingAdmin ? 'Criando...' : 'Cadastrar Administrador'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
