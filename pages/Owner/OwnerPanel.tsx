import React from 'react';
import { Toaster } from 'react-hot-toast';
import { OwnerLayout } from './OwnerLayout';

export const OwnerPanel: React.FC = () => {
    return (
        <div className="bg-dark-900 text-slate-50 min-h-screen antialiased font-inter">
             <Toaster
                position="top-center"
                toastOptions={{
                    className: '!bg-slate-800 !text-white !border !border-white/10',
                    style: {
                        background: '#1e293b',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)' 
                    },
                }}
            />
            <OwnerLayout />
        </div>
    );
};
