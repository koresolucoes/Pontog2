
// lib/utils.ts
import { format, formatDistanceToNow, isToday, isYesterday, differenceInMinutes } from 'date-fns';
// Fix: Correctly import the pt-BR locale from its specific module path.
import { ptBR } from 'date-fns/locale/pt-BR';
import { getPublicImageUrl } from './supabase';
import { User } from '../types';

export const isVideoUrl = (path?: string | null, mediaType?: string | null): boolean => {
    if (mediaType === 'video') return true;
    if (!path) return false;
    const cleanPath = path.split('?')[0].toLowerCase();
    return cleanPath.endsWith('.mp4') || 
           cleanPath.endsWith('.webm') || 
           cleanPath.endsWith('.mov') || 
           cleanPath.endsWith('.mkv') || 
           cleanPath.endsWith('.avi') || 
           cleanPath.endsWith('.m4v') ||
           cleanPath.endsWith('.3gp') ||
           cleanPath.endsWith('.ogv') ||
           cleanPath.includes('/videos/');
};

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
 * Limpa uma tag/tribo/kink individual removendo chaves, aspas, colchetes, barras de escape e espaços extras.
 * Ex: '{"tag"}' -> 'tag', '"tag"' -> 'tag', '{tag}' -> 'tag'
 */
export const cleanTag = (tag: any): string => {
  if (tag === null || tag === undefined) return '';
  let str = String(tag).trim();
  str = str.replace(/^[\{\[\"\'\\]+|[\}\]\"\'\\]+$/g, '').trim();
  str = str.replace(/^[\"\'`]+|[\"\'`]+$/g, '').trim();
  str = str.replace(/\\"/g, '"').replace(/^["']|["']$/g, '').trim();
  return str;
};

/**
 * Converte qualquer entrada de tags/tribos/kinks (string, array, JSON, formato Postgres) em um array limpo de strings.
 */
export const parseTags = (input: any): string[] => {
  if (!input) return [];
  
  let list: string[] = [];

  if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === 'string') {
        if (item.includes('{') || item.includes(',') || item.includes('[')) {
          list.push(...parseTags(item));
        } else {
          const cleaned = cleanTag(item);
          if (cleaned) list.push(cleaned);
        }
      } else if (item) {
        const cleaned = cleanTag(item);
        if (cleaned) list.push(cleaned);
      }
    }
  } else if (typeof input === 'string') {
    let raw = input.trim();
    if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('{') && raw.endsWith('}'))) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parseTags(parsed);
        }
      } catch (e) {
        // Ignora erro de JSON e processa como string delimitada por vírgula/chaves
      }
    }
    raw = raw.replace(/^[\{\[]|[\}\]]$/g, '');
    const parts = raw.split(',');
    for (const part of parts) {
      const cleaned = cleanTag(part);
      if (cleaned) list.push(cleaned);
    }
  }

  return Array.from(new Set(list));
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
  const rawTribes = profile.tribes 
    ? profile.tribes
    : (profile.profile_tribes?.map((pt: any) => pt.tribes?.name).filter(Boolean) || []);

  const tribesArray = parseTags(rawTribes);
  const kinksArray = parseTags(profile.kinks);

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
    kinks: kinksArray,
    can_host: canHost,
  };
  delete user.profile_tribes; // Clean up the raw joined data to match the User type.
  return user as User;
};
