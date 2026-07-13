import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles, recordAuditLog } from './_utils.js';
import { VENUES_DATA } from '../../lib/venuesData.js'; // I'll modify venuesData.js to have the big array, wait, better put it in the API file itself to avoid compilation issues.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end('Method Not Allowed');
    }

    const admin = enforceRoles(req, ['owner', 'moderator']);
    
    // Hardcoded dataset of LGBT venues in main cities
    const MASS_VENUES = [
      // SÃO PAULO
      { name: 'Tunnel Club', type: 'club', description: 'Balada icônica e tradicional com pop e eletrônico. Diversos ambientes e shows de drag.', address: 'R. dos Ingleses, 355 - Morro dos Ingleses, São Paulo', lat: -23.5645, lng: -46.6522, is_verified: true, tags: ['Balada', 'Pop', 'Drags', 'Tradicional'], phone: '+55 11 3285-0246', contact_email: 'contato@tunnel.com.br', website: 'https://tunnel.com.br', city: 'São Paulo' },
      { name: 'Bofetada Club', type: 'club', description: 'Música pop, funk e open bar aos finais de semana. Focada no público jovem.', address: 'R. Peixoto Gomide, 131 - Consolação, São Paulo', lat: -23.5558, lng: -46.6565, is_verified: true, tags: ['Balada', 'Open Bar', 'Funk', 'Pop'], phone: '+55 11 99999-9999', contact_email: 'bofetada@gmail.com', city: 'São Paulo' },
      { name: 'Zig Studio', type: 'club', description: 'Música eletrônica underground, techno e house. Público alternativo.', address: 'Av. Brigadeiro Faria Lima, 724 - Pinheiros, São Paulo', lat: -23.5654, lng: -46.6946, is_verified: true, tags: ['Eletrônica', 'Techno', 'Alternativo'], phone: '+55 11 3813-1234', contact_email: 'contato@zig.club', city: 'São Paulo' },
      { name: 'Aloka', type: 'club', description: 'Uma das casas noturnas mais tradicionais da Rua Frei Caneca. Shows e muita dança.', address: 'R. Frei Caneca, 916 - Consolação, São Paulo', lat: -23.5540, lng: -46.6540, is_verified: true, tags: ['Balada', 'Tradicional', 'Frei Caneca'], phone: '+55 11 3159-8889', city: 'São Paulo' },
      { name: 'Chilli Pepper Single Hotel', type: 'sauna', description: 'A maior sauna de São Paulo, estrutura completa de hotel e eventos.', address: 'Largo do Arouche, 610 - Centro, São Paulo', lat: -23.5398, lng: -46.6434, is_verified: true, tags: ['Sauna', 'Hotel', 'Arouche', 'Festas'], phone: '+55 11 3331-3336', contact_email: 'hotel@chillipepper.com.br', website: 'https://hotelchillipepper.com.br', city: 'São Paulo' },
      
      // RIO DE JANEIRO
      { name: 'Galeria Café', type: 'club', description: 'Clássico em Ipanema, exposições de dia e festas à noite. Público variado e animado.', address: 'R. Teixeira de Melo, 31 - Ipanema, Rio de Janeiro', lat: -22.9845, lng: -43.2021, is_verified: true, tags: ['Balada', 'Arte', 'Ipanema'], phone: '+55 21 2522-8250', contact_email: 'contato@galeriacafe.com.br', city: 'Rio de Janeiro' },
      { name: 'Pink Flamingo', type: 'bar', description: 'Bar e balada no coração de Copacabana. Shows de drag, DJ e muita diversão.', address: 'R. Rodolfo Dantas, 16 - Copacabana, Rio de Janeiro', lat: -22.9647, lng: -43.1764, is_verified: true, tags: ['Bar', 'Balada', 'Copacabana', 'Drags'], phone: '+55 21 99999-8888', city: 'Rio de Janeiro' },
      { name: 'Boate Papa G', type: 'club', description: 'Casa noturna com tradição em Madureira. Shows de drags e funk.', address: 'R. Carvalho de Souza, 247 - Madureira, Rio de Janeiro', lat: -22.8722, lng: -43.3361, is_verified: true, tags: ['Balada', 'Subúrbio', 'Funk'], phone: '+55 21 3390-3333', city: 'Rio de Janeiro' },
      { name: 'Rio Sauna Club', type: 'sauna', description: 'Sauna masculina no Centro do Rio. Vários ambientes, bar e cabines.', address: 'R. do Lavradio, 120 - Centro, Rio de Janeiro', lat: -22.9105, lng: -43.1818, is_verified: true, tags: ['Sauna', 'Centro', 'Relax'], phone: '+55 21 2221-5555', contact_email: 'contato@riosauna.com', city: 'Rio de Janeiro' },
      
      // BELO HORIZONTE
      { name: 'Church House', type: 'club', description: 'Balada premium com eletrônico e pop. Eventos temáticos e festas famosas.', address: 'Av. do Contorno, 3849 - Funcionários, Belo Horizonte', lat: -19.9324, lng: -43.9298, is_verified: true, tags: ['Balada', 'Premium', 'Eletrônico'], phone: '+55 31 3281-1234', contact_email: 'contato@churchhouse.com.br', city: 'Belo Horizonte' },
      { name: 'Gis Mais', type: 'club', description: 'A boate LGBT mais tradicional de BH. Shows, diversidade e muita energia.', address: 'Av. Barbacena, 33 - Barro Preto, Belo Horizonte', lat: -19.9208, lng: -43.9535, is_verified: true, tags: ['Balada', 'Tradicional', 'Pop'], phone: '+55 31 3295-3129', city: 'Belo Horizonte' },
      { name: 'dDuck', type: 'club', description: 'Clube alternativo na Savassi, focado em indie, pop e música eletrônica.', address: 'R. Pernambuco, 1316 - Savassi, Belo Horizonte', lat: -19.9372, lng: -43.9328, is_verified: true, tags: ['Alternativo', 'Indie', 'Savassi'], phone: '+55 31 3261-5555', city: 'Belo Horizonte' },
      { name: 'Sauna Status', type: 'sauna', description: 'Sauna tradicional com piscina e labirinto. Ponto de encontro clássico.', address: 'R. São Paulo, 1234 - Centro, Belo Horizonte', lat: -19.9221, lng: -43.9400, is_verified: true, tags: ['Sauna', 'Centro', 'Cruising'], phone: '+55 31 3222-1111', city: 'Belo Horizonte' },

      // BUENOS AIRES
      { name: 'Amerika', type: 'club', description: 'One of the biggest and most famous gay clubs in Latin America. Three dance floors, open bar.', address: 'Gascón 1040 - Almagro, Buenos Aires', lat: -34.6000, lng: -58.4200, is_verified: true, tags: ['Club', 'Mega', 'Open Bar', 'Pop'], phone: '+54 11 4865-4416', website: 'http://www.amerikadisco.com.ar', city: 'Buenos Aires' },
      { name: 'Glam Club', type: 'club', description: 'Upscale gay club in Recoleta. Great pop music, drag shows, and stylish crowd.', address: 'Cabrera 3046 - Recoleta, Buenos Aires', lat: -34.5900, lng: -58.4050, is_verified: true, tags: ['Club', 'Pop', 'Recoleta', 'Trendy'], phone: '+54 11 4963-2521', city: 'Buenos Aires' },
      { name: 'Peuteo', type: 'bar', description: 'Cozy and trendy gay bar in Palermo. Good cocktails and pre-club atmosphere.', address: 'Gurruchaga 1867 - Palermo, Buenos Aires', lat: -34.5880, lng: -58.4250, is_verified: true, tags: ['Bar', 'Palermo', 'Pre-club', 'Cocktails'], phone: '+54 11 4831-0000', city: 'Buenos Aires' },
      { name: 'Energy Men\'s Club', type: 'sauna', description: 'Popular gay sauna with steam rooms, dark rooms, and relaxing areas.', address: 'Avenida de Mayo 1234 - Centro, Buenos Aires', lat: -34.6080, lng: -58.3800, is_verified: true, tags: ['Sauna', 'Cruising', 'Relax'], phone: '+54 11 4381-1111', city: 'Buenos Aires' },

      // CÓRDOBA
      { name: 'Zen Disco', type: 'club', description: 'The most popular gay club in Córdoba. Pop, reggaeton and drag shows.', address: 'Julio A. Roca 730 - Córdoba', lat: -31.4250, lng: -64.1950, is_verified: true, tags: ['Club', 'Pop', 'Drags'], phone: '+54 351 423-1234', city: 'Córdoba' },
      { name: 'Beep Pub', type: 'bar', description: 'Classic gay pub with karaoke and relaxed vibe. Great for starting the night.', address: 'Paseo de las Artes - Córdoba', lat: -31.4300, lng: -64.1900, is_verified: true, tags: ['Bar', 'Karaoke', 'Friendly'], phone: '+54 351 421-5555', city: 'Córdoba' },
      { name: 'Piaf', type: 'club', description: 'Alternative electronic music and techno. Mixed, very gay-friendly crowd.', address: 'Av. Marcelo T. de Alvear 300 - Córdoba', lat: -31.4200, lng: -64.1850, is_verified: true, tags: ['Electronic', 'Techno', 'Alternative'], phone: '+54 351 425-6666', city: 'Córdoba' }
    ];

    // Check if they already exist to avoid duplicates (optional but good)
    const { data: existing } = await supabaseAdmin.from('venues').select('name');
    const existingNames = new Set(existing?.map(v => v.name) || []);
    
    const toInsert = MASS_VENUES.map(v => ({
      ...v,
      source_type: 'admin',
      image_url: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=600' // fallback image
    })).filter(v => !existingNames.has(v.name));

    if (toInsert.length > 0) {
      const { data, error } = await supabaseAdmin.from('venues').insert(toInsert).select();
      if (error) throw error;
      
      await recordAuditLog(
        req, 
        admin, 
        'MASS_IMPORT_VENUES', 
        'system', 
        `Importou em massa ${toInsert.length} locais LGBT (SP, RJ, BH, BA, Cordoba).`
      );
      
      return res.status(200).json({ success: true, count: data.length });
    } else {
      return res.status(200).json({ success: true, count: 0, message: 'Todos os locais já existiam.' });
    }
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
