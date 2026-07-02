

// lib/venuesData.ts
import { Venue } from '../types';

// Dados simulados de locais reais/fictícios em grandes centros para popular o mapa e a landing page.
// Isso ajuda no SEO e na aprovação do AdSense, mostrando que o site tem conteúdo rico.

export const VENUES_DATA: Venue[] = [
    {
        id: 'sp-1',
        name: 'Sauna 269',
        type: 'sauna',
        description: 'A maior e mais movimentada sauna de São Paulo. Vários ambientes, bar, piscina e cabines.',
        address: 'R. Bela Cintra, 269 - Consolação, São Paulo',
        lat: -23.5535,
        lng: -46.6578,
        image_url: 'https://images.pexels.com/photos/3214958/pexels-photo-3214958.jpeg?auto=compress&cs=tinysrgb&w=600',
        opening_hours: 'Aberto 24h',
        is_partner: true,
        is_verified: true,
        tags: ['Sauna', 'Bar', 'Cruising', 'Piscina']
    },
    {
        id: 'sp-2',
        name: 'Tunnel Club',
        type: 'club',
        description: 'Balada icônica com pop, eletrônico e shows de drag. Público jovem e diversificado.',
        address: 'R. dos Ingleses, 355 - Morro dos Ingleses, São Paulo',
        lat: -23.5645,
        lng: -46.6522,
        image_url: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=600',
        opening_hours: 'Sex-Sáb 23:00 - 06:00',
        is_partner: false,
        is_verified: true,
        tags: ['Balada', 'Pop', 'Drags']
    },
    {
        id: 'sp-3',
        name: 'Bar Verde',
        type: 'bar',
        description: 'Ponto de encontro pré-balada. Cerveja barata e muita gente na rua.',
        address: 'R. Peixoto Gomide, 145 - Jardim Paulista',
        lat: -23.5589,
        lng: -46.6601,
        image_url: 'https://images.pexels.com/photos/1267325/pexels-photo-1267325.jpeg?auto=compress&cs=tinysrgb&w=600',
        opening_hours: 'Qua-Dom 18:00 - 02:00',
        is_partner: false,
        is_verified: true,
        tags: ['Bar', 'Rua', 'Esquenta']
    },
    {
        id: 'sp-4',
        name: 'Cine Autorama (Cruising)',
        type: 'cruising',
        description: 'Antigo cinema, agora ponto de encontro discreto. Cabines e áreas escuras.',
        address: 'Centro, São Paulo',
        lat: -23.5432,
        lng: -46.6388,
        image_url: 'https://images.pexels.com/photos/2701660/pexels-photo-2701660.jpeg?auto=compress&cs=tinysrgb&w=600',
        opening_hours: 'Seg-Dom 14:00 - 22:00',
        is_partner: true,
        is_verified: true,
        tags: ['Cinema', 'Cruising', 'Discreto']
    },
    {
        id: 'rj-1',
        name: 'Galeria Café',
        type: 'club',
        description: 'No coração de Ipanema. Exposições de arte de dia, festa à noite.',
        address: 'R. Teixeira de Melo, 31 - Ipanema, Rio de Janeiro',
        lat: -22.9845,
        lng: -43.2021,
        image_url: 'https://images.pexels.com/photos/164693/pexels-photo-164693.jpeg?auto=compress&cs=tinysrgb&w=600',
        opening_hours: 'Qui-Sáb 22:00 - 04:00',
        is_partner: true,
        is_verified: true,
        tags: ['Bar', 'Balada', 'Ipanema']
    },
    {
        id: 'rj-2',
        name: 'Posto 9 (Praia)',
        type: 'cruising',
        description: 'O ponto de encontro clássico na praia de Ipanema. Bandeira do arco-íris sempre hasteada.',
        address: 'Av. Vieira Souto - Ipanema, Rio de Janeiro',
        lat: -22.9871,
        lng: -43.2048,
        image_url: 'https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg?auto=compress&cs=tinysrgb&w=600',
        opening_hours: 'Sempre aberto',
        is_partner: false,
        is_verified: true,
        tags: ['Praia', 'Natureza', 'Sungas']
    }
];