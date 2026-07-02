
// pages/Admin/AdminPanel.tsx
import React from 'react';
import { useAdminStore } from '../../stores/adminStore';
import { AdminLogin } from './AdminLogin';
import { AdminLayout } from './AdminLayout';
import { Toaster } from 'react-hot-toast';

export const AdminPanel: React.FC = () => {
    const isAdminAuthenticated = useAdminStore((state) => state.isAdminAuthenticated);

    return (
        <div className="bg-dark-900 text-slate-50 min-h-screen antialiased font-inter">
             <Toaster
                position="top-center"
                toastOptions={{
                    className: '!bg-slate-800 !text-white !border !border-white/10',
                    style: {
                        background: '#1e293b', // slate-800
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)' 
                    },
                }}
            />
            {isAdminAuthenticated ? <AdminLayout /> : <AdminLogin />}
        </div>
    );
};
