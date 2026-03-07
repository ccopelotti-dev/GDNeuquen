import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Button, List, Tag, Space, Badge } from 'antd';
import {
    HomeOutlined,
    RightOutlined,
    PieChartOutlined,
    DollarCircleOutlined,
    WalletOutlined,
    AlertOutlined,
    ToolOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { api, type Owner } from '../lib/store';
import { useProperty } from '../context/PropertyContext';
import { useAuth } from '../context/AuthContext';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from 'recharts';
import RestoreData from '../components/RestoreData';

const { Title, Text } = Typography;

interface ChartData {
    name: string;
    Recaudacion: number;
    Comision: number;
}

interface ActivityItem {
    id: string;
    date: string;
    title: string;
    description: string;
    type: 'payment' | 'event';
    amount?: number;
}

const Dashboard: React.FC = () => {
    const { activePropertyId, activeProperty, properties, setActivePropertyId } = useProperty();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [owners, setOwners] = useState<Owner[]>([]);

    // Top Metrics
    const [ocupacionInfo, setOcupacionInfo] = useState({ ocupadas: 0, total: 0, porcentaje: 0 });
    const [recaudacionBruta, setRecaudacionBruta] = useState(0);
    const [gananciaOperativa, setGananciaOperativa] = useState(0);
    const [alertasCriticas, setAlertasCriticas] = useState({ contratosVencer: 0, eventosPendientes: 0 });

    // Chart & Activity
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [units, tenants, payments, events, allOwners] = await Promise.all([
                    api.units.getAll(),
                    api.tenants.getAll(),
                    api.payments.getAll(),
                    api.events.getAll(),
                    api.owners.getAll()
                ]);

                setOwners(allOwners);

                let filteredUnits = units;
                let filteredTenants = tenants;
                let filteredPayments = payments;
                let filteredEvents = events;

                if (activePropertyId) {
                    filteredUnits = units.filter(u => u.property_id === activePropertyId);
                    const propUnitIds = new Set(filteredUnits.map(u => u.id));
                    filteredTenants = tenants.filter(t => propUnitIds.has(t.unit_id));
                    const propTenantIds = new Set(filteredTenants.map(t => t.id));
                    filteredPayments = payments.filter(p => propTenantIds.has(p.tenant_id));
                    filteredEvents = events.filter(e => propUnitIds.has(e.unit_id));
                }

                // 1. Ocupación
                const ocupadas = filteredUnits.filter(u => u.status === 'occupied').length;
                const totalUnits = filteredUnits.length;
                const porcentaje = totalUnits > 0 ? Math.round((ocupadas / totalUnits) * 100) : 0;
                setOcupacionInfo({ ocupadas, total: totalUnits, porcentaje });

                // 2. Recaudación & Ganancia Operativa (Mes Actual)
                const currentMonth = dayjs().format('YYYY-MM');
                const pThisMonth = filteredPayments.filter(p => dayjs(p.date).format('YYYY-MM') === currentMonth);

                const recBruta = pThisMonth.reduce((acc, curr) => acc + curr.amount, 0);
                const ganOperativa = pThisMonth.reduce((acc, curr) => acc + (curr.adminFee || 0), 0);

                setRecaudacionBruta(recBruta);
                setGananciaOperativa(ganOperativa);

                // 3. Alertas Críticas (Contratos vto < 60 dias, Eventos open)
                const today = dayjs();
                let contratosVencer = 0;
                filteredTenants.forEach(t => {
                    if (t.contractEnd) {
                        const daysLeft = dayjs(t.contractEnd).diff(today, 'day');
                        if (daysLeft >= 0 && daysLeft <= 60) {
                            contratosVencer++;
                        }
                    }
                });
                const eventosPendientes = filteredEvents.filter(e => e.status === 'open').length;
                setAlertasCriticas({ contratosVencer, eventosPendientes });

                // 4. Gráfico Evolución de Fondos (Últimos 6 meses)
                const newChartData: ChartData[] = [];
                for (let i = 5; i >= 0; i--) {
                    const monthKey = dayjs().subtract(i, 'month').format('YYYY-MM');
                    const monthName = dayjs().subtract(i, 'month').format('MMM').toUpperCase();

                    const pMonth = filteredPayments.filter(p => dayjs(p.date).format('YYYY-MM') === monthKey);

                    const rBruta = pMonth.reduce((acc, curr) => acc + curr.amount, 0);
                    const gOperativa = pMonth.reduce((acc, curr) => acc + (curr.adminFee || 0), 0);

                    newChartData.push({
                        name: monthName,
                        Recaudacion: rBruta,
                        Comision: gOperativa
                    });
                }
                setChartData(newChartData);

                // 5. Actividad Reciente
                const activity: ActivityItem[] = [];

                filteredPayments.forEach(p => {
                    const t = tenants.find(t => t.id === p.tenant_id);
                    const title = t ? `Cobro ${t.lastName}, ${t.firstName}` : 'Cobro Registrado';
                    activity.push({
                        id: `p_${p.id}`,
                        date: p.date,
                        title,
                        description: `Concepto: ${p.concept}`,
                        type: 'payment',
                        amount: p.amount
                    });
                });

                filteredEvents.forEach(e => {
                    const u = units.find(u => u.id === e.unit_id);
                    activity.push({
                        id: `e_${e.id}`,
                        date: e.date,
                        title: u ? `Evento Unidad: ${u.name}` : 'Nuevo Evento',
                        description: e.description,
                        type: 'event'
                    });
                });

                activity.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
                setRecentActivity(activity.slice(0, 5));

            } catch (error) {
                console.error("Error loading dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [activePropertyId, properties]);

    // Render selector de complejos si no hay uno activo
    if (!activePropertyId && properties.length > 0) {
        return (
            <div>
                <Title level={2}>Dashboard de Propiedades</Title>
                <Text type="secondary">Seleccione un complejo para administrar u observe el resumen global.</Text>

                <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                    {properties.map(property => {
                        const owner = owners.find(o => o.id === property.owner_id);
                        return (
                            <Col xs={24} sm={12} lg={8} key={property.id}>
                                <Card
                                    hoverable
                                    onClick={() => setActivePropertyId(property.id)}
                                    style={{ borderTop: '4px solid #44a8ac' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                        <div>
                                            <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
                                                {property.name}
                                            </Title>
                                            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                                Titular: <span style={{ fontWeight: 500, color: 'inherit' }}>{owner?.fullName || 'Desconocido'}</span>
                                            </Text>
                                        </div>
                                        <div style={{ background: '#e6f7ff', padding: 8, borderRadius: 8, color: '#1890ff' }}>
                                            <HomeOutlined style={{ fontSize: 24 }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                                        <Button type="primary" icon={<RightOutlined />}>Ingresar</Button>
                                    </div>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>

                <Title level={4} style={{ marginTop: 40, borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>Vista Global del Sistema</Title>
            </div>
        );
    }

    // Render Tracker Profesional
    return (
        <div>
            <RestoreData />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>
                        {activeProperty ? `Resumen: ${activeProperty.name}` : 'Resumen Global'}
                    </Title>
                    <Text type="secondary">Monitor de rendimiento y estado operativo</Text>
                </div>
            </div>

            {/* TOP METRICS */}
            <Row gutter={[16, 16]}>
                {/* 1. Ocupación */}
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} loading={loading} bodyStyle={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text type="secondary" strong>Ocupación</Text>
                            <div style={{ background: '#f6ffed', padding: 8, borderRadius: 8, color: '#52c41a' }}>
                                <PieChartOutlined style={{ fontSize: 20 }} />
                            </div>
                        </div>
                        <Title level={2} style={{ margin: 0 }}>
                            {ocupacionInfo.porcentaje}%
                        </Title>
                        <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                            {ocupacionInfo.ocupadas} de {ocupacionInfo.total} unidades alquiladas
                        </Text>
                    </Card>
                </Col>

                {/* 2. Recaudación Bruta (Hidden for Colaboradores) */}
                {user?.role === 'admin' && (
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} loading={loading} bodyStyle={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text type="secondary" strong>Recaudación Bruta</Text>
                                <div style={{ background: '#e6f7ff', padding: 8, borderRadius: 8, color: '#1890ff' }}>
                                    <DollarCircleOutlined style={{ fontSize: 20 }} />
                                </div>
                            </div>
                            <Title level={2} style={{ margin: 0 }}>
                                ${recaudacionBruta.toLocaleString('es-AR')}
                            </Title>
                            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                                Ingresos de locatarios (Mes Actual)
                            </Text>
                        </Card>
                    </Col>
                )}

                {/* 3. Ganancia Operativa (Hidden for Colaboradores) */}
                {user?.role === 'admin' && (
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} loading={loading} bodyStyle={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text type="secondary" strong>Ganancia Operativa</Text>
                                <div style={{ background: '#f9f0ff', padding: 8, borderRadius: 8, color: '#722ed1' }}>
                                    <WalletOutlined style={{ fontSize: 20 }} />
                                </div>
                            </div>
                            <Title level={2} style={{ margin: 0, color: '#722ed1' }}>
                                ${gananciaOperativa.toLocaleString('es-AR')}
                            </Title>
                            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                                Comisiones generadas (Mes Actual)
                            </Text>
                        </Card>
                    </Col>
                )}

                {/* 4. Alertas Críticas */}
                <Col xs={24} sm={12} lg={user?.role === 'admin' ? 6 : 12}>
                    <Card bordered={false} loading={loading} bodyStyle={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text type="secondary" strong>Alertas Críticas</Text>
                            <div style={{ background: '#fff1f0', padding: 8, borderRadius: 8, color: '#f5222d' }}>
                                <AlertOutlined style={{ fontSize: 20 }} />
                            </div>
                        </div>
                        <Title level={2} style={{ margin: 0, color: '#cf1322' }}>
                            {alertasCriticas.contratosVencer + alertasCriticas.eventosPendientes}
                        </Title>
                        <Space style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap' }}>
                            {alertasCriticas.contratosVencer > 0 ? (
                                <Tag color="warning">{alertasCriticas.contratosVencer} Contratos a Vencer</Tag>
                            ) : (
                                <Text type="secondary" style={{ fontSize: 12 }}>Contratos OK</Text>
                            )}
                            {alertasCriticas.eventosPendientes > 0 ? (
                                <Tag color="error">{alertasCriticas.eventosPendientes} Evt. Pendientes</Tag>
                            ) : null}
                        </Space>
                    </Card>
                </Col>
            </Row>

            {/* BODY PANELS */}
            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                {/* GRÁFICO (60%) */}
                <Col xs={24} lg={16}>
                    <Card title="Evolución de Fondos (Últims 6 Meses)" bordered={false} style={{ height: '100%' }}>
                        <div style={{ height: 300, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorReca" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#1890ff" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorCom" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#722ed1" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#722ed1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [`$${Number(value).toLocaleString('es-AR')}`, undefined]}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="Recaudacion" stroke="#1890ff" fillOpacity={1} fill="url(#colorReca)" name="Recaudación" />
                                    {user?.role === 'admin' && (
                                        <Area type="monotone" dataKey="Comision" stroke="#722ed1" fillOpacity={1} fill="url(#colorCom)" name="Comisiones" />
                                    )}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>

                {/* ACTIVIDAD RECIENTE (40%) */}
                <Col xs={24} lg={8}>
                    <Card title="Actividad Reciente" bordered={false} style={{ height: '100%' }}>
                        <List
                            itemLayout="horizontal"
                            dataSource={recentActivity}
                            renderItem={item => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={
                                            item.type === 'payment' ? (
                                                <Badge count={<CheckCircleOutlined style={{ color: '#52c41a' }} />} offset={[0, 0]}>
                                                    <div style={{ background: '#e6f7ff', padding: 8, borderRadius: '50%', color: '#1890ff' }}>
                                                        <DollarCircleOutlined />
                                                    </div>
                                                </Badge>
                                            ) : (
                                                <div style={{ background: '#fff1f0', padding: 8, borderRadius: '50%', color: '#f5222d' }}>
                                                    <ToolOutlined />
                                                </div>
                                            )
                                        }
                                        title={<Text strong>{item.title}</Text>}
                                        description={
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                                                    {dayjs(item.date).format('DD/MM/YYYY HH:mm')}
                                                </Text>
                                                <Text type="secondary">{item.description}</Text>
                                            </div>
                                        }
                                    />
                                    {item.amount !== undefined && (
                                        <div style={{ textAlign: 'right' }}>
                                            <Text strong style={{ color: '#52c41a' }}>+${item.amount.toLocaleString('es-AR')}</Text>
                                        </div>
                                    )}
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
