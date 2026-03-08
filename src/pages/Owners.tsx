import React, { useEffect, useState } from 'react';
import { Table, Typography, Button, Modal, Form, Input, InputNumber, message, Tag, Upload, Select, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { api, type Owner } from '../lib/store';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface OwnerRow extends Owner {
    propertyName?: string;
    propertyId?: string;
    unitCount?: number;
}

const Owners: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<OwnerRow[]>([]);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingOwner, setEditingOwner] = useState<OwnerRow | null>(null);
    const [form] = Form.useForm();
    const [signatureFile, setSignatureFile] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [owners, props] = await Promise.all([
                api.owners.getAll(),
                api.properties.getAll()
            ]);

            const rows: OwnerRow[] = owners.map(o => {
                const p = props.find(prop => prop.owner_id === o.id);
                return {
                    ...o,
                    propertyName: p?.name,
                    propertyId: p?.id,
                    unitCount: p?.unitCount
                };
            });

            setData(rows);
        } catch (error) {
            console.error("Error fetching owners data:", error);
            message.error("Error cargando propietarios");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = () => {
        setEditingOwner(null);
        setSignatureFile(null);
        form.resetFields();
        form.setFieldsValue({ role: 'owner' });
        setIsModalVisible(true);
    };

    const handleEdit = (record: OwnerRow) => {
        setEditingOwner(record);
        setSignatureFile(record.signatureUrl || null);
        form.setFieldsValue({
            fullName: record.fullName,
            documentId: record.documentId,
            phone: record.phone,
            email: record.email,
            address: record.address,
            propertyName: record.propertyName,
            unitCount: record.unitCount,
            commissionPercentage: record.commissionPercentage || 10,
            role: record.role || 'owner'
        });
        setIsModalVisible(true);
    };

    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: '¿Está seguro?',
            content: 'Eliminará el titular y esto puede afectar a los complejos asociados.',
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await api.owners.delete(id);
                    message.success("Titular eliminado");

                    // Force a simple reload to update everything without complex state management for this prototype
                    window.location.reload();
                } catch (error) {
                    message.error("Error al eliminar");
                }
            }
        });
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            if (editingOwner) {
                // Update owner
                await api.owners.update(editingOwner.id, {
                    fullName: values.fullName,
                    documentId: values.documentId,
                    phone: values.phone,
                    email: values.email,
                    address: values.address,
                    signatureUrl: signatureFile || undefined,
                    commissionPercentage: values.commissionPercentage,
                    role: values.role
                });

                // Update property if exists
                if (editingOwner.propertyId) {
                    await api.properties.update(editingOwner.propertyId, {
                        name: values.propertyName,
                        unitCount: values.unitCount
                    });

                    // Check for units and generate if requested and none exist
                    if (values.unitCount && values.unitCount > 0) {
                        const allUnits = await api.units.getAll();
                        const existingUnits = allUnits.filter(u => u.property_id === editingOwner.propertyId);

                        if (existingUnits.length === 0) {
                            const createUnitPromises = [];
                            for (let i = 1; i <= values.unitCount; i++) {
                                createUnitPromises.push(
                                    api.units.create({
                                        property_id: editingOwner.propertyId,
                                        name: `Unidad ${i}`,
                                        type: 'Departamento',
                                        rooms: 1,
                                        sqm: 0, // 0 to prompt completion
                                        extras: '',
                                        status: 'available'
                                    })
                                );
                            }
                            await Promise.all(createUnitPromises);
                            message.success(`Titular actualizado y ${values.unitCount} unidades autogeneradas exitosamente`);
                        } else {
                            message.success("Titular actualizado. No se generaron unidades porque el complejo ya tiene unidades registradas.");
                        }
                    } else {
                        message.success("Titular actualizado");
                    }
                } else if (values.propertyName) {
                    // Create new property linked to this existing owner
                    const newProperty = await api.properties.create({
                        owner_id: editingOwner.id,
                        name: values.propertyName,
                        unitCount: values.unitCount
                    });

                    // Auto-generate units if requested
                    if (values.unitCount && values.unitCount > 0) {
                        const createUnitPromises = [];
                        for (let i = 1; i <= values.unitCount; i++) {
                            createUnitPromises.push(
                                api.units.create({
                                    property_id: newProperty.id,
                                    name: `Unidad ${i}`,
                                    type: 'Departamento',
                                    rooms: 1,
                                    sqm: 0, // 0 to prompt completion
                                    extras: '',
                                    status: 'available'
                                })
                            );
                        }
                        await Promise.all(createUnitPromises);
                        message.success(`Titular, complejo nuevo y ${values.unitCount} unidades creadas exitosamente`);
                    } else {
                        message.success("Titular actualizado y complejo creado");
                    }
                } else {
                    message.success("Titular actualizado");
                }
            } else {
                // Create owner
                const newOwner = await api.owners.create({
                    fullName: values.fullName,
                    documentId: values.documentId,
                    phone: values.phone,
                    email: values.email,
                    address: values.address || '',
                    signatureUrl: signatureFile || undefined,
                    commissionPercentage: values.commissionPercentage || 10,
                    role: values.role || 'owner'
                });

                // Create associated property
                if (values.propertyName) {
                    const newProperty = await api.properties.create({
                        owner_id: newOwner.id,
                        name: values.propertyName,
                        unitCount: values.unitCount
                    });

                    // Auto-generate units if requested
                    if (values.unitCount && values.unitCount > 0) {
                        const allUnits = await api.units.getAll();
                        const existingUnits = allUnits.filter(u => u.property_id === newProperty.id);

                        if (existingUnits.length === 0) {
                            const createUnitPromises = [];
                            for (let i = 1; i <= values.unitCount; i++) {
                                createUnitPromises.push(
                                    api.units.create({
                                        property_id: newProperty.id,
                                        name: `Unidad ${i}`,
                                        type: 'Departamento',
                                        rooms: 1,
                                        sqm: 0, // 0 to prompt completion
                                        extras: '',
                                        status: 'available'
                                    })
                                );
                            }
                            await Promise.all(createUnitPromises);
                            message.success(`Titular, complejo y ${values.unitCount} unidades creadas exitosamente`);
                        } else {
                            message.success("Titular y complejo creados exitosamente. No se generaron unidades porque ya existen.");
                        }
                    } else {
                        message.success("Titular y complejo creados exitosamente");
                    }
                } else {
                    message.success("Titular creado exitosamente");
                }
            }
            setIsModalVisible(false);

            // Reload window to ensure PropertyContext catches the new property
            window.location.reload();
        } catch (error) {
            console.error("Validation failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const columns: ColumnsType<OwnerRow> = [
        {
            title: 'Nombre Completo',
            dataIndex: 'fullName',
            key: 'fullName',
            render: (text, record) => (
                <Space>
                    <Text strong>{text}</Text>
                    {record.role === 'admin' && <Tag color="purple">Admin</Tag>}
                </Space>
            ),
        },
        {
            title: 'Complejo/Propiedad',
            dataIndex: 'propertyName',
            key: 'propertyName',
            render: (val) => val ? <Tag color="blue">{val}</Tag> : <Text type="secondary">Ninguno</Text>,
        },
        {
            title: 'Unidades',
            dataIndex: 'unitCount',
            key: 'unitCount',
            align: 'center',
            render: (val) => val != null ? <Tag color="geekblue" style={{ fontWeight: 'bold', fontSize: '13px', margin: 0 }}>{val}</Tag> : <Text type="secondary">-</Text>,
        },
        {
            title: 'Comisión',
            dataIndex: 'commissionPercentage',
            key: 'commissionPercentage',
            align: 'center',
            render: (val) => <Text strong style={{ color: '#fa8c16' }}>{val || 10}%</Text>,
        },
        {
            title: 'DNI/CUIT',
            dataIndex: 'documentId',
            key: 'documentId',
        },
        {
            title: 'Teléfono',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_, record) => (
                <div>
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
                </div>
            ),
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Propietarios y Administradores</Title>
                <Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        Nuevo Titular
                    </Button>
                    <Button type="default" icon={<PlusOutlined />} onClick={() => {
                        handleAdd();
                        form.setFieldsValue({ role: 'admin' });
                    }}>
                        Nuevo Administrador
                    </Button>
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title={editingOwner ? "Editar Titular" : "Nuevo Titular"}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
                okText="Guardar"
                cancelText="Cancelar"
                confirmLoading={loading}
                width={600}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="owner">Titular / Propietario</Select.Option>
                            <Select.Option value="admin">Administrador General</Select.Option>
                        </Select>
                    </Form.Item>
                    <Title level={5} style={{ marginTop: 0 }}>Datos Personales</Title>
                    <Form.Item name="fullName" label="Nombre y Apellido" rules={[{ required: true, message: 'Requerido' }]}>
                        <Input placeholder="Ej. Juan Pérez" />
                    </Form.Item>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item name="documentId" label="DNI/CUIT" style={{ flex: 1 }} rules={[{ required: true, message: 'Requerido' }]}>
                            <Input placeholder="Ej. 20-12345678-9" />
                        </Form.Item>
                        <Form.Item name="phone" label="Teléfono Celular" style={{ flex: 1 }} rules={[{ required: true, message: 'Requerido' }]}>
                            <Input placeholder="Ej. 1122334455" />
                        </Form.Item>
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item name="email" label="Correo Electrónico" style={{ flex: 1 }} rules={[{ required: true, type: 'email', message: 'Email inválido' }]}>
                            <Input placeholder="ejemplo@correo.com" />
                        </Form.Item>
                        <Form.Item name="address" label="Domicilio Legal" style={{ flex: 1 }}>
                            <Input placeholder="Ej. San Martin 123" />
                        </Form.Item>
                    </div>

                    <Title level={5} style={{ marginTop: 16 }}>Gestión Administrativa</Title>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <Form.Item name="propertyName" label="Nombre del Complejo o Propiedad" style={{ flex: 2 }} rules={[{ required: true, message: 'Debe asignar el nombre del complejo' }]}>
                            <Input placeholder="Ej. Departamentos Neuquén" />
                        </Form.Item>
                        <Form.Item name="unitCount" label="Cant. Unidades" style={{ flex: 1 }} tooltip="Auto-generar esta cantidad de unidades al guardar (sólo si no existen previamente)">
                            <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="Ej. 10" />
                        </Form.Item>
                        <Form.Item name="commissionPercentage" label="Comisión (%)" style={{ flex: 1 }} initialValue={10} rules={[{ required: true, message: 'Obligatorio' }]}>
                            <InputNumber min={0} max={100} style={{ width: '100%', color: '#fa8c16', fontWeight: 'bold' }} />
                        </Form.Item>
                    </div>

                    <Title level={5} style={{ marginTop: 16 }}>Firma Digitalizada (Opcional)</Title>
                    <Form.Item label="Sube una imagen de la firma para aplicarla en los recibos emitidos">
                        <Upload
                            beforeUpload={(file) => {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    setSignatureFile(e.target?.result as string);
                                    message.success("Firma cargada correctamente (Vista previa)");
                                };
                                reader.readAsDataURL(file);
                                return false; // Prevent auto-upload
                            }}
                            maxCount={1}
                            accept="image/png, image/jpeg, image/jpg"
                            showUploadList={false}
                        >
                            <Button icon={<UploadOutlined />}>Cargar Firma .JPG/.PNG</Button>
                        </Upload>
                        {signatureFile ? (
                            <div style={{ marginTop: 10, padding: 10, border: '1px dashed #d9d9d9', display: 'inline-block' }}>
                                <img src={signatureFile} alt="Firma" style={{ maxHeight: 60, display: 'block' }} />
                                <Button type="link" danger size="small" onClick={() => setSignatureFile(null)}>Quitar</Button>
                            </div>
                        ) : (
                            <div style={{ marginTop: 10 }}>
                                <Typography.Text type="secondary">Ninguna firma cargada.</Typography.Text>
                            </div>
                        )}
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Owners;
