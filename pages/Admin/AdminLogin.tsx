// pages/Admin/AdminLogin.tsx
import React, { useState } from 'react';
import { useAdminStore } from '../../stores/adminStore';

export const AdminLogin: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAdminStore((state) => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(apiKey);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-800 p-8 rounded-2xl shadow-lg">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-4xl text-white mx-auto">
                G
            </div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500 mt-4">
                Painel Admin
            </h1>
            <p className="text-gray-400 mt-2">Acesso restrito</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="space-y-4">
            <input
              className="w-full bg-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500 border border-transparent focus:border-pink-500"
              type="password"
              placeholder="Chave de Acesso"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          </div>
          <div className="mt-6">
            <button
              className="w-full bg-pink-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
