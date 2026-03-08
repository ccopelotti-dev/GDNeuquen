import React, { useEffect, useState } from 'react';
import { Table, Typography, Tag, Tooltip, Empty, Radio, Card, Row, Col, Progress, Button, Space, Modal, Form, Input, InputNumber, Select, DatePicker, message, Divider, List, Drawer, Spin } from 'antd';
import { WarningOutlined, CheckCircleOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, ClockCircleOutlined, TeamOutlined, MenuOutlined, AppstoreOutlined, CameraOutlined, ToolOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api, type Tenant, type Unit } from '../lib/store';
import type { ColumnsType } from 'antd/es/table';
import { useProperty } from '../context/PropertyContext';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface TenantRow extends Tenant {
    unitName: string;
    hasPaid: boolean;
    isWarning: boolean;
}

const Tenants: React.FC = () => {
    const { activePropertyId, activeProperty } = useProperty();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<TenantRow[]>([]);
    const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);

    // View state
    const [viewMode, setViewMode] = useState<'list' | 'cards'>('cards');

    // Modal & Form state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [form] = Form.useForm();

    // Drawer state
    const [guarantorsDrawerVisible, setGuarantorsDrawerVisible] = useState(false);
    const [selectedTenantGuarantors, setSelectedTenantGuarantors] = useState<Tenant['guarantors']>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [allUnits, allTenants, allPayments] = await Promise.all([
                api.units.getAll(),
                api.tenants.getAll(),
                api.payments.getAll()
            ]);

            let units = allUnits;
            let tenants = allTenants;
            const payments = allPayments;

            if (activePropertyId) {
                units = allUnits.filter(u => u.property_id === activePropertyId);
                const unitIds = new Set(units.map(u => u.id));
                tenants = allTenants.filter(t => unitIds.has(t.unit_id));
            } else {
                tenants = [];
            }

            const currentMonthStart = dayjs().startOf('month');
            const today = dayjs();
            const past10th = today.date() > 10;

            const rows: TenantRow[] = tenants.map(t => {
                const unit = units.find(u => u.id === t.unit_id);
                const hasPaidThisMonth = payments.some(p => {
                    if (p.tenant_id !== t.id) return false;

                    if (p.periodDates && p.periodDates.length > 0) {
                        return p.periodDates.some(pd => {
                            const targetDate = dayjs(pd);
                            return targetDate.isAfter(currentMonthStart) || targetDate.isSame(currentMonthStart, 'month');
                        });
                    } else if (p.periodDate) { // Fallback
                        const targetDate = dayjs(p.periodDate);
                        return targetDate.isAfter(currentMonthStart) || targetDate.isSame(currentMonthStart, 'month');
                    } else { // Fallback
                        const targetDate = dayjs(p.date);
                        return targetDate.isAfter(currentMonthStart) || targetDate.isSame(currentMonthStart, 'month');
                    }
                });

                const isWarning = !hasPaidThisMonth && past10th;

                return {
                    ...t,
                    unitName: unit ? unit.name : 'Desconocida',
                    hasPaid: hasPaidThisMonth,
                    isWarning
                };
            });

            setData(rows);
            setAvailableUnits(units.filter(u => u.status === 'available' || u.status === 'occupied')); // Allowed for assignment for demo
        } catch (error) {
            console.error("Error fetching tenants data:", error);
            message.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePropertyId]);

    const handleAddTenant = () => {
        setEditingTenant(null);
        form.resetFields();
        form.setFieldsValue({ adjustmentFrequency: 'Semestral' });
        setIsModalVisible(true);
    };

    const handleEditTenant = (tenant: TenantRow) => {
        setEditingTenant(tenant);
        form.setFieldsValue({
            ...tenant,
            contractDates: tenant.contractStart && tenant.contractEnd ? [dayjs(tenant.contractStart), dayjs(tenant.contractEnd)] : undefined
        });
        setIsModalVisible(true);
    };

    const handleDeleteTenant = async (id: string, unitId: string) => {
        Modal.confirm({
            title: '¿Está seguro?',
            content: 'Se eliminará a este locatario. La unidad quedará disponible.',
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await api.tenants.delete(id);
                    // Free up the unit
                    await api.units.update(unitId, { status: 'available' });
                    message.success("Locatario eliminado");
                    fetchData();
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

            const payload: any = {
                firstName: values.firstName,
                lastName: values.lastName,
                documentId: values.documentId,
                address: values.address,
                city: values.city,
                province: values.province,
                unit_id: values.unit_id,
                phone: values.phone,
                email: values.email,
                rent_amount: values.rent_amount,
                depositAmount: values.depositAmount,
                adjustmentFrequency: values.adjustmentFrequency,
                guarantors: values.guarantors || []
            };

            if (values.contractDates && values.contractDates.length === 2) {
                payload.contractStart = values.contractDates[0].toISOString();
                payload.contractEnd = values.contractDates[1].toISOString();
            }

            if (editingTenant) {
                await api.tenants.update(editingTenant.id, payload);
                if (editingTenant.unit_id !== values.unit_id) {
                    await api.units.update(editingTenant.unit_id, { status: 'available' });
                    await api.units.update(values.unit_id, { status: 'occupied' });
                }
                message.success("Locatario actualizado");
            } else {
                await api.tenants.create(payload);
                await api.units.update(values.unit_id, { status: 'occupied' });
                message.success("Locatario registrado y unidad ocupada");
            }

            setIsModalVisible(false);
            fetchData();
        } catch (error) {
            console.error("Validation failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const columns: ColumnsType<TenantRow> = [
        {
            title: 'Inquilino',
            key: 'name',
            render: (_, record) => <Text strong>{record.lastName}, {record.firstName}</Text>,
        },
        {
            title: 'Unidad',
            dataIndex: 'unitName',
            key: 'unitName',
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
            title: 'Alquiler ($)',
            dataIndex: 'rent_amount',
            key: 'rent_amount',
            render: (val) => `$${val}`,
        },
        {
            title: 'Estado de Pago (Mes Actual)',
            key: 'status',
            render: (_, record) => {
                if (record.isWarning) {
                    return (
                        <Tooltip title="Pasó el día 10 y no hay registro de pago este mes">
                            <Tag color="error" icon={<WarningOutlined />}>Pago Pendiente</Tag>
                        </Tooltip>
                    );
                } else if (record.hasPaid) {
                    return <Tag color="success" icon={<CheckCircleOutlined />}>Pagado</Tag>;
                }
                return <Tag color="default">Pendiente (En término)</Tag>;
            },
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEditTenant(record)} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteTenant(record.id, record.unit_id)} />
                </Space>
            )
        }
    ];

    const today = dayjs();

    if (!activePropertyId) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Empty description="Seleccione un complejo en el menú superior para ver sus locatarios." />
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2} style={{ margin: 0 }}>Locatarios - {activeProperty?.name}</Title>
                <Space>
                    <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)} buttonStyle="solid">
                        <Tooltip title="Vista de Lista">
                            <Radio.Button value="list"><MenuOutlined /></Radio.Button>
                        </Tooltip>
                        <Tooltip title="Vista de Tarjetas">
                            <Radio.Button value="cards"><AppstoreOutlined /></Radio.Button>
                        </Tooltip>
                    </Radio.Group>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTenant}>
                        Nuevo Locatario
                    </Button>
                </Space>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>
            ) : data.length === 0 ? (
                <Empty description="No hay locatarios registrados." />
            ) : viewMode === 'list' ? (
                <Table
                    columns={columns}
                    dataSource={data}
                    rowKey="id"
                    pagination={false}
                    rowClassName={(record) => record.isWarning ? 'tenant-row-warning' : ''}
                />
            ) : (
                <Row gutter={[16, 16]}>
                    {data.map(tenant => {
                        let percent = 0;
                        let monthsTotal = 0;
                        let monthsCurrent = 0;
                        let daysRemaining = 0;

                        if (tenant.contractStart && tenant.contractEnd) {
                            const start = dayjs(tenant.contractStart);
                            const end = dayjs(tenant.contractEnd);
                            monthsTotal = end.diff(start, 'month') || 1;
                            monthsCurrent = today.diff(start, 'month');
                            daysRemaining = end.diff(today, 'day');
                            percent = Math.min(100, Math.max(0, (monthsCurrent / monthsTotal) * 100));
                        }

                        return (
                            <Col xs={24} sm={24} md={12} xl={8} key={tenant.id}>
                                <Card
                                    title={
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span><UserOutlined /> {tenant.lastName}, {tenant.firstName}</span>
                                                <Tag color="blue">{tenant.unitName}</Tag>
                                            </div>
                                            <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
                                                {tenant.city || 'S/D'}, {tenant.province || 'S/D'}
                                            </Text>
                                        </div>
                                    }
                                    style={{ borderColor: tenant.isWarning ? '#ffa39e' : '#d9d9d9', backgroundColor: tenant.isWarning ? '#fff1f0' : '#fff' }}
                                    actions={[
                                        <Tooltip title="Ver Garantes">
                                            <Button type="link" size="small" onClick={() => { setSelectedTenantGuarantors(tenant.guarantors || []); setGuarantorsDrawerVisible(true); }}><TeamOutlined /></Button>
                                        </Tooltip>,
                                        <Tooltip title="Galería / Inspecciones">
                                            <Button type="link" size="small" onClick={() => message.info('Módulo de Galería en construcción')}><CameraOutlined /></Button>
                                        </Tooltip>,
                                        <Tooltip title="Eventos / Mantenimiento">
                                            <Button type="link" size="small" onClick={() => message.info('Módulo de Eventos en construcción')}><ToolOutlined /></Button>
                                        </Tooltip>,
                                        <Tooltip title="Editar Ficha">
                                            <Button type="link" size="small" onClick={() => handleEditTenant(tenant)}><EditOutlined /></Button>
                                        </Tooltip>
                                    ]}
                                >
                                    <Row gutter={8} style={{ marginBottom: 12 }}>
                                        <Col span={12}>
                                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Alquiler</Text>
                                            <Text strong style={{ fontSize: 16 }}>${tenant.rent_amount}</Text>
                                        </Col>
                                        <Col span={12}>
                                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Ajuste</Text>
                                            <Text strong>{tenant.adjustmentFrequency || 'No definido'}</Text>
                                        </Col>
                                    </Row>

                                    <div style={{ marginBottom: 16 }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}><ClockCircleOutlined /> Contrato</Text>
                                        {monthsTotal > 0 ? (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                                    <Text style={{ fontSize: 12 }}>Mes {monthsCurrent} de {monthsTotal}</Text>
                                                    <Text style={{ fontSize: 12 }} type={daysRemaining < 30 ? 'danger' : 'secondary'}>
                                                        {daysRemaining > 0 ? `${daysRemaining} días rest.` : 'Vencido'}
                                                    </Text>
                                                </div>
                                                <Progress percent={percent} size="small" showInfo={false} status={percent >= 90 ? 'exception' : 'active'} />
                                            </>
                                        ) : (
                                            <Text style={{ display: 'block', fontStyle: 'italic', fontSize: 12 }}>Sin fechas estipuladas</Text>
                                        )}
                                    </div>

                                    <Divider style={{ margin: '12px 0' }} />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Estado actual:</Text>
                                        {tenant.isWarning ? (
                                            <Tag color="error" icon={<WarningOutlined />} style={{ margin: 0 }}>Pago Pendiente</Tag>
                                        ) : (
                                            <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0 }}>Al día</Tag>
                                        )}
                                    </div>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}

            <Modal
                title={editingTenant ? "Editar Locatario" : "Nuevo Locatario"}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
                width={700}
                confirmLoading={loading}
                okText="Guardar"
                cancelText="Cancelar"
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="firstName" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
                                <Input placeholder="Ej. Juan" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lastName" label="Apellido" rules={[{ required: true, message: 'Requerido' }]}>
                                <Input placeholder="Ej. Pérez" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="documentId" label="DNI" rules={[{ required: true, message: 'Requerido' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="phone" label="Teléfono" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="email" label="Correo Electrónico">
                                <Input type="email" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={10}>
                            <Form.Item name="address" label="Dirección" rules={[{ required: true, message: 'Requerido' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={7}>
                            <Form.Item name="city" label="Ciudad" rules={[{ required: true, message: 'Requerido' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={7}>
                            <Form.Item name="province" label="Provincia" rules={[{ required: true, message: 'Requerido' }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="unit_id" label="Unidad en Locación" rules={[{ required: true, message: 'Seleccione una unidad' }]}>
                                <Select placeholder="Seleccionar unidad">
                                    {availableUnits.map(u => (
                                        <Option key={u.id} value={u.id}>{u.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Divider orientation={"left" as any} style={{ margin: '12px 0' }}>Datos del Contrato</Divider>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="rent_amount" label="Alquiler Mensual ($)" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="depositAmount" label="Depósito ($)">
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="adjustmentFrequency" label="Frecuencia de Ajuste">
                                <Select>
                                    <Option value="Mensual">Mensual</Option>
                                    <Option value="Trimestral">Trimestral</Option>
                                    <Option value="Cuatrimestral">Cuatrimestral</Option>
                                    <Option value="Semestral">Semestral</Option>
                                    <Option value="Anual">Anual</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="contractDates" label="Vigencia del Contrato">
                        <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder={['Inicio', 'Fin']} />
                    </Form.Item>

                    <Divider orientation={"left" as any} style={{ margin: '12px 0' }}>Garantías</Divider>
                    <Form.List name="guarantors">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Card size="small" key={key} style={{ marginBottom: 16, background: '#fafafa' }}
                                        extra={<Button type="link" danger onClick={() => remove(name)}>Eliminar</Button>}
                                    >
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item {...restField} name={[name, 'firstName']} label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item {...restField} name={[name, 'lastName']} label="Apellido" rules={[{ required: true, message: 'Requerido' }]}>
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item {...restField} name={[name, 'documentId']} label="DNI" rules={[{ required: true, message: 'Requerido' }]}>
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item {...restField} name={[name, 'phone']} label="Teléfono" rules={[{ required: true, message: 'Requerido' }]}>
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item {...restField} name={[name, 'email']} label="Correo Electrónico">
                                                    <Input type="email" />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                        <Row gutter={16}>
                                            <Col span={10}>
                                                <Form.Item {...restField} name={[name, 'address']} label="Dirección" rules={[{ required: true, message: 'Requerido' }]}>
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                            <Col span={7}>
                                                <Form.Item {...restField} name={[name, 'city']} label="Ciudad" rules={[{ required: true, message: 'Requerido' }]}>
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                            <Col span={7}>
                                                <Form.Item {...restField} name={[name, 'province']} label="Provincia" rules={[{ required: true, message: 'Requerido' }]}>
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </Card>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        Añadir Garantía
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Modal>

            <Drawer
                title="Detalle de Garantes"
                placement="right"
                onClose={() => setGuarantorsDrawerVisible(false)}
                open={guarantorsDrawerVisible}
                width={400}
            >
                {!selectedTenantGuarantors || selectedTenantGuarantors.length === 0 ? (
                    <Empty description="No hay garantes registrados." />
                ) : (
                    <List
                        itemLayout="vertical"
                        dataSource={selectedTenantGuarantors}
                        renderItem={item => (
                            <List.Item>
                                <Card size="small" title={<><TeamOutlined /> {item.lastName}, {item.firstName}</>} bordered={false} style={{ background: '#f5f5f5' }}>
                                    <p><strong>DNI:</strong> {item.documentId || '-'}</p>
                                    <p><strong>Ubicación:</strong> {item.city || '-'}, {item.province || '-'}</p>
                                    <p><strong>Teléfono:</strong> {item.phone || '-'}</p>
                                    <p><strong>Dirección:</strong> {item.address || '-'}</p>
                                </Card>
                            </List.Item>
                        )}
                    />
                )}
            </Drawer>

            <style>{`
        .tenant-row-warning {
          background-color: #fff1f0;
        }
      `}</style>
        </div>
    );
};

export default Tenants;
