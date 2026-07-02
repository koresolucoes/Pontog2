
// lib/utils.ts
import { format, formatDistanceToNow, isToday, isYesterday, differenceInMinutes } from 'date-fns';
// Fix: Correctly import the pt-BR locale from its specific module path.
import { ptBR } from 'date-fns/locale/pt-BR';
import { getPublicImageUrl } from './supabase';
import { User } from '../types';

/**
 * Formata um timestamp para uma string de "visto por último" legível.
 * Considera um usuário online se esteve ativo nos últimos 5 minutos.
 * @param timestamp A string de data/hora ISO.
 * @returns Uma string formatada como "Online", "Visto hoje às 14:30", etc.
 */
export const formatLastSeen = (timestamp: string | null | undefined): string => {
    if (!timestamp) return 'Offline';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // Considera online se a última atividade foi há menos de 5 minutos
    if (differenceInMinutes(now, date) < 5) {
        return 'Online';
    }

    if (isToday(date)) {
        return `Visto hoje às ${format(date, 'HH:mm', { locale: ptBR })}`;
    }
    if (isYesterday(date)) {
        return `Visto ontem às ${format(date, 'HH:mm', { locale: ptBR })}`;
    }
    // FIX: Cast options to 'any' to bypass a potential TypeScript type definition issue
    // where 'locale' is not recognized in 'FormatDistanceOptions', even though it's valid at runtime.
    return `Visto ${formatDistanceToNow(date, { addSuffix: true, locale: ptBR } as any)}`;
};

/**
 * Calculates age from a date of birth string.
 * @param dob Date of birth string (e.g., 'YYYY-MM-DD').
 * @returns The calculated age as a number.
 */
export const calculateAge = (dob: string | null): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

/**
 * Transforms a raw profile object from a Supabase RPC into a typed User object.
 * Processes image URLs and calculates age.
 * @param profile The raw profile data from the database.
 * @returns A formatted User object.
 */
export const transformProfileToUser = (profile: any): User => {
  // Handles tribe data from get_nearby_profiles (simple array)
  // and get_popular_profiles (nested object array)
  const tribesArray = profile.tribes 
    ? profile.tribes
    : (profile.profile_tribes?.map((pt: any) => pt.tribes.name) || []);

  // OTIMIZAÇÃO: Solicita imagens com largura máxima de 500px.
  // Isso é suficiente para a grade e o modal de perfil em dispositivos móveis,
  // reduzindo drasticamente o tamanho do download (de MBs para KBs).
  const imageOptions = { width: 500, height: 650, resize: 'cover' as const };

  // Robust boolean check: handles true, "true", 1, etc.
  const canHost = profile.can_host === true || profile.can_host === 'true' || profile.can_host === 1;

  const user = {
    ...profile,
    age: calculateAge(profile.date_of_birth),
    avatar_url: getPublicImageUrl(profile.avatar_url, { width: 500, height: 500 }), // Avatar quadrado
    public_photos: (profile.public_photos || []).map((path: string) => getPublicImageUrl(path, imageOptions)),
    tribes: tribesArray,
    kinks: profile.kinks || [],
    can_host: canHost,
  };
  delete user.profile_tribes; // Clean up the raw joined data to match the User type.
  return user as User;
};
