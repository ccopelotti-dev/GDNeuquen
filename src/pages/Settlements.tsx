import React, { useEffect, useState } from 'react';
import { Table, Typography, Button, DatePicker, message, Space, Card, Row, Col, Statistic } from 'antd';
import { FilePdfOutlined, WalletOutlined } from '@ant-design/icons';
import { api, type Owner } from '../lib/store';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text } = Typography;

const formatCurrency = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '$ 0,00';
    return val.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

interface SettlementRow {
    ownerId: string;
    ownerName: string;
    totalAmount: number;
    totalAdminFee: number;
    totalOwnerBalance: number;
    paymentsCount: number;
    payments: any[]; // Extended payments with tenant & unit names
    ownerData?: Owner;
}

const Settlements: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SettlementRow[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());

    const fetchData = async () => {
        setLoading(true);
        try {
            const [owners, payments, tenants, units] = await Promise.all([
                api.owners.getAll(),
                api.payments.getAll(),
                api.tenants.getAll(),
                api.units.getAll()
            ]);

            // Filter payments by selected month and active owner link
            const targetMonth = selectedMonth.format('YYYY-MM');
            const validPayments = payments.filter(
                p => dayjs(p.date).format('YYYY-MM') === targetMonth && p.owner_id
            );

            const groupedData: Record<string, SettlementRow> = {};

            owners.forEach(owner => {
                groupedData[owner.id] = {
                    ownerId: owner.id,
                    ownerName: owner.fullName,
                    totalAmount: 0,
                    totalAdminFee: 0,
                    totalOwnerBalance: 0,
                    paymentsCount: 0,
                    payments: [],
                    ownerData: owner
                };
            });

            validPayments.forEach(p => {
                const tenant = tenants.find(t => t.id === p.tenant_id);
                const unit = units.find(u => u.id === tenant?.unit_id);

                if (p.owner_id && groupedData[p.owner_id]) {
                    const group = groupedData[p.owner_id];
                    group.totalAmount += p.amount;
                    group.totalAdminFee += p.adminFee || 0;
                    group.totalOwnerBalance += p.ownerBalance || p.amount; // fallback if missing
                    group.paymentsCount += 1;

                    group.payments.push({
                        ...p,
                        tenantName: tenant ? `${tenant.lastName}, ${tenant.firstName}` : 'Desconocido',
                        unitName: unit?.name || 'Unidad?'
                    });
                }
            });

            // Filter out owners with no payments this month (optional, but cleaner)
            const rows = Object.values(groupedData).filter(g => g.paymentsCount > 0);
            setData(rows);

        } catch (error) {
            console.error("Error fetching settlements:", error);
            message.error("Error cargando liquidaciones");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMonth]);

    const generateLiquidacionPDF = (record: SettlementRow) => {
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text("Gestión Administrativa de Propiedades", 14, 22);

        doc.setFontSize(14);
        doc.text("Liquidación Mensual de Propietario", 14, 32);

        doc.setFontSize(10);
        doc.text(`Propietario: ${record.ownerName}`, 14, 42);
        doc.text(`Periodo: ${selectedMonth.format('MMMM YYYY').toUpperCase()}`, 14, 48);
        doc.text(`Fecha de Emisión: ${dayjs().format('DD/MM/YYYY')}`, 150, 48);

        // Body table: all payments for this owner
        const tableData = record.payments.map(p => [
            dayjs(p.date).format('DD/MM'),
            p.unitName,
            p.tenantName,
            formatCurrency(p.amount),
            formatCurrency(p.adminFee || 0),
            formatCurrency(p.ownerBalance || p.amount)
        ]);

        autoTable(doc, {
            startY: 55,
            head: [['Fecha', 'Unidad', 'Locatario', 'Recaudado', 'Comisión', 'Neto']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });

        // Totals table
        const finalY = (doc as any).lastAutoTable.finalY + 10;

        autoTable(doc, {
            startY: finalY,
            head: [['Resumen', 'Monto']],
            body: [
                ['Total Recaudado', formatCurrency(record.totalAmount)],
                [`Honorarios de Administración (${record.ownerData?.commissionPercentage || 10}%)`, `-${formatCurrency(record.totalAdminFee)}`],
                ['NETO A LIQUIDAR', formatCurrency(record.totalOwnerBalance)]
            ],
            theme: 'grid',
            headStyles: { fillColor: [52, 73, 94] },
            bodyStyles: { fontStyle: 'bold', fontSize: 11 }
        });

        const secondFinalY = (doc as any).lastAutoTable.finalY + 30;

        doc.setFontSize(10);
        doc.text("_________________________", 14, secondFinalY);
        doc.text("Firma del Administrador", 20, secondFinalY + 5);

        const monthName = selectedMonth.format('MMMM').charAt(0).toUpperCase() + selectedMonth.format('MMMM').slice(1);
        doc.save(`Liquidacion_${record.ownerName.replace(/\s/g, '_')}_${monthName}-${selectedMonth.format('YYYY')}.pdf`);
    };

    const columns: ColumnsType<SettlementRow> = [
        {
            title: 'Propietario',
            dataIndex: 'ownerName',
            key: 'ownerName',
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Cant. Cobros',
            dataIndex: 'paymentsCount',
            key: 'paymentsCount',
            align: 'center',
        },
        {
            title: 'Total Recaudado',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            align: 'right',
            render: (val) => <Text type="secondary">{formatCurrency(val)}</Text>,
        },
        {
            title: 'Comisión Administración',
            dataIndex: 'totalAdminFee',
            key: 'totalAdminFee',
            align: 'right',
            render: (val) => <Text type="danger">-{formatCurrency(val)}</Text>,
        },
        {
            title: 'Neto a Liquidar',
            dataIndex: 'totalOwnerBalance',
            key: 'totalOwnerBalance',
            align: 'right',
            render: (val) => <Text strong style={{ color: '#52c41a', fontSize: '15px' }}>{formatCurrency(val)}</Text>,
        },
        {
            title: 'Acciones',
            key: 'actions',
            align: 'center',
            render: (_, record) => (
                <Button
                    type="primary"
                    icon={<FilePdfOutlined />}
                    onClick={() => generateLiquidacionPDF(record)}
                >
                    Generar Reporte
                </Button>
            ),
        }
    ];

    const grandTotalRecaudado = data.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const grandTotalComision = data.reduce((acc, curr) => acc + curr.totalAdminFee, 0);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    <WalletOutlined style={{ marginRight: 12 }} />
                    Liquidaciones
                </Title>
                <Space>
                    <Text strong>Mes a Liquidar:</Text>
                    <DatePicker
                        picker="month"
                        value={selectedMonth}
                        onChange={(date) => date && setSelectedMonth(date)}
                        allowClear={false}
                        format="MMMM YYYY"
                    />
                </Space>
            </div>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card>
                        <Statistic title="Recaudación Bruta Global" value={grandTotalRecaudado} formatter={(val) => formatCurrency(val as number)} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic title="Ganancia Administración (Comisiones)" value={grandTotalComision} formatter={(val) => formatCurrency(val as number)} valueStyle={{ color: '#1890ff' }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic title="Titulares a Liquidar" value={data.length} />
                    </Card>
                </Col>
            </Row>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="ownerId"
                loading={loading}
                pagination={false}
                bordered
            />
        </div>
    );
};

export default Settlements;
