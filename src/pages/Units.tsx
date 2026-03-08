import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Typography, Tag, Spin, Tooltip, Button, Modal, Form, Input, InputNumber, Select, message, Empty, Space, Carousel, Progress, Tabs, Drawer, List } from 'antd';
import { WarningOutlined, CheckCircleOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ClockCircleOutlined, ToolOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { api, type Unit, type Tenant, type Payment, type Property, type Owner, type MaintenanceEvent } from '../lib/store';
import { useProperty } from '../context/PropertyContext';

const { Title, Text } = Typography;
const { Option } = Select;

const Units: React.FC = () => {
    const { activePropertyId, activeProperty } = useProperty();
    const [loading, setLoading] = useState(true);
    const [units, setUnits] = useState<Unit[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [owners, setOwners] = useState<Owner[]>([]);
    const [events, setEvents] = useState<MaintenanceEvent[]>([]);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDeliveryModalVisible, setIsDeliveryModalVisible] = useState(false);
    const [isEventsDrawerVisible, setIsEventsDrawerVisible] = useState(false);
    const [selectedUnitForEvents, setSelectedUnitForEvents] = useState<string | null>(null);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [u, t, p, props, ows, evs] = await Promise.all([
                api.units.getAll(),
                api.tenants.getAll(),
                api.payments.getAll(),
                api.properties.getAll(),
                api.owners.getAll(),
                api.events.getAll()
            ]);

            if (activePropertyId) {
                setUnits(u.filter(unit => unit.property_id === activePropertyId));
            } else {
                setUnits(u); // Show all units when no property is selected to appreciate the unified view
            }

            setTenants(t);
            setPayments(p);
            setProperties(props);
            setOwners(ows);
            setEvents(evs);
        } catch (error) {
            console.error("Error fetching units data:", error);
            message.error("Error al cargar unidades");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePropertyId]);

    const handleAddUnit = () => {
        setEditingUnit(null);
        form.resetFields();
        form.setFieldsValue({ status: 'available', type: 'Departamento', rooms: 1, sqm: 30 });
        setIsModalVisible(true);
    };

    const handleEditUnit = (unit: Unit) => {
        setEditingUnit(unit);
        form.setFieldsValue(unit);
        setIsModalVisible(true);
    };

    const handleDeleteUnit = async (id: string) => {
        Modal.confirm({
            title: '¿Está seguro de eliminar esta unidad?',
            content: 'Esta acción no se puede deshacer.',
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await api.units.delete(id);
                    message.success("Unidad eliminada");
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
            if (!activePropertyId) return;

            setLoading(true);
            if (editingUnit) {
                await api.units.update(editingUnit.id, values);
                message.success("Unidad actualizada");
            } else {
                await api.units.create({ ...values, property_id: activePropertyId });
                message.success("Unidad creada");
            }
            setIsModalVisible(false);
            fetchData();
        } catch (error) {
            console.error("Validation failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const currentMonthStart = dayjs().startOf('month');
    const today = dayjs();
    const past10th = today.date() > 10;

    const getUnitStatus = (unit: Unit) => {
        if (unit.status !== 'occupied') return { tenant: null, isWarning: false };

        const tenant = tenants.find(t => t.unit_id === unit.id);
        if (!tenant) return { tenant: null, isWarning: false };

        const hasPaidThisMonth = payments.some(p => {
            if (p.tenant_id !== tenant.id) return false;
            const targetDate = p.periodDate ? dayjs(p.periodDate) : dayjs(p.date);
            return targetDate.isAfter(currentMonthStart) || targetDate.isSame(currentMonthStart, 'month');
        });

        const isWarning = !hasPaidThisMonth && past10th;

        return { tenant, isWarning };
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>Unidades {activeProperty ? `- ${activeProperty.name}` : '(Todas)'}</Title>
                {activePropertyId && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUnit}>
                        Añadir Unidad
                    </Button>
                )}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>
            ) : !activePropertyId ? (
                <div style={{ textAlign: 'center', padding: 100 }}>
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={<span style={{ color: '#888', fontSize: 16 }}>Por favor, seleccione una propiedad del menú superior para ver sus unidades y el panel integral.</span>}
                    />
                </div>
            ) : units.length === 0 ? (
                <Empty description="No hay unidades registradas en este complejo." />
            ) : (
                <Row gutter={[16, 16]}>
                    {units?.map(unit => {
                        const { tenant, isWarning } = getUnitStatus(unit);

                        let cardColor = '#ffffff'; // default
                        let borderColor = '#d9d9d9';
                        if (unit.status === 'occupied') {
                            cardColor = isWarning ? '#fff1f0' : '#f6ffed';
                            borderColor = isWarning ? '#ffa39e' : '#b7eb8f';
                        } else if (unit.status === 'maintenance') {
                            cardColor = '#fffbe6';
                            borderColor = '#ffe58f';
                        }

                        const prop = properties.find(p => p.id === unit.property_id);
                        const owner = prop ? owners.find(o => o.id === prop.owner_id) : null;

                        let percent = 0;
                        let monthsTotal = 0;
                        let monthsCurrent = 0;
                        let daysRemaining = 0;

                        if (tenant && tenant.contractStart && tenant.contractEnd) {
                            const start = dayjs(tenant.contractStart);
                            const end = dayjs(tenant.contractEnd);
                            monthsTotal = end.diff(start, 'month') || 1;
                            monthsCurrent = today.diff(start, 'month');
                            daysRemaining = end.diff(today, 'day');
                            percent = Math.min(100, Math.max(0, (monthsCurrent / monthsTotal) * 100));
                        }

                        return (
                            <Col xs={24} sm={12} md={8} xl={6} key={unit.id}>
                                <Card
                                    title={
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 14 }}>
                                                {prop?.name || 'Complejo'} - <Text type="secondary">{owner?.fullName || 'Titular'}</Text>
                                            </span>
                                            {activePropertyId && (
                                                <Space>
                                                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEditUnit(unit)} size="small" />
                                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteUnit(unit.id)} size="small" />
                                                </Space>
                                            )}
                                        </div>
                                    }
                                    bordered={true}
                                    style={{ backgroundColor: cardColor, borderColor: borderColor }}
                                    actions={[
                                        <Tooltip title="Ver Plano">
                                            <Button type="link" size="small" onClick={() => message.info('Visualización de plano no implementada en demo')}>Plano</Button>
                                        </Tooltip>,
                                        <Tooltip title="Bitácora de Eventos">
                                            <Button type="link" size="small" onClick={() => { setSelectedUnitForEvents(unit.id); setIsEventsDrawerVisible(true); }}><ToolOutlined /> Reclamos</Button>
                                        </Tooltip>,
                                        <Tooltip title="Galería / Inspecciones">
                                            <Button type="link" size="small" onClick={() => setIsDeliveryModalVisible(true)}>Fotos</Button>
                                        </Tooltip>
                                    ]}
                                >
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <Title level={4} style={{ margin: 0 }}>Unidad {unit.name}</Title>
                                            {unit.status === 'occupied' ? (
                                                <Tag color={isWarning ? 'error' : 'success'}>Ocupada</Tag>
                                            ) : unit.status === 'maintenance' ? (
                                                <Tag color="warning">Mantenimiento</Tag>
                                            ) : (
                                                <Tag color="default">Disponible</Tag>
                                            )}
                                        </div>

                                        <Tag color="blue">{unit.type}</Tag>
                                        <div style={{ marginTop: 12 }}>
                                            <Text type="secondary" style={{ display: 'inline-block', marginRight: 16 }}>
                                                Ambientes:{' '}
                                                <Text
                                                    editable={{
                                                        onChange: async (val) => {
                                                            const num = parseInt(val, 10);
                                                            if (!isNaN(num)) {
                                                                await api.units.update(unit.id, { rooms: num });
                                                                fetchData();
                                                                message.success('Actualizado');
                                                            }
                                                        },
                                                    }}
                                                >
                                                    {unit.rooms.toString()}
                                                </Text>
                                            </Text>
                                            <Text type="secondary" style={{ display: 'inline-block' }}>
                                                Superficie:{' '}
                                                <Text
                                                    editable={{
                                                        onChange: async (val) => {
                                                            const num = parseFloat(val);
                                                            if (!isNaN(num)) {
                                                                await api.units.update(unit.id, { sqm: num });
                                                                fetchData();
                                                                message.success('Actualizado');
                                                            }
                                                        },
                                                    }}
                                                >
                                                    {unit.sqm.toString()}
                                                </Text> m²
                                            </Text>
                                        </div>
                                        {unit.extras && (
                                            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
                                                Extras: {unit.extras}
                                            </Text>
                                        )}

                                        {unit.sqm === 0 && (
                                            <div style={{ marginTop: 16 }}>
                                                <Button type="primary" block onClick={() => handleEditUnit(unit)}>
                                                    Completar Ficha
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                                        {unit.status === 'occupied' && tenant ? (
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Locatario Asignado</Text>
                                                <a onClick={() => navigate('/inquilinos')} style={{ fontWeight: 'bold', fontSize: 16 }}>{tenant.lastName}, {tenant.firstName}</a>
                                                <br />
                                                <div style={{ marginTop: 4 }}>
                                                    {isWarning ? (
                                                        <Tooltip title="Pasó el día 10 y no hay pago registrado este mes">
                                                            <Text type="danger"><WarningOutlined /> Pago Pendiente</Text>
                                                        </Tooltip>
                                                    ) : (
                                                        <Text type="success"><CheckCircleOutlined /> Al día</Text>
                                                    )}
                                                </div>
                                                {monthsTotal > 0 && (
                                                    <div style={{ marginTop: 12 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <Text style={{ fontSize: 12 }} type="secondary">
                                                                Contrato: Mes {monthsCurrent} de {monthsTotal}
                                                            </Text>
                                                            <Text style={{ fontSize: 12 }} type="secondary">
                                                                <ClockCircleOutlined /> {daysRemaining > 0 ? `${daysRemaining} días rest.` : 'Vencido'}
                                                            </Text>
                                                        </div>
                                                        <Progress percent={percent} size="small" showInfo={false} status={percent >= 90 ? 'exception' : 'active'} />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <Text type="secondary">
                                                    {unit.status === 'maintenance' ? 'En reparación' : 'Sin locatario asignado'}
                                                </Text>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}

            <Modal
                title={editingUnit ? "Editar Unidad" : "Nueva Unidad"}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
                okText="Guardar"
                cancelText="Cancelar"
                confirmLoading={loading}
            >
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="name" label="Nombre/Número" rules={[{ required: true, message: 'Requerido' }]}>
                                <Input placeholder="Ej. 1A, PB" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="Departamento">Departamento</Option>
                                    <Option value="Local">Local</Option>
                                    <Option value="Cochera">Cochera</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="rooms" label="Ambientes" rules={[{ required: true }]}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="sqm" label="Superficie (m²)" rules={[{ required: true }]}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="extras" label="Extras (Opcional)">
                        <Input placeholder="Ej. Balcón, Aire Acondicionado..." />
                    </Form.Item>
                    <Form.Item name="status" label="Estado Inicial" rules={[{ required: true }]} tooltip="Se actualizará automáticamente al asignar locatario">
                        <Select disabled={editingUnit?.status === 'occupied'}>
                            <Option value="available">Disponible</Option>
                            <Option value="occupied" disabled>Ocupado</Option>
                            <Option value="maintenance">Mantenimiento</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Galería e Inspecciones"
                open={isDeliveryModalVisible}
                onCancel={() => setIsDeliveryModalVisible(false)}
                footer={null}
                width={700}
                destroyOnClose
            >
                <Tabs defaultActiveKey="1">
                    <Tabs.TabPane tab="Recepción / Entrega" key="1">
                        <div style={{ padding: '10px 0', textAlign: 'center' }}>
                            <Carousel autoplay effect="fade">
                                <div key="1">
                                    <div style={{ background: '#364d79', color: '#fff', height: '300px', lineHeight: '300px', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <Title level={3} style={{ color: 'white', margin: 0 }}>Cocina Impecable</Title>
                                        <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Foto 1 de 3</Text>
                                    </div>
                                </div>
                                <div key="2">
                                    <div style={{ background: '#0958d9', color: '#fff', height: '300px', lineHeight: '300px', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <Title level={3} style={{ color: 'white', margin: 0 }}>Baño Recién Pintado</Title>
                                        <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Foto 2 de 3</Text>
                                    </div>
                                </div>
                                <div key="3">
                                    <div style={{ background: '#531dab', color: '#fff', height: '300px', lineHeight: '300px', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <Title level={3} style={{ color: 'white', margin: 0 }}>Balcón sin detalles</Title>
                                        <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Foto 3 de 3</Text>
                                    </div>
                                </div>
                            </Carousel>
                            <div style={{ marginTop: 16 }}>
                                <Button type="primary" icon={<PlusOutlined />}>Subir Nueva Foto Inicial</Button>
                            </div>
                        </div>
                    </Tabs.TabPane>
                    <Tabs.TabPane tab="Inspecciones Periódicas" key="2">
                        <div style={{ padding: '20px', background: '#fafafa', borderRadius: 8, textAlign: 'center' }}>
                            <Empty description="No hay actas de inspección periódica registradas." />
                            <Button style={{ marginTop: 16 }} type="dashed" icon={<PlusOutlined />}>Registrar Inspección</Button>
                        </div>
                    </Tabs.TabPane>
                </Tabs>
            </Modal>

            <Drawer
                title={`Bitácora de Eventos y Mantenimiento`}
                placement="right"
                width={500}
                onClose={() => setIsEventsDrawerVisible(false)}
                open={isEventsDrawerVisible}
            >
                <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>Historial de Reclamos y Soluciones</Text>
                    <Button type="primary" size="small" icon={<PlusOutlined />}>Nuevo Evento</Button>
                </div>
                <List
                    itemLayout="horizontal"
                    dataSource={events.filter(e => e.unit_id === selectedUnitForEvents)}
                    locale={{ emptyText: "No hay eventos registrados para esta unidad" }}
                    renderItem={item => (
                        <List.Item
                            actions={[
                                <Tag color={item.status === 'open' ? 'warning' : 'success'}>{item.status.toUpperCase()}</Tag>
                            ]}
                        >
                            <List.Item.Meta
                                title={<span>{item.description} <Text type="secondary" style={{ fontSize: 12 }}>({dayjs(item.date).format('DD/MM/YYYY')})</Text></span>}
                                description={
                                    <div>
                                        <Text style={{ display: 'block' }}>Acción: {item.action}</Text>
                                        {item.cost > 0 && <Text type="danger" strong>Costo: ${item.cost}</Text>}
                                    </div>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Drawer>
        </div>
    );
};

export default Units;
