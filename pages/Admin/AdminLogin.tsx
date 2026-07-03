// pages/Admin/AdminLogin.tsx
import React, { useState } from 'react';
import { useAdminStore } from '../../stores/adminStore';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loginMode, setLoginMode] = useState<'credentials' | 'key'>('credentials');
  const [loading, setLoading] = useState(false);
  
  const login = useAdminStore((state) => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let success = false;
    if (loginMode === 'credentials') {
      success = await login(email, password);
    } else {
      success = await login(apiKey);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]">
      <div className="w-full max-w-md bg-slate-900/60 border border-white/5 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center font-black text-4xl text-white mx-auto shadow-lg shadow-pink-500/20">
                G
            </div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500 mt-4 tracking-tight font-outfit">
                Painel Admin
            </h1>
            <p className="text-slate-400 mt-2 text-sm">Controle operacional e segurança do Ponto G</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-950/50 p-1 rounded-xl mb-6 border border-white/5">
          <button
            type="button"
            onClick={() => setLoginMode('credentials')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              loginMode === 'credentials'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            E-mail & Senha
          </button>
          <button
            type="button"
            onClick={() => setLoginMode('key')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              loginMode === 'key'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chave Mestre
          </button>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          {loginMode === 'credentials' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">E-mail Administrativo</label>
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">mail</span>
                  <input
                    className="w-full bg-slate-950/50 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500 border border-white/5 focus:border-pink-500 transition-all text-sm"
                    type="email"
                    placeholder="ex: admin@pontog.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Senha de Acesso</label>
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">lock</span>
                  <input
                    className="w-full bg-slate-950/50 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500 border border-white/5 focus:border-pink-500 transition-all text-sm"
                    type="password"
                    placeholder="Sua senha secreta"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chave de Segurança do Sistema</label>
              <div className="relative">
                <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">vpn_key</span>
                <input
                  className="w-full bg-slate-950/50 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500 border border-white/5 focus:border-pink-500 transition-all text-sm animate-fade-in"
                  type="password"
                  placeholder="Insira a chave mestre de admin"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-3.5 px-4 rounded-xl hover:from-pink-500 hover:to-purple-500 transition-all shadow-lg shadow-pink-900/30 active:scale-[0.98] disabled:opacity-50 disabled:scale-100 text-sm"
              disabled={loading}
            >
              {loading ? 'Autenticando...' : 'Acessar Modo Admin'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
            Acesso monitorado e registrado sob auditoria
          </p>
        </div>
      </div>
    </div>
  );
};
