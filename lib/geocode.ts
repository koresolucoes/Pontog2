export const reverseGeocode = async (lat: number, lng: number): Promise<{city: string, state: string}> => {
    try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`);
        const data = await response.json();
        return {
            city: data.city || data.locality || 'Desconhecida',
            state: data.principalSubdivision || 'SP'
        };
    } catch (error) {
        console.error("Error reverse geocoding:", error);
        return { city: 'Desconhecida', state: '' };
    }
};
