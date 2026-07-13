import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles, recordAuditLog } from './_utils.js';

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
    
    // Obter um usuário válido na tabela de perfis para ser o "criador/autor"
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id').limit(1);
    if (!profiles || profiles.length === 0) {
      return res.status(400).json({ error: 'Nenhum perfil de usuário encontrado para ser o autor das comunidades.' });
    }
    const defaultUserId = profiles[0].id;

    const COMMUNITIES = [
      { name: 'Cultura Pop & Divas', description: 'Espaço para debater sobre as maiores divas do pop, lançamentos e charts.', is_private: false },
      { name: 'Rolês em SP', description: 'Onde estão as melhores festas e afters de São Paulo? Compartilhe aqui.', is_private: false },
      { name: 'Drag Race Brasil', description: 'Discussões sobre os episódios, looks e lip syncs de Rupaul\'s Drag Race.', is_private: false },
      { name: 'Orgulho Gamer', description: 'Comunidade focada em gamers LGBTQIAPN+. Encontre duo e amigos.', is_private: false },
      { name: 'Cinema & Séries', description: 'Indicações de filmes, séries e documentários com temática queer.', is_private: false },
      { name: 'Saúde & Bem-estar', description: 'Troca de informações, academia, dicas de autocuidado e saúde.', is_private: false },
      { name: 'Memes & Humor', description: 'Apenas os melhores memes da internet. Proibido não rir.', is_private: false },
      { name: 'Amizades RJ', description: 'Grupo para marcar encontros, idas à praia e barzinhos no Rio de Janeiro.', is_private: false },
      { name: 'Empreendedores LGBT', description: 'Divulgue seu trabalho e faça networking com outros profissionais da comunidade.', is_private: false },
      { name: 'Dicas de Viagem', description: 'Relatos e roteiros para os destinos mais gay-friendly do Brasil e do mundo.', is_private: false },
    ];

    const POSTS_PER_COMMUNITY = [
      { content: 'Qual o melhor evento que vocês já foram este ano?' },
      { content: 'Alguém tem indicação boa para este final de semana?' },
      { content: 'Só passando para desejar um ótimo dia a todos da comunidade! 🌈' }
    ];

    const COMMENTS_PER_POST = [
      { content: 'Eu amei demais, quero ir de novo!' },
      { content: 'Com certeza foi inesquecível.' },
      { content: 'Não concordo muito, mas respeito a opinião.' }
    ];

    // Verificar se já foram criadas para evitar duplicatas pelo nome
    const { data: existing } = await supabaseAdmin.from('communities').select('name');
    const existingNames = new Set(existing?.map(c => c.name) || []);
    
    const toInsert = COMMUNITIES.map(c => ({
      ...c,
      creator_id: defaultUserId,
      tags: ['geral']
    })).filter(c => !existingNames.has(c.name));

    if (toInsert.length > 0) {
      // Inserir Comunidades
      const { data: insertedCommunities, error: commError } = await supabaseAdmin
        .from('communities')
        .insert(toInsert)
        .select();
        
      if (commError) throw commError;
      
      let postsCount = 0;
      let commentsCount = 0;

      // Inserir membros (o criador), posts e comentários para cada comunidade
      for (const community of insertedCommunities) {
        // Criador vira membro admin
        await supabaseAdmin.from('community_members').insert({
          community_id: community.id,
          user_id: defaultUserId,
          role: 'admin'
        });

        // Inserir tópicos (Posts)
        for (const postTpl of POSTS_PER_COMMUNITY) {
          const { data: insertedPost, error: postError } = await supabaseAdmin
            .from('community_posts')
            .insert({
              community_id: community.id,
              author_id: defaultUserId,
              content: postTpl.content
            })
            .select()
            .single();

          if (!postError && insertedPost) {
            postsCount++;
            
            // Inserir comentários para cada post
            for (const commentTpl of COMMENTS_PER_POST) {
              const { error: commentError } = await supabaseAdmin
                .from('community_comments')
                .insert({
                  post_id: insertedPost.id,
                  author_id: defaultUserId,
                  content: commentTpl.content
                });
              if (!commentError) commentsCount++;
            }
          }
        }
      }
      
      await recordAuditLog(
        req, 
        admin, 
        'MASS_IMPORT_COMMUNITIES', 
        'system', 
        `Importou em massa ${insertedCommunities.length} comunidades, ${postsCount} posts e ${commentsCount} comentários.`
      );
      
      return res.status(200).json({ 
        success: true, 
        message: `Importação concluída. ${insertedCommunities.length} comunidades, ${postsCount} posts e ${commentsCount} comentários criados.` 
      });
    } else {
      return res.status(200).json({ success: true, count: 0, message: 'Todas as comunidades padrão já existiam.' });
    }
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
