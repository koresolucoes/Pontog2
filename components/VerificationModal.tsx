import React, { useRef, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import * as faceapi from 'face-api.js';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

interface VerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const { user, fetchProfile } = useAuthStore();

    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            return;
        }

        const loadModels = async () => {
            try {
                const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
                ]);
                setIsModelsLoaded(true);
                startCamera();
            } catch (error) {
                console.error("Erro ao carregar modelos:", error);
                toast.error(t('verification.load_error', { defaultValue: 'Erro ao carregar sistema de verificação.' }));
            }
        };

        loadModels();

        return () => {
            stopCamera();
        };
    }, [isOpen]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraActive(true);
            }
        } catch (error) {
            console.error("Erro ao acessar câmera:", error);
            toast.error(t('verification.camera_error', { defaultValue: 'Permissão de câmera negada ou indisponível.' }));
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    };

    const handleVerify = async () => {
        if (!videoRef.current || !isModelsLoaded || !user) return;

        setIsVerifying(true);
        toast.loading(t('verification.analyzing', { defaultValue: 'Analisando rosto e idade...' }), { id: 'verify' });

        try {
            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withAgeAndGender();

            if (!detection) {
                toast.error(t('verification.no_face', { defaultValue: 'Nenhum rosto detectado. Posicione-se melhor.' }), { id: 'verify' });
                setIsVerifying(false);
                return;
            }

            const age = Math.round(detection.age);
            
            if (age < 18) {
                toast.error(t('verification.age_failed', { defaultValue: 'Idade estimada ({{age}} anos) é menor que 18. Verificação falhou.', age }), { id: 'verify' });
                setIsVerifying(false);
                return;
            }

            // Success - updating user profile
            const { error } = await supabase
                .from('profiles')
                .update({ is_verified: true })
                .eq('id', user.id);

            if (error) throw error;

            await fetchProfile(user);
            toast.success(t('verification.success', { defaultValue: 'Verificação concluída! Você ganhou o selo de verificado.' }), { id: 'verify' });
            onClose();

        } catch (error) {
            console.error("Erro na verificação:", error);
            toast.error(t('verification.process_error', { defaultValue: 'Erro ao processar verificação.' }), { id: 'verify' });
        } finally {
            setIsVerifying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-dark-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 text-center border-b border-white/10 relative">
                    <button 
                        onClick={onClose}
                        className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-rounded">close</span>
                    </button>
                    <div className="w-16 h-16 bg-primary-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-rounded text-primary-500 text-3xl">verified</span>
                    </div>
                    <h2 className="text-2xl font-outfit font-bold text-white mb-2">{t('verification.title', { defaultValue: 'Verificação de Perfil' })}</h2>
                    <p className="text-sm text-slate-400">
                        {t('verification.subtitle', { defaultValue: 'Para ganhar o selo de verificado, precisamos confirmar que você é uma pessoa real e maior de idade. Posicione seu rosto no centro da câmera.' })}
                    </p>
                </div>
                
                <div className="p-6 flex flex-col items-center">
                    <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-slate-800 mb-6 bg-dark-950 flex items-center justify-center">
                        {!isModelsLoaded ? (
                            <div className="flex flex-col items-center text-slate-500">
                                <span className="material-symbols-rounded animate-spin text-4xl mb-2">progress_activity</span>
                                <span className="text-xs">{t('verification.loading_ai', { defaultValue: 'Carregando IA...' })}</span>
                            </div>
                        ) : !cameraActive ? (
                            <div className="flex flex-col items-center text-slate-500">
                                <span className="material-symbols-rounded text-4xl mb-2">videocam_off</span>
                                <span className="text-xs">{t('verification.camera_unavailable', { defaultValue: 'Câmera indisponível' })}</span>
                            </div>
                        ) : null}
                        <video 
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${(!isModelsLoaded || !cameraActive) ? 'hidden' : ''}`}
                        />
                        {/* Overlay frame */}
                        <div className="absolute inset-0 border-4 border-dashed border-primary-500/50 rounded-full pointer-events-none z-10" />
                    </div>

                    <button
                        onClick={handleVerify}
                        disabled={!isModelsLoaded || !cameraActive || isVerifying}
                        className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {isVerifying ? (
                            <>
                                <span className="material-symbols-rounded animate-spin">progress_activity</span>
                                {t('verification.analyzing_btn', { defaultValue: 'Analisando...' })}
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-rounded">face</span>
                                {t('verification.verify_now', { defaultValue: 'Verificar Agora' })}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
