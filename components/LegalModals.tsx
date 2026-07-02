
import React from 'react';
import { useTranslation } from 'react-i18next';

export type LegalDocType = 'terms' | 'privacy' | 'guidelines';

interface LegalModalProps {
  type: LegalDocType;
  onClose: () => void;
}

const TermosDeUso = () => {
  const { t } = useTranslation();
  return (
  <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
    <p><strong>{t('legal.terms_last_update', { defaultValue: 'Última atualização: Novembro de 2024' })}</strong></p>
    
    <h3 className="text-white font-bold text-lg mt-4">{t('legal.terms_h1', { defaultValue: '1. Aceitação dos Termos' })}</h3>
    <p>{t('legal.terms_p1', { defaultValue: 'Ao criar uma conta ou utilizar o aplicativo Ponto G ("Serviço"), você concorda em vincular-se a estes Termos de Uso. Se você não aceitar todos os termos, não utilize o Serviço.' })}</p>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.terms_h2', { defaultValue: '2. Elegibilidade' })}</h3>
    <p>{t('legal.terms_p2', { defaultValue: 'Você deve ter pelo menos 18 anos de idade para criar uma conta no Ponto G. Ao utilizar o Serviço, você declara e garante que possui capacidade civil plena.' })}</p>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.terms_h3', { defaultValue: '3. Sua Conta' })}</h3>
    <p>{t('legal.terms_p3', { defaultValue: 'Você é responsável por manter a confidencialidade de suas credenciais de login. Você é o único responsável por todas as atividades que ocorram em sua conta.' })}</p>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.terms_h4', { defaultValue: '4. Regras de Conduta' })}</h3>
    <p>{t('legal.terms_p4', { defaultValue: 'Você concorda em não:' })}</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>{t('legal.terms_li4_1', { defaultValue: 'Utilizar o serviço para fins ilegais ou não autorizados.' })}</li>
      <li>{t('legal.terms_li4_2', { defaultValue: 'Assediar, intimidar ou difamar outros usuários.' })}</li>
      <li>{t('legal.terms_li4_3', { defaultValue: 'Publicar conteúdo que contenha discurso de ódio, racismo, homofobia ou transfobia.' })}</li>
      <li>{t('legal.terms_li4_4', { defaultValue: 'Fazer-se passar por outra pessoa ou entidade.' })}</li>
      <li>{t('legal.terms_li4_5', { defaultValue: 'Utilizar o serviço para spam ou publicidade não solicitada.' })}</li>
    </ul>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.terms_h5', { defaultValue: '5. Conteúdo do Usuário' })}</h3>
    <p>{t('legal.terms_p5', { defaultValue: 'Você mantém os direitos sobre o conteúdo que publica, mas concede ao Ponto G uma licença mundial, não exclusiva e gratuita para usar, exibir e distribuir tal conteúdo no contexto do Serviço.' })}</p>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.terms_h6', { defaultValue: '6. Geolocalização' })}</h3>
    <p>{t('legal.terms_p6', { defaultValue: 'O Ponto G é um serviço baseado em localização. Ao utilizar o app, você consente com a coleta e uso de sua geolocalização para conectar você a outros usuários e locais.' })}</p>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.terms_h7', { defaultValue: '7. Isenção de Responsabilidade' })}</h3>
    <p>{t('legal.terms_p7', { defaultValue: 'O Ponto G não se responsabiliza pela conduta de qualquer usuário dentro ou fora do Serviço. Recomendamos cautela e bom senso em todos os encontros presenciais.' })}</p>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.terms_h8', { defaultValue: '8. Legislação Aplicável' })}</h3>
    <p>{t('legal.terms_p8', { defaultValue: 'Estes termos são regidos pelas leis da República Federativa do Brasil, elegendo-se o foro da comarca de São Paulo/SP para dirimir quaisquer litígios.' })}</p>
  </div>
)};

