import { v4 as uuidv4 } from 'uuid';
// --- TYPES ---
export interface Owner {
    id: string;
    fullName: string;
    documentId: string;
    phone: string;
    email: string;
    address: string;
    signatureUrl?: string; // Nuevo campo para firma digitalizada
    commissionPercentage?: number; // Fase 15
    role?: 'owner' | 'admin';
}

export interface Property {
    id: string;
    owner_id: string;
    name: string;
    unitCount?: number;
}

export interface Unit {
    id: string;
    property_id: string; // Foreign key
    name: string; // e.g., "1A", "1B"
    type: 'Departamento' | 'Local' | 'Cochera';
    rooms: number;
    sqm: number;
    extras: string;
    status: 'occupied' | 'available' | 'maintenance';
}
export interface Tenant {
    id: string;
    unit_id: string;
    firstName: string;
    lastName: string;
    documentId?: string;
    address?: string;
    city?: string;
    province?: string;
    phone: string;
    email: string;
    rent_amount: number;
    contractStart?: string; // ISO string
    contractEnd?: string; // ISO string
    depositAmount?: number;
    adjustmentFrequency?: string;
    guarantors?: {
        firstName: string;
        lastName: string;
        documentId: string;
        phone: string;
        email?: string;
        address: string;
        city?: string;
        province?: string;
    }[];
}

export interface MaintenanceEvent {
    id: string;
    unit_id: string;
    date: string;
    description: string;
    action: string;
    status: 'open' | 'closed';
    cost: number;
}

export interface Payment {
    id: string;
    tenant_id: string;
    owner_id?: string;
    amount: number;
    date: string; // ISO string (Fecha real de pago)
    periodDate?: string; // ISO string (Mes/Año al que se imputa el pago)
    periodDates?: string[]; // Arrays of ISO strings
    concept: string;
    paymentMethod?: 'Efectivo' | 'Transferencia Bancaria';
    bankDetails?: {
        cbuAlias?: string;
        receiptUrl?: string; // Optional URL or base64
    };
    rentAmount?: number; // Fase 18 desglose
    tasasAmount?: number; // Fase 18 desglose
    expensasAmount?: number; // Fase 18 desglose
    otrosAmount?: number; // Fase 18 desglose
    adminFee?: number; // Fase 15
    ownerBalance?: number; // Fase 15
    signed_by?: string; // Owner ID UUID for signature
}

export interface AppUser {
    id: string;
    email: string;
    fullName: string;
    role: 'admin' | 'colab';
}



export const initialUsers: AppUser[] = [
    { id: 'u1', email: 'admin@gdneuquen.com', fullName: 'Carlos Administrador', role: 'admin' },
    { id: 'u2', email: 'colab@gdneuquen.com', fullName: 'Asistente GD', role: 'colab' }
];

// --- SUPABASE API & MIGRATION ---
import { supabase } from './supabase';

export const migrateLocalStorageToSupabase = async () => {
    try {
        const keys = ['app_owners', 'app_properties', 'app_units', 'app_tenants', 'app_events', 'app_payments'];
        const tables = ['owners', 'properties', 'units', 'tenants', 'events', 'payments'];

        let migratedAny = false;
        for (let i = 0; i < keys.length; i++) {
            const data = localStorage.getItem(keys[i]);
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    console.log(`Migrando ${parsed.length} registros de ${keys[i]} a Supabase (${tables[i]})...`);
                    const { error } = await supabase.from(tables[i]).upsert(parsed);
                    if (error) {
                        console.error(`Error migrando ${keys[i]}:`, error);
                    } else {
                        localStorage.removeItem(keys[i]);
                        migratedAny = true;
                    }
                } else {
                    localStorage.removeItem(keys[i]);
                }
            }
        }
        if (migratedAny) {
            console.log('Migración de LocalStorage a Supabase completada.');
        }
    } catch (err) {
        console.error('Error durante la migración de LocalStorage a Supabase:', err);
    }
};

