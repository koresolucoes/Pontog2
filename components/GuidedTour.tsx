import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from 'react-i18next';

export const GuidedTour: React.FC = () => {
    const { t } = useTranslation();
    const { user, finishTour } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const TOUR_STEPS = [
        {
            title: t('tour.step1_title', { defaultValue: 'Bem-vindo ao Ponto G! 🎉' }),
            description: t('tour.step1_desc', { defaultValue: 'Vamos fazer um tour rápido para te mostrar como encontrar caras por perto, mandar winks, e organizar seus chats.' }),
            icon: "waving_hand"
        },
        {
            title: t('tour.step2_title', { defaultValue: 'O Mapa 📍' }),
            description: t('tour.step2_desc', { defaultValue: 'Veja quem está perto de você. O mapa é o coração do app e atualiza em tempo real. Você pode alternar para o modo Lista (Grid) se preferir.' }),
            icon: "map"
        },
        {
            title: t('tour.step3_title', { defaultValue: 'Seu Inbox 💬' }),
            description: t('tour.step3_desc', { defaultValue: 'Aqui ficam seus chats, quem te enviou um Wink, pedidos de álbuns, favoritos e quem visitou seu perfil.' }),
            icon: "chat_bubble"
        },
        {
            title: t('tour.step4_title', { defaultValue: 'Seu Perfil 👤' }),
            description: t('tour.step4_desc', { defaultValue: 'Atualize suas fotos, gerencie seus álbuns privados e ganhe o selo de verificado para ganhar destaque!' }),
            icon: "person"
        },
        {
            title: t('tour.step5_title', { defaultValue: 'Menu Principal ☰' }),
            description: t('tour.step5_desc', { defaultValue: 'Aqui você acessa o Ponto G Plus, Notícias e outras configurações. Divirta-se!' }),
            icon: "menu"
        }
    ];

    useEffect(() => {
        // Run tour only if user has finished onboarding and hasn't seen the tour yet
        if (user && user.has_completed_onboarding && !user.has_seen_tour) {
            setIsOpen(true);
        }
    }, [user]);

    if (!isOpen || !user || user.has_seen_tour) return null;

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        finishTour();
    };

    const step = TOUR_STEPS[currentStep];

    return (
        <div className="fixed inset-0 bg-dark-900/90 backdrop-blur-sm flex items-center justify-center z-[100000] p-4 animate-fade-in">
            <div 
                className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center border border-white/10 relative overflow-hidden"
            >
                {/* Decorative background element */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-secondary-600"></div>

                <div className="absolute top-4 right-4 z-10">
                    <button 
                        onClick={handleClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="min-h-[220px] flex flex-col items-center justify-center"
                    >
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-primary-500/10 mb-6 border border-primary-500/20">
                            <span className="material-symbols-rounded text-4xl text-primary-500 filled">{step.icon}</span>
                        </div>
                        
                        <h3 className="text-2xl font-bold text-white mb-3 font-outfit">{step.title}</h3>
                        
                        <p className="text-slate-300 leading-relaxed text-sm">
                            {step.description}
                        </p>
                    </motion.div>
                </AnimatePresence>

                {/* Progress Indicators */}
                <div className="flex justify-center gap-2 mb-8 mt-4">
                    {TOUR_STEPS.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`h-2 rounded-full transition-all duration-300 ${
                                idx === currentStep ? 'w-6 bg-primary-500' : 'w-2 bg-slate-600'
                            }`}
                        />
                    ))}
                </div>
                
                <div className="flex gap-3">
                    {currentStep > 0 && (
                        <button
                            type="button"
                            className="flex-1 justify-center rounded-xl px-4 py-3 bg-slate-700 text-sm font-bold text-slate-200 hover:bg-slate-600 hover:text-white transition-colors border border-white/5"
                            onClick={handleBack}
                        >
                            {t('tour.previous', { defaultValue: 'Anterior' })}
                        </button>
                    )}
                    <button
                        type="button"
                        className="flex-1 justify-center rounded-xl px-4 py-3 bg-primary-600 text-sm font-bold text-white hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-900/30 transition-all"
                        onClick={handleNext}
                    >
                        {currentStep === TOUR_STEPS.length - 1 ? t('tour.finish', { defaultValue: 'Terminar' }) : t('tour.next', { defaultValue: 'Próximo' })}
                    </button>
                </div>
            </div>
        </div>
    );
};

