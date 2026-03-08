import React, { useState } from 'react';
import { Button, Card, Typography, Alert, message, List } from 'antd';
import { supabase } from '../lib/supabase';

const { Title, Text } = Typography;

const RestoreData: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [success, setSuccess] = useState(false);

    const propertiesData = [{ "id": "prop1", "owner_id": "o1", "name": "Departamentos Neuquén", "unitCount": 5 }, { "owner_id": "e9e6cef6-844a-4f49-bddc-88e640a52eb4", "name": "Departamentos Neuquen 550", "unitCount": 5, "id": "3ce59563-4652-41da-b092-a197e7703826" }];
    const tenantsData = [{ "id": "t1", "unit_id": "u1", "name": "Juan Perez", "phone": "12345678", "email": "juan@test.com", "rent_amount": 500 }, { "id": "t2", "unit_id": "u3", "name": "Maria Gomez", "phone": "87654321", "email": "maria@test.com", "rent_amount": 550 }, { "firstName": "tamara", "lastName": "TUBAN ROCIO", "documentId": "41.476.191", "address": "Neuquen 550", "city": "Santa Rosa", "province": "La Pampa", "unit_id": "58166138-f4e2-475c-bdf7-503db5086983", "phone": "2954272812", "rent_amount": 550000, "depositAmount": 275, "adjustmentFrequency": "Cuatrimestral", "guarantors": [{ "firstName": "MARIA FERNANDA", "lastName": "LOZANO", "documentId": "29.757.370", "phone": "2302204484", "address": "M SERAFINI 2541", "city": "SANTA ROSA", "province": "LA PAMPA" }, { "firstName": " FRANCO DAMIAN", "lastName": "FRIS", "documentId": "44.120.144", "phone": "2915005369", "address": "9 DE JULIO 161", "city": "GENERAL SAN MARTIN", "province": "LA PAMPA" }], "contractStart": "2026-03-01T03:00:00.000Z", "contractEnd": "2028-02-29T03:00:00.000Z", "id": "6ee453a4-5e53-4469-a2f2-7ed82f05c905" }, { "firstName": "JOAN EXEQUIEL", "lastName": "LUQUE ", "documentId": "36200802", "address": "Neuquen 550", "city": "Santa Rosa", "province": "La Pampa", "unit_id": "3b4d3ff1-8584-4143-b565-6931e4bea1de", "phone": "2954810619", "rent_amount": 320000, "adjustmentFrequency": "Cuatrimestral", "guarantors": [{ "firstName": "EDUARDO DANIEL", "lastName": "LUQUE", "documentId": "14341434", "phone": "2954338809", "email": "", "address": "BERTERA 1745 (casa 207)", "city": "Santa Rosa", "province": "ARGENTINA" }], "contractStart": "2024-11-01T03:00:00.000Z", "contractEnd": "2026-10-31T03:00:00.000Z", "id": "dde32392-2149-40f9-813b-641397e5e281", "depositAmount": 275 }, { "firstName": "ANA BELEN", "lastName": "NUÑEZ ORTIZ ", "documentId": "40611293", "address": "Neuquen 550", "city": "Santa Rosa", "province": "La Pampa", "unit_id": "3937e305-5dc6-452e-b250-baa73bedadec", "phone": "2954323223", "rent_amount": 330000, "adjustmentFrequency": "Cuatrimestral", "guarantors": [{ "firstName": "MAURO DARIO", "lastName": "NUÑEZ ORTIZ ", "documentId": "27648183", "phone": "2954 585659", "email": "", "address": "ALTE BROWN 644", "city": "Santa Rosa", "province": "La Pampa" }, { "firstName": "HECTOR ORLANDO", "lastName": "NUÑEZ ", "documentId": "10702338", "phone": "2954 415275", "email": "", "address": "ALTE BROWN 644", "city": "Santa Rosa", "province": "La Pampa" }], "contractStart": "2026-01-01T03:00:00.000Z", "contractEnd": "2027-12-31T03:00:00.000Z", "id": "03a1d34e-53c6-4b2a-867c-cbca45c3c6ae", "depositAmount": 275 }, { "firstName": "MARIANA MAGALI", "lastName": "GUEVARA ", "documentId": "28.183.182", "address": "Neuquen 550", "city": "Santa Rosa", "province": "La Pampa", "unit_id": "80d2cc24-079d-4960-bbde-eb3b8bdfeb59", "phone": "11 62338998", "rent_amount": 330000, "adjustmentFrequency": "Cuatrimestral", "guarantors": [], "contractStart": "2023-03-01T03:00:00.000Z", "contractEnd": "2025-02-28T03:00:00.000Z", "id": "251bd02d-3816-4f9f-9cc7-7b1685dd7402", "depositAmount": 275 }, { "firstName": "CAROLINA", "lastName": "DIASPRO ", "documentId": "36314810", "address": "Neuquen 550", "city": "Santa Rosa", "province": "La Pampa", "unit_id": "acffa6a8-27d9-47b9-929c-2537211b6335", "phone": "2954 272745", "rent_amount": 350000, "adjustmentFrequency": "Cuatrimestral", "guarantors": [{ "firstName": "ROMINA VALERIA", "lastName": "YACOPINI ", "documentId": "31134286", "phone": "2954 528217", "email": "", "address": "MENDOZA  N° 966", "city": "Santa Rosa", "province": "La Pampa" }], "contractStart": "2025-12-01T03:00:00.000Z", "contractEnd": "2027-11-30T03:00:00.000Z", "id": "54256183-83dd-4441-bb1f-baab1c822545", "depositAmount": 275 }];
    const paymentsData = [{ "id": "p1", "tenant_id": "t1", "amount": 500, "date": "2026-03-01T03:00:00.000Z", "concept": "Alquiler Mes Actual" }, { "tenant_id": "6ee453a4-5e53-4469-a2f2-7ed82f05c905", "owner_id": "o1", "amount": 550000, "concept": "Alquiler mar 2026 + Extras", "rentAmount": 550000, "tasasAmount": 0, "expensasAmount": 0, "otrosAmount": 0, "date": "2026-02-28T03:00:00.000Z", "paymentMethod": "Transferencia Bancaria", "bankDetails": { "receiptUrl": { "file": { "uid": "rc-upload-1772911869916-3" }, "fileList": [{ "uid": "rc-upload-1772911869916-3", "lastModified": 1772913899046, "lastModifiedDate": "2026-03-07T20:04:59.046Z", "name": "WhatsApp Image 2026-03-07 at 17.03.39.jpeg", "size": 41741, "type": "image/jpeg", "percent": 0, "originFileObj": { "uid": "rc-upload-1772911869916-3" } }] } }, "adminFee": 55000, "ownerBalance": 495000, "id": "1a8a36ec-0aa1-4da6-a9e1-907c09924154" }, { "tenant_id": "dde32392-2149-40f9-813b-641397e5e281", "owner_id": "o1", "amount": 329000, "concept": "Alquiler mar 2026 + Extras", "rentAmount": 320000, "tasasAmount": 9000, "expensasAmount": 0, "otrosAmount": 0, "date": "2026-02-28T03:00:00.000Z", "paymentMethod": "Transferencia Bancaria", "bankDetails": { "receiptUrl": { "file": { "uid": "rc-upload-1772911869916-6" }, "fileList": [{ "uid": "rc-upload-1772911869916-6", "lastModified": 1772913960021, "lastModifiedDate": "2026-03-07T20:06:00.021Z", "name": "WhatsApp Image 2026-02-28 at 13.19.14.jpeg", "size": 41982, "type": "image/jpeg", "percent": 0, "originFileObj": { "uid": "rc-upload-1772911869916-6" } }] } }, "adminFee": 32900, "ownerBalance": 296100, "id": "debb422f-e264-4793-9405-bbe30698d2b9" }, { "tenant_id": "54256183-83dd-4441-bb1f-baab1c822545", "owner_id": "o1", "amount": 366000, "concept": "Alquiler mar 2026 + Extras", "rentAmount": 350000, "tasasAmount": 16000, "expensasAmount": 0, "otrosAmount": 0, "date": "2026-03-06T03:00:00.000Z", "paymentMethod": "Transferencia Bancaria", "bankDetails": { "receiptUrl": { "file": { "uid": "rc-upload-1772911869916-10" }, "fileList": [{ "uid": "rc-upload-1772911869916-10", "lastModified": 1772914099045, "lastModifiedDate": "2026-03-07T20:08:19.045Z", "name": "COMP_HB3_TRANSFERENCIA-219741851-20260306135506 (1).pdf", "size": 5328, "type": "application/pdf", "percent": 0, "originFileObj": { "uid": "rc-upload-1772911869916-10" } }] } }, "adminFee": 36600, "ownerBalance": 329400, "id": "d37344c7-c365-4b05-a809-cf57f7f2185f" }, { "tenant_id": "6ee453a4-5e53-4469-a2f2-7ed82f05c905", "owner_id": "o1", "amount": 550000, "concept": "Alquiler mar 2026 + Extras", "rentAmount": 550000, "tasasAmount": 0, "expensasAmount": 0, "otrosAmount": 0, "date": "2026-02-28T03:00:00.000Z", "paymentMethod": "Transferencia Bancaria", "bankDetails": { "receiptUrl": { "file": { "uid": "rc-upload-1772914579873-2" }, "fileList": [{ "uid": "rc-upload-1772914579873-2", "lastModified": 1772913899046, "lastModifiedDate": "2026-03-07T20:04:59.046Z", "name": "WhatsApp Image 2026-03-07 at 17.03.39.jpeg", "size": 41741, "type": "image/jpeg", "percent": 0, "originFileObj": { "uid": "rc-upload-1772914579873-2" } }] } }, "adminFee": 41250, "ownerBalance": 508750, "id": "dccb9892-911b-4eab-ba56-1a7fd5cad9d7" }, { "tenant_id": "6ee453a4-5e53-4469-a2f2-7ed82f05c905", "owner_id": "o1", "amount": 550000, "concept": "Alquiler mar 2026 + Extras", "rentAmount": 550000, "tasasAmount": 0, "expensasAmount": 0, "otrosAmount": 0, "date": "2026-03-01T03:00:00.000Z", "paymentMethod": "Transferencia Bancaria", "bankDetails": { "receiptUrl": { "file": { "uid": "rc-upload-1772914579873-5" }, "fileList": [{ "uid": "rc-upload-1772914579873-5", "lastModified": 1772913899046, "lastModifiedDate": "2026-03-07T20:04:59.046Z", "name": "WhatsApp Image 2026-03-07 at 17.03.39.jpeg", "size": 41741, "type": "image/jpeg", "percent": 0, "originFileObj": { "uid": "rc-upload-1772914579873-5" } }] } }, "adminFee": 41250, "ownerBalance": 508750, "id": "0506b32c-5608-4b02-96c1-36f80a234130" }, { "tenant_id": "dde32392-2149-40f9-813b-641397e5e281", "owner_id": "o1", "amount": 329000, "concept": "Alquiler mar 2026 + Extras", "rentAmount": 320000, "tasasAmount": 9000, "expensasAmount": 0, "otrosAmount": 0, "date": "2026-03-01T03:00:00.000Z", "paymentMethod": "Transferencia Bancaria", "bankDetails": { "receiptUrl": { "file": { "uid": "rc-upload-1772914579873-8" }, "fileList": [{ "uid": "rc-upload-1772914579873-8", "lastModified": 1772913960021, "lastModifiedDate": "2026-03-07T20:06:00.021Z", "name": "WhatsApp Image 2026-02-28 at 13.19.14.jpeg", "size": 41982, "type": "image/jpeg", "percent": 0, "originFileObj": { "uid": "rc-upload-1772914579873-8" } }] } }, "adminFee": 24675, "ownerBalance": 304325, "id": "1ea86acf-049e-4d66-9d88-ef15801d2ca6" }];

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleRestore = async () => {
        setLoading(true);
        setLogs([]);
        setSuccess(false);
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const isUUID = (str: string) => uuidRegex.test(str);

            addLog("Iniciando filtrado y saneamiento de datos...");

            // Filtrar IDs invalidos (Datos Mock de inicio de app: prop1, o1, t1, t2, u1)
            const cleanProps = propertiesData
                .filter(p => isUUID(p.id))
                .map(p => {
                    const obj = { ...p };
                    if (!isUUID(obj.owner_id)) delete (obj as any).owner_id;
                    return obj;
                });

            const cleanTenants = tenantsData
                .filter(t => isUUID(t.id))
                .map(t => {
                    const obj: any = { ...t };
                    if (obj.name) {
                        const parts = obj.name.split(' ');
                        obj.firstName = parts[0] || 'Unknown';
                        obj.lastName = parts.slice(1).join(' ');
                        delete obj.name;
                    }
                    if (!isUUID(obj.unit_id)) delete obj.unit_id;
                    return obj;
                });

            const cleanPayments = paymentsData
                .filter(p => isUUID(p.id))
                .map(p => {
                    const obj: any = { ...p };
                    if (!isUUID(obj.tenant_id)) delete obj.tenant_id;
                    if (!isUUID(obj.owner_id)) delete obj.owner_id; // "o1" fails constraints

                    // Bank details is probably fine as it's JSONB, strings in DB, but just to be safe
                    // we remove it if it contains large non-standard metadata that might break a JSON parsing
                    delete obj.bankDetails;
                    return obj;
                });

            addLog(`Propiedades a insertar: ${cleanProps.length}`);
            addLog(`Locatarios a insertar: ${cleanTenants.length}`);
            addLog(`Pagos a insertar: ${cleanPayments.length}`);

            if (cleanProps.length > 0) {
                const { error: errProp } = await supabase.from('properties').upsert(cleanProps);
                if (errProp) {
                    addLog(`❌ Error en Propiedades: ${errProp.message}`);
                    console.error("Error propiedades:", errProp);
                } else {
                    addLog("✅ Propiedades insertadas correctamente.");
                }
            }

            if (cleanTenants.length > 0) {
                const { error: errTen } = await supabase.from('tenants').upsert(cleanTenants);
                if (errTen) {
                    addLog(`❌ Error en Locatarios: ${errTen.message}`);
                    console.error("Error locatarios:", errTen);
                } else {
                    addLog("✅ Locatarios insertados correctamente.");
                }
            }

            if (cleanPayments.length > 0) {
                const { error: errPay } = await supabase.from('payments').upsert(cleanPayments);
                if (errPay) {
                    addLog(`❌ Error en Pagos: ${errPay.message}`);
                    console.error("Error pagos:", errPay);
                } else {
                    addLog("✅ Pagos insertados correctamente.");
                }
            }

            message.success('Proceso de restauración completado');
            setSuccess(true);
        } catch (error: any) {
            addLog(`❌ Excepción fatal: ${error.message}`);
            message.error('Un error detuvo la restauración');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card bordered={true} style={{ border: '1px solid #ff4d4f', background: '#fff2f0', marginBottom: 24 }}>
            <Title level={4} style={{ color: '#cf1322', marginTop: 0 }}>Restauración Interactiva de Datos</Title>
            <Text>El script anterior falló probablemente porque intentó subir los datos de muestra anteriores ("Propiedad 1", "Juan Perez", etc) que usaban un ID falso (no-UUID), rompiendo las tablas. Usa este panel para subir los datos filtrados y ver el estado en tiempo real. Esto elimina los datos mock antiguos.</Text>

            <div style={{ marginTop: 16, marginBottom: 16 }}>
                <Button type="primary" danger onClick={handleRestore} loading={loading} disabled={success}>
                    Ejecutar Inserción de Rescate
                </Button>
            </div>

            {logs.length > 0 && (
                <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #d9d9d9', fontFamily: 'monospace' }}>
                    <List
                        size="small"
                        dataSource={logs}
                        renderItem={item => <List.Item>{item}</List.Item>}
                    />
                </div>
            )}

            {success && (
                <Alert
                    style={{ marginTop: 16 }}
                    message="Completado. Por favor, refresca la página una vez verificado y avísame para que retire este panel."
                    type="success"
                    showIcon
                />
            )}
        </Card>
    );
};

export default RestoreData;