const PoliticaPrivacidade = () => {
  const { t } = useTranslation();
  return (
  <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
    <p><strong>{t('legal.privacy_intro', { defaultValue: 'Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)' })}</strong></p>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.privacy_h1', { defaultValue: '1. Dados que Coletamos' })}</h3>
    <p>{t('legal.privacy_p1', { defaultValue: 'Para prestar nossos serviços, coletamos:' })}</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>{t('legal.privacy_li1_1_strong', { defaultValue: 'Dados de Cadastro:' })}</strong> {t('legal.privacy_li1_1', { defaultValue: 'Email, data de nascimento, fotos e preferências.' })}</li>
      <li><strong>{t('legal.privacy_li1_2_strong', { defaultValue: 'Dados de Localização:' })}</strong> {t('legal.privacy_li1_2', { defaultValue: 'Coordenadas GPS precisas (quando autorizado) para funcionalidade de mapa e radar.' })}</li>
      <li><strong>{t('legal.privacy_li1_3_strong', { defaultValue: 'Dados de Uso:' })}</strong> {t('legal.privacy_li1_3', { defaultValue: 'Interações, mensagens (criptografadas), winks e visualizações de perfil.' })}</li>
      <li><strong>{t('legal.privacy_li1_4_strong', { defaultValue: 'Dados do Dispositivo:' })}</strong> {t('legal.privacy_li1_4', { defaultValue: 'Modelo, sistema operacional e identificadores únicos para notificações push.' })}</li>
    </ul>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.privacy_h2', { defaultValue: '2. Finalidade do Tratamento' })}</h3>
    <p>{t('legal.privacy_p2', { defaultValue: 'Utilizamos seus dados para:' })}</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>{t('legal.privacy_li2_1', { defaultValue: 'Conectar você a usuários próximos (base legal: execução de contrato).' })}</li>
      <li>{t('legal.privacy_li2_2', { defaultValue: 'Garantir a segurança da plataforma e prevenir fraudes (base legal: legítimo interesse).' })}</li>
      <li>{t('legal.privacy_li2_3', { defaultValue: 'Enviar notificações sobre interações relevantes (base legal: consentimento).' })}</li>
    </ul>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.privacy_h3', { defaultValue: '3. Compartilhamento de Dados' })}</h3>
    <p>{t('legal.privacy_p3', { defaultValue: 'Não vendemos seus dados pessoais. Compartilhamos dados apenas com:' })}</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>{t('legal.privacy_li3_1', { defaultValue: 'Provedores de serviço essenciais (ex: hospedagem em nuvem, processamento de pagamentos).' })}</li>
      <li>{t('legal.privacy_li3_2', { defaultValue: 'Autoridades legais, mediante ordem judicial válida.' })}</li>
    </ul>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.privacy_h4', { defaultValue: '4. Seus Direitos (LGPD)' })}</h3>
    <p>{t('legal.privacy_p4', { defaultValue: 'Você tem direito a:' })}</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>{t('legal.privacy_li4_1', { defaultValue: 'Confirmar a existência de tratamento de dados.' })}</li>
      <li>{t('legal.privacy_li4_2', { defaultValue: 'Acessar seus dados.' })}</li>
      <li>{t('legal.privacy_li4_3', { defaultValue: 'Corrigir dados incompletos ou desatualizados.' })}</li>
      <li>{t('legal.privacy_li4_4', { defaultValue: 'Solicitar a exclusão de seus dados (respeitando prazos legais de retenção como o Marco Civil da Internet).' })}</li>
    </ul>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.privacy_h5', { defaultValue: '5. Segurança' })}</h3>
    <p>{t('legal.privacy_p5', { defaultValue: 'Adotamos medidas técnicas e administrativas aptas a proteger os dados pessoais de acessos não autorizados e de situações acidentais ou ilícitas.' })}</p>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.privacy_h6', { defaultValue: '6. Contato do Encarregado (DPO)' })}</h3>
    <p>{t('legal.privacy_p6', { defaultValue: 'Para exercer seus direitos, entre em contato através do email: privacidade@pontog.app' })}</p>
  </div>
)};

