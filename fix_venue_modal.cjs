const fs = require('fs');
let code = fs.readFileSync('pages/Admin/views/VenuesView.tsx', 'utf8');

const replacement = `
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase ml-1">Descrição</label>
                            <textarea name="description" rows={3} value={formData.description || ''} onChange={handleChange} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Telefone (Exibição)</label>
                                <input name="phone" value={formData.phone || ''} onChange={handleChange} placeholder="(XX) 99999-9999" className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Website / Instagram</label>
                                <input name="website" value={formData.website || ''} onChange={handleChange} placeholder="https://..." className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-yellow-500/80 uppercase ml-1">Contato B2B (Email)</label>
                                <input name="contact_email" value={formData.contact_email || ''} onChange={handleChange} placeholder="dono@local.com" className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-yellow-500/80 uppercase ml-1">Contato B2B (Telefone)</label>
                                <input name="contact_phone" value={formData.contact_phone || ''} onChange={handleChange} placeholder="Telefone do Dono" className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50" />
                            </div>
                        </div>
`;

code = code.replace(/<div>\s*<label className="text-xs font-bold text-slate-400 uppercase ml-1">Descrição<\/label>\s*<textarea name="description"[^>]*><\/textarea>\s*<\/div>/, replacement);

fs.writeFileSync('pages/Admin/views/VenuesView.tsx', code);
