
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface AddressResult {
    display_name: string;
    lat: string;
    lon: string;
}

interface AddressAutocompleteProps {
    onSelect: (address: string, lat: number, lng: number) => void;
    initialValue?: string;
    placeholder?: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ onSelect, initialValue = '', placeholder }) => {
    const { t } = useTranslation();
    const [query, setQuery] = useState(initialValue);
    const [results, setResults] = useState<AddressResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce logic para não chamar a API a cada tecla
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length > 3 && isOpen) {
                setIsLoading(true);
                try {
                    // Usando Nominatim do OpenStreetMap (Gratuito)
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
                    );
                    const data = await response.json();
                    setResults(data);
                } catch (error) {
                    console.error("Erro na busca de endereço:", error);
                } finally {
                    setIsLoading(false);
                }
            } else if (query.length <= 3) {
                setResults([]);
            }
        }, 800); // 800ms delay

        return () => clearTimeout(timer);
    }, [query, isOpen]);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (result: AddressResult) => {
        // Limpa o nome para ficar mais curto (remove CEP e País se quiser, aqui deixamos completo)
        const formattedAddress = result.display_name; 
        setQuery(formattedAddress);
        setResults([]);
        setIsOpen(false);
        
        // Callback para o componente pai
        onSelect(formattedAddress, parseFloat(result.lat), parseFloat(result.lon));
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    placeholder={placeholder || t('profile.search_address_placeholder', { defaultValue: 'Busque um endereço...' })}
                    className="w-full bg-slate-800 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-sm shadow-sm"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    {isLoading ? (
                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <span className="material-symbols-rounded text-lg">search</span>
                    )}
                </div>
            </div>

            {isOpen && results.length > 0 && (
                <ul className="absolute z-[100] left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-white/5 animate-fade-in">
                    {results.map((result, index) => (
                        <li 
                            key={index}
                            onClick={() => handleSelect(result)}
                            className="p-3 hover:bg-white/5 cursor-pointer transition-colors text-sm text-slate-200 flex items-start gap-2"
                        >
                            <span className="material-symbols-rounded text-primary-500 text-lg mt-0.5">location_on</span>
                            <span>{result.display_name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
