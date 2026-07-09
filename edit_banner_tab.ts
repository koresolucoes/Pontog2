import fs from 'fs';
let code = fs.readFileSync('pages/Owner/views/OwnerMarketingView.tsx', 'utf8');

const bannerContent = `
                {/* 🎨 5. BANNER PROMOCIONAL */}
                {activeSubTab === 'banner' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Formulário */}
                        <div className="space-y-6">
                            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Image className="text-primary-500 w-5 h-5" />
                                        Criar Banner Promocional
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Configure a arte e o texto que aparecerão para os usuários no topo do Feed de novidades.</p>
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400">Título do Banner</label>
                                        <input 
                                            type="text" 
                                            value={campaignTitle}
                                            onChange={(e) => setCampaignTitle(e.target.value)}
                                            placeholder="Ex: Sexta VIP Promocional"
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary-500 text-white"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400">Texto Chamativo (Copy)</label>
                                        <textarea 
                                            value={campaignMessage}
                                            onChange={(e) => setCampaignMessage(e.target.value)}
                                            placeholder="Ex: Compre 1 drink e ganhe outro até a meia noite..."
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-primary-500 text-white h-24 resize-none"
                                        ></textarea>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400">Imagem do Banner</label>
                                        <div className="flex items-center gap-3">
                                            {campaignImageUrl && (
                                                <img src={campaignImageUrl} alt="preview" className="w-16 h-16 rounded-lg object-cover" />
                                            )}
                                            <div className="flex-1 bg-slate-950 border border-white/10 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-900 transition-colors relative">
                                                {isUploadingImage ? (
                                                    <span className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></span>
                                                ) : (
                                                    <Upload className="w-4 h-4 text-slate-400" />
                                                )}
                                                <span className="text-sm font-medium">
                                                    {isUploadingImage ? "Enviando..." : "Anexar Imagem"}
                                                </span>
                                                <input 
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={async () => {
                                        if (!selectedVenueId) return toast.error("Selecione um local.");
                                        if (!campaignTitle || !campaignMessage) return toast.error("Preencha título e mensagem.");
                                        const pushCost = 25.00;
                                        if (adBalance < pushCost) return toast.error("Saldo insuficiente.");
                                        const toastId = toast.loading("Publicando banner...");
                                        try {
                                            const { error } = await supabase.from('b2b_campaigns').insert({
                                                venue_id: selectedVenueId,
                                                title: campaignTitle,
                                                message: campaignMessage,
                                                target_tribe: 'Geral',
                                                range_meters: 0,
                                                estimated_reach: 0,
                                                cost: pushCost,
                                                image_url: campaignImageUrl || null,
                                                status: 'approved',
                                                placement: 'feed',
                                                duration_hours: 24
                                            });
                                            if (error) throw error;
                                            await supabase.from('b2b_wallets').update({ balance: adBalance - pushCost }).eq('id', walletId);
                                            toast.success("Banner publicado com sucesso!", { id: toastId });
                                            window.location.reload();
                                        } catch (err: any) {
                                            toast.error(err.message, { id: toastId });
                                        }
                                    }}
                                    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all"
                                >
                                    Publicar Banner (R$ 25,00)
                                </button>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="space-y-6">
                            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-xl space-y-6 sticky top-24">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Eye className="text-slate-400 w-4 h-4" />
                                        Preview em Tempo Real
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Como seu banner aparecerá no Feed.</p>
                                </div>
                                
                                {/* Banner Card Preview */}
                                <div className="relative aspect-[3/1] cursor-pointer group overflow-hidden bg-slate-900 rounded-2xl border border-white/10 ring-1 ring-primary-500/50">
                                    <img 
                                        src={campaignImageUrl || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600'} 
                                        alt="preview" 
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent flex flex-col justify-center p-6">
                                        <div className="w-full max-w-[80%]">
                                            <span className="bg-slate-900/70 text-slate-300 text-[9px] font-bold px-2 py-0.5 rounded-md mb-2 inline-block shadow-sm">
                                                Patrocinado
                                            </span>
                                            <h3 className="font-bold text-xl text-white drop-shadow-lg leading-tight mb-1">
                                                {campaignTitle || 'Título do seu Banner'}
                                            </h3>
                                            <p className="text-xs text-slate-200 drop-shadow-lg line-clamp-2 leading-relaxed">
                                                {campaignMessage || 'Escreva uma mensagem chamativa para atrair clientes para o seu negócio.'}
                                            </p>
                                            <button className="mt-4 bg-primary-600 text-white font-bold py-2 px-5 rounded-xl text-xs shadow-lg shadow-primary-900/30">
                                                Saiba Mais
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
`;

code = code.replace(
    /\{\/\*\s*📊\s*3\.\s*ANALYTICS & FUNIL O2O\s*\*\/\}/,
    bannerContent + '\n                {/* 📊 3. ANALYTICS & FUNIL O2O */}'
);

fs.writeFileSync('pages/Owner/views/OwnerMarketingView.tsx', code);