const DiretrizesComunidade = () => {
  const { t } = useTranslation();
  return (
  <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
    <p>{t('legal.guidelines_intro', { defaultValue: 'O Ponto G é um espaço de liberdade, mas também de respeito. Para manter a comunidade segura, siga estas regras:' })}</p>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.guidelines_h1', { defaultValue: '1. Tolerância Zero com Preconceito' })}</h3>
    <p>{t('legal.guidelines_p1', { defaultValue: 'Não toleramos racismo, transfobia, gordofobia, sorofobia ou qualquer forma de discriminação. O Ponto G celebra a diversidade.' })}</p>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.guidelines_h2', { defaultValue: '2. Consentimento é Tudo' })}</h3>
    <p>{t('legal.guidelines_p2', { defaultValue: 'Não é não. Insistência indesejada, envio de fotos íntimas sem solicitação ou assédio resultarão em banimento permanente.' })}</p>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.guidelines_h3', { defaultValue: '3. Fotos de Perfil (Avatar)' })}</h3>
    <p>{t('legal.guidelines_p3', { defaultValue: 'Sua foto de perfil pública (avatar)' })} <strong>{t('legal.guidelines_p3_strong', { defaultValue: 'não pode' })}</strong> {t('legal.guidelines_p3_end', { defaultValue: 'conter:' })}</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>{t('legal.guidelines_li3_1', { defaultValue: 'Nudez explícita ou genitais.' })}</li>
      <li>{t('legal.guidelines_li3_2', { defaultValue: 'Atos sexuais.' })}</li>
      <li>{t('legal.guidelines_li3_3', { defaultValue: 'Crianças ou menores de idade.' })}</li>
      <li>{t('legal.guidelines_li3_4', { defaultValue: 'Drogas ilegais ou violência.' })}</li>
    </ul>
    <p className="text-xs text-slate-500 mt-1">{t('legal.guidelines_p3_note', { defaultValue: 'Conteúdo explícito é permitido apenas em Álbuns Privados ou chats privados, desde que consensual.' })}</p>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.guidelines_h4', { defaultValue: '4. Perfis Falsos' })}</h3>
    <p>{t('legal.guidelines_p4', { defaultValue: 'Não finja ser quem você não é. Perfis "fake" utilizados para enganar (catfishing) ou espionar outros usuários serão removidos.' })}</p>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.guidelines_h5', { defaultValue: '5. Vendas e Promoção' })}</h3>
    <p>{t('legal.guidelines_p5', { defaultValue: 'É proibido usar o Ponto G para venda de drogas, armas ou serviços sexuais (escort/GP é permitido apenas se identificado corretamente no perfil e conforme a legislação local, mas spam comercial é proibido).' })}</p>

    <h3 className="text-white font-bold text-lg mt-4">{t('legal.guidelines_h6', { defaultValue: '6. Denúncias' })}</h3>
    <p>{t('legal.guidelines_p6', { defaultValue: 'Se você vir algo que viole estas regras, utilize a ferramenta de denúncia no perfil do usuário. Nossa equipe analisa todas as denúncias.' })}</p>
  </div>
)};

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  const { t } = useTranslation();
  const getTitle = () => {
    switch (type) {
      case 'terms': return t('legal.terms', { defaultValue: 'Termos de Uso' });
      case 'privacy': return t('legal.privacy', { defaultValue: 'Política de Privacidade' });
      case 'guidelines': return t('legal.guidelines', { defaultValue: 'Diretrizes de Comunidade' });
    }
  };

  const getContent = () => {
    switch (type) {
      case 'terms': return <TermosDeUso />;
      case 'privacy': return <PoliticaPrivacidade />;
      case 'guidelines': return <DiretrizesComunidade />;
    }
  };

  return (
    <div className="fixed inset-0 bg-dark-900/90 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-white/10 relative overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
          <h2 className="text-xl font-bold text-white font-outfit">{getTitle()}</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {getContent()}
        </div>

        <footer className="p-4 border-t border-white/10 bg-slate-800/30 text-center">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-white text-dark-950 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
          >
            {t('common.understood', { defaultValue: 'Entendi' })}
          </button>
        </footer>
      </div>
    </div>
  );
};
