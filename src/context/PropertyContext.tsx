import React, { createContext, useContext, useState, useEffect } from 'react';
import { type Property, api } from '../lib/store';

interface PropertyContextType {
    properties: Property[];
    activePropertyId: string | null;
    setActivePropertyId: (id: string | null) => void;
    activeProperty: Property | null;
    loading: boolean;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProperties = async () => {
            setLoading(true);
            try {
                const data = await api.properties.getAll();
                setProperties(data);

                // Recover active property from localStorage if exists
                const savedId = localStorage.getItem('activePropertyId');
                if (savedId && data.some(p => p.id === savedId)) {
                    setActivePropertyId(savedId);
                }
            } catch (error) {
                console.error('Failed to fetch properties', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, []);

    // Save to local storage whenever it changes
    useEffect(() => {
        if (activePropertyId) {
            localStorage.setItem('activePropertyId', activePropertyId);
        } else {
            localStorage.removeItem('activePropertyId');
        }
    }, [activePropertyId]);

    const activeProperty = properties.find(p => p.id === activePropertyId) || null;

    return (
        <PropertyContext.Provider
            value={{ properties, activePropertyId, setActivePropertyId, activeProperty, loading }}
        >
            {children}
        </PropertyContext.Provider>
    );
};

export const useProperty = () => {
    const context = useContext(PropertyContext);
    if (context === undefined) {
        throw new Error('useProperty must be used within a PropertyProvider');
    }
    return context;
};
