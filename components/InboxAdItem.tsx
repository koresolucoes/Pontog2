import React, { useState } from 'react';
import { Ad } from '../types';
import { AdDetailModal } from './AdDetailModal';

interface InboxAdItemProps {
  ad: Ad;
}

export const InboxAdItem: React.FC<InboxAdItemProps> = ({ ad }) => {
    const [showModal, setShowModal] = useState(false);

    const handleClick = () => {
        setShowModal(true);
    };

    return (
        <>
            <div onClick={handleClick} className="p-4 flex items-center space-x-3 cursor-pointer hover:bg-slate-800">
                <div className="relative flex-shrink-0">
                    <img loading="lazy" src={ad.image_url} alt={ad.title} className="w-12 h-12 rounded-full object-cover" />
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold truncate text-base text-white">{ad.title}</h3>
                        <span className="text-xs text-slate-500 flex-shrink-0 ml-2 bg-slate-700 px-1.5 py-0.5 rounded">Patrocinado</span>
                    </div>
                    <p className="text-sm truncate text-slate-400">
                        {ad.description}
                    </p>
                </div>
            </div>

            {showModal && (
                <AdDetailModal ad={ad} onClose={() => setShowModal(false)} />
            )}
        </>
    );
};