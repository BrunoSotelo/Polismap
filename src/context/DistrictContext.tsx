
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface DistrictContextType {
    selectedDistrict: number | null;
    setSelectedDistrict: (id: number) => void;
}

const DistrictContext = createContext<DistrictContextType | undefined>(undefined);

export const DistrictProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { assignedDistricts } = useAuth();
    const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);

    useEffect(() => {
        // Auto-select if user has only 1 district
        if (assignedDistricts.length === 1) {
            setSelectedDistrict(assignedDistricts[0]);
        } else if (assignedDistricts.length > 0 && !selectedDistrict) {
            // If multiple, maybe select first by default or wait for user? 
            // Let's select first by default to avoid empty state
            setSelectedDistrict(assignedDistricts[0]);
        }
    }, [assignedDistricts]);

    return (
        <DistrictContext.Provider value={{ selectedDistrict, setSelectedDistrict }}>
            {children}
        </DistrictContext.Provider>
    );
};

export const useDistrict = () => {
    const context = useContext(DistrictContext);
    if (context === undefined) {
        throw new Error('useDistrict must be used within a DistrictProvider');
    }
    return context;
};
