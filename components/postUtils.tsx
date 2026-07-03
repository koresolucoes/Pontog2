import React from 'react';
import { useMapStore } from '../stores/mapStore';

export const handleUserClick = (author: any) => {
    if (!author) return;
    const calculateAge = (dobString: string | null): number => {
        if (!dobString) return 18;
        try {
            const dob = new Date(dobString);
            const diff = Date.now() - dob.getTime();
            const ageDate = new Date(diff);
            return Math.abs(ageDate.getUTCFullYear() - 1970);
        } catch (e) {
            return 18;
        }
    };
    useMapStore.getState().setSelectedUser({
        ...author,
        id: author.id || author.user_id,
        age: author.age || calculateAge(author.date_of_birth),
        status: author.status || 'active',
        city: author.city || 'Desconhecida',
        is_incognito: author.is_incognito || false,
        has_completed_onboarding: author.has_completed_onboarding ?? true
    });
};

export const renderContent = (content: any) => {
    if (!content || typeof content !== 'string') return null;
    return content.split(/(#[a-zA-Z0-9_À-ÿ]+)/g).map((part, i) => 
        part.startsWith('#') 
            ? <span key={i} className="text-primary-400 font-medium hover:underline cursor-pointer">{part}</span> 
            : part
    );
};