export const api = {
    owners: {
        async getAll(): Promise<Owner[]> {
            const { data, error } = await supabase.from('owners').select('*');
            if (error) throw error;
            return data as Owner[];
        },
        async create(owner: Omit<Owner, 'id'>): Promise<Owner> {
            const newOwner = { ...owner, id: uuidv4() };
            const { data, error } = await supabase.from('owners').insert([newOwner]).select().single();
            if (error) throw error;
            return data as Owner;
        },
        async update(id: string, updates: Partial<Owner>): Promise<Owner> {
            const { data, error } = await supabase.from('owners').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data as Owner;
        },
        async delete(id: string): Promise<void> {
            const { error } = await supabase.from('owners').delete().eq('id', id);
            if (error) throw error;
        }
    },
    properties: {
        async getAll(): Promise<Property[]> {
            const { data, error } = await supabase.from('properties').select('*');
            if (error) throw error;
            return data as Property[];
        },
        async create(property: Omit<Property, 'id'>): Promise<Property> {
            const newProperty = { ...property, id: uuidv4() };
            const { data, error } = await supabase.from('properties').insert([newProperty]).select().single();
            if (error) throw error;
            return data as Property;
        },
        async update(id: string, updates: Partial<Property>): Promise<Property> {
            const { data, error } = await supabase.from('properties').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data as Property;
        },
        async delete(id: string): Promise<void> {
            const { error } = await supabase.from('properties').delete().eq('id', id);
            if (error) throw error;
        }
    },
    units: {
        async getAll(): Promise<Unit[]> {
            const { data, error } = await supabase.from('units').select('*');
            if (error) throw error;
            return data as Unit[];
        },
        async create(unit: Omit<Unit, 'id'>): Promise<Unit> {
            const newUnit = { ...unit, id: uuidv4() };
            const { data, error } = await supabase.from('units').insert([newUnit]).select().single();
            if (error) throw error;
            return data as Unit;
        },
        async update(id: string, updates: Partial<Unit>): Promise<Unit> {
            const { data, error } = await supabase.from('units').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data as Unit;
        },
        async delete(id: string): Promise<void> {
            const { error } = await supabase.from('units').delete().eq('id', id);
            if (error) throw error;
        }
    },
    tenants: {
        async getAll(): Promise<Tenant[]> {
            const { data, error } = await supabase.from('tenants').select('*');
            if (error) throw error;
            return data as Tenant[];
        },
        async create(tenant: Omit<Tenant, 'id'>): Promise<Tenant> {
            const newTenant = { ...tenant, id: uuidv4() };
            const { data, error } = await supabase.from('tenants').insert([newTenant]).select().single();
            if (error) throw error;

            await supabase.from('units').update({ status: 'occupied' }).eq('id', newTenant.unit_id);
            return data as Tenant;
        },
        async update(id: string, updates: Partial<Tenant>): Promise<Tenant> {
            const { data, error } = await supabase.from('tenants').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data as Tenant;
        },
        async delete(id: string): Promise<void> {
            const { data: tenant } = await supabase.from('tenants').select('unit_id').eq('id', id).single();
            if (tenant) {
                await supabase.from('units').update({ status: 'available' }).eq('id', tenant.unit_id);
            }
            const { error } = await supabase.from('tenants').delete().eq('id', id);
            if (error) throw error;
        }
    },
    payments: {
        async getAll(): Promise<Payment[]> {
            const { data, error } = await supabase.from('payments').select('*');
            if (error) throw error;
            return data as Payment[];
        },
        async create(payment: Omit<Payment, 'id'>): Promise<Payment> {
            const newPayment = { ...payment, id: uuidv4() };
            const { data, error } = await supabase.from('payments').insert([newPayment]).select().single();
            if (error) throw error;
            return data as Payment;
        },
        async delete(id: string): Promise<void> {
            const { error } = await supabase.from('payments').delete().eq('id', id);
            if (error) throw error;
        }
    },
    events: {
        async getAll(): Promise<MaintenanceEvent[]> {
            const { data, error } = await supabase.from('events').select('*');
            if (error) throw error;
            return data as MaintenanceEvent[];
        },
        async create(event: Omit<MaintenanceEvent, 'id'>): Promise<MaintenanceEvent> {
            const newEvent = { ...event, id: uuidv4() };
            const { data, error } = await supabase.from('events').insert([newEvent]).select().single();
            if (error) throw error;
            return data as MaintenanceEvent;
        },
        async update(id: string, updates: Partial<MaintenanceEvent>): Promise<MaintenanceEvent> {
            const { data, error } = await supabase.from('events').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data as MaintenanceEvent;
        },
        async delete(id: string): Promise<void> {
            const { error } = await supabase.from('events').delete().eq('id', id);
            if (error) throw error;
        }
    }
};
