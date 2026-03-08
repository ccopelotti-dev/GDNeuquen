import React, { useEffect, useState } from 'react';
import { Table, Typography, Button, Modal, Form, InputNumber, Select, message, Empty, Row, Col, Input, Space, Upload, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined, FilePdfOutlined, UploadOutlined, MailOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api, type Payment, type Tenant, type Unit, type Owner, type Property } from '../lib/store';
import type { ColumnsType } from 'antd/es/table';
import { useProperty } from '../context/PropertyContext';

dayjs.locale('es');

const { Title, Text } = Typography;
const { Option } = Select;

export const formatCurrency = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '';
    return val.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
};

interface PaymentRow extends Payment {
    tenantName: string;
    unitName: string;
    ownerName?: string;
}

const Payments: React.FC = () => {
    const { activePropertyId, activeProperty } = useProperty();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<PaymentRow[]>([]);
    const [owners, setOwners] = useState<Owner[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [allO, allProp, allU, allT, allP] = await Promise.all([
                api.owners.getAll(),
                api.properties.getAll(),
                api.units.getAll(),
                api.tenants.getAll(),
                api.payments.getAll()
            ]);

            setOwners(allO);
            setProperties(allProp);
            setUnits(allU);
            setTenants(allT);

            let p = allP;

            if (activePropertyId) {
                const au = allU.filter(unit => unit.property_id === activePropertyId);
                const unitIds = new Set(au.map(unit => unit.id));
                const at = allT.filter(tenant => unitIds.has(tenant.unit_id));
                const tenantIds = new Set(at.map(tenant => tenant.id));
                p = allP.filter(payment => tenantIds.has(payment.tenant_id));
            } else {
                p = [];
            }

            const currentMonthStart = dayjs().startOf('month');

            const thisMonthPayments = p.filter(payment => {
                const targetDate = payment.periodDate ? dayjs(payment.periodDate) : dayjs(payment.date);
                return targetDate.isAfter(currentMonthStart) || targetDate.isSame(currentMonthStart, 'month');
            });

            const rows = thisMonthPayments.map(payment => {
                const tenant = allT.find(ten => ten.id === payment.tenant_id);
                const unit = tenant ? allU.find(un => un.id === tenant.unit_id) : null;
                const owner = payment.owner_id ? allO.find(o => o.id === payment.owner_id) : undefined;
                return {
                    ...payment,
                    tenantName: tenant ? `${tenant.lastName}, ${tenant.firstName}` : 'Desconocido',
                    unitName: unit ? unit.name : 'Desc.',
                    ownerName: owner ? owner.fullName : 'S/D'
                };
            }).sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

            setData(rows);
        } catch (error) {
            console.error("Error fetching payments data:", error);
            message.error("Error cargando cobranzas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activePropertyId]);

    const handleDelete = async (id: string) => {
        try {
            await api.payments.delete(id);
            message.success('Cobranza eliminada');
            fetchData();
        } catch (error) {
            message.error('Error al eliminar cobranza');
        }
    };

    const generatePDF = (record: PaymentRow) => {
        const doc = new jsPDF() as any;

        // Encabezado
        doc.setFontSize(28);
        doc.setTextColor(68, 168, 172); // #44a8ac
        doc.text("Recibo", 14, 25);

        // Datos del lado derecho
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0); // black
        doc.text(`Fecha: ${dayjs(record.date).format('DD/MM/YYYY')}`, 140, 20);

        // Número correlativo basado en el index de los datos actuales
        const receiptIndex = data.length - data.findIndex(p => p.id === record.id);
        const receiptNumber = String(receiptIndex).padStart(6, '0');
        doc.text(`N° Recibo:`, 140, 28);
        doc.setFontSize(16);
        doc.text(`${receiptNumber}`, 160, 28);

        // Reset text color for table
        doc.setTextColor(0, 0, 0);

        // Routing the amount to the correct line based on concept
        const alquilerAmt = record.rentAmount ? formatCurrency(record.rentAmount) : '';
        const tasasAmt = record.tasasAmount ? formatCurrency(record.tasasAmount) : '';
        const expensasAmt = record.expensasAmount ? formatCurrency(record.expensasAmount) : '';
        const variosAmt = record.otrosAmount ? formatCurrency(record.otrosAmount) : '';

        autoTable(doc, {
            startY: 40,
            head: [[
                { content: 'Detalle', colSpan: 2, styles: { fillColor: [68, 168, 172], halign: 'left', textColor: 255 } },
                { content: 'Liquidación', colSpan: 2, styles: { fillColor: [68, 168, 172], halign: 'left', textColor: 255 } }
            ]],
            body: [
                ['Titular / Propietario', record.ownerName || '-', 'Mes Alquiler', alquilerAmt],
                ['Locatario', record.tenantName, { content: 'Otros Cargos', colSpan: 2, styles: { fillColor: [68, 168, 172], textColor: 255, fontStyle: 'bold' } }],
                ['Unidad Asignada', record.unitName, 'Tasas Municipales', tasasAmt],
                ['Concepto', record.concept, 'Expensas', expensasAmt],
                ['Forma de Pago', record.paymentMethod || 'Efectivo', 'Varios:', variosAmt],
                ['', '', { content: 'Total Recibido', styles: { fillColor: [68, 168, 172], textColor: 255, fontStyle: 'bold' } }, { content: formatCurrency(record.amount), styles: { fillColor: [68, 168, 172], textColor: 255, fontStyle: 'bold', halign: 'right' } }]
            ],
            theme: 'grid',
            columnStyles: {
                0: { cellWidth: 35, textColor: [100, 100, 100] },
                1: { cellWidth: 55 },
                2: { cellWidth: 40 },
                3: { cellWidth: 40, halign: 'right' }
            },
            styles: {
                lineColor: [230, 230, 230],
                lineWidth: 0.1,
                fontSize: 10
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 100;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        // Firma (abajo a la izquierda)
        if (record.ownerName && record.ownerName !== 'S/D') {
            const ownerObj = owners.find(o => o.id === record.owner_id);
            if (ownerObj && ownerObj.signatureUrl) {
                try {
                    doc.addImage(ownerObj.signatureUrl, 'JPEG', 14, finalY + 20, 40, 20);
                } catch (e) {
                    console.error("Error agregando firma al PDF", e);
                }
            }

            doc.text("_________________________", 14, finalY + 50);
            doc.text(`Firma: ${record.ownerName}`, 14, finalY + 55);
        } else {
            doc.text("_________________________", 14, finalY + 50);
            doc.text("Firma del Administrador", 14, finalY + 55);
        }

        const monthName = dayjs(record.date).format('MMMM').charAt(0).toUpperCase() + dayjs(record.date).format('MMMM').slice(1);
        doc.save(`Recibo_${record.tenantName.replace(/\s/g, '_')}_${monthName}-${dayjs(record.date).format('YYYY')}.pdf`);
    };

    const columns: ColumnsType<PaymentRow> = [
        {
            title: 'Fecha',
            dataIndex: 'date',
            key: 'date',
            render: (val) => dayjs(val).format('DD/MM/YYYY'),
        },
        {
            title: 'Locatario',
            dataIndex: 'tenantName',
            key: 'tenantName',
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Unidad',
            dataIndex: 'unitName',
            key: 'unitName',
        },
        {
            title: 'Concepto',
            dataIndex: 'concept',
            key: 'concept',
        },
        {
            title: 'F. Pago',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            render: (val) => val || 'Efectivo',
        },
        {
            title: 'Monto ($)',
            dataIndex: 'amount',
            key: 'amount',
            render: (val) => <Text strong style={{ color: '#52c41a' }}>{formatCurrency(val)}</Text>,
        },
        {
            title: 'Acciones',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button type="text" title="Imprimir Recibo" style={{ color: '#1890ff' }} icon={<FilePdfOutlined />} onClick={() => generatePDF(record)} />
                    <Button type="text" title="Enviar por Correo" style={{ color: '#52c41a' }} icon={<MailOutlined />} onClick={() => message.success('Recibo enviado por correo al Locador.')} />
                    <Button danger type="text" title="Eliminar" icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
                </Space>
            ),
        }
    ];

    const handleOpenModal = () => {
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            const rentAmt = values.rentAmount || 0;
            const tasasAmt = values.tasasAmount || 0;
            const expensasAmt = values.expensasAmount || 0;
            const otrosAmt = values.otrosAmount || 0;
            const totalAmount = rentAmt + tasasAmt + expensasAmt + otrosAmt;

            const ownerObj = owners.find(o => o.id === values.owner_id);
            const commPerc = ownerObj?.commissionPercentage ?? 10;
            const adminFee = (totalAmount * commPerc) / 100;
            const ownerBalance = totalAmount - adminFee;

            await api.payments.create({
                tenant_id: values.tenant_id,
                owner_id: values.owner_id,
                amount: totalAmount,
                concept: `Alquiler ${dayjs().format('MMM YYYY')} + Extras`,
                rentAmount: rentAmt,
                tasasAmount: tasasAmt,
                expensasAmount: expensasAmt,
                otrosAmount: otrosAmt,
                date: values.date ? values.date.toISOString() : dayjs().toISOString(),
                periodDate: values.periodDate ? values.periodDate.startOf('month').toISOString() : dayjs().startOf('month').toISOString(),
                paymentMethod: values.paymentMethod,
                bankDetails: values.bankDetails,
                adminFee,
                ownerBalance,
            });
            message.success('Cobranza registrada exitosamente');
            setIsModalVisible(false);
            fetchData();
        } catch (error) {
            console.log("Validation failed:", error);
        } finally {
            setSubmitting(false);
        }
    };

    if (!activePropertyId) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Empty description="Seleccione un complejo en el menú superior para ver sus cobranzas." />
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Cobranzas - {activeProperty?.name} (Mes Actual)</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenModal}>
                    Registrar Pago
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={data}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title="Registrar Nueva Cobranza"
                open={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
                confirmLoading={submitting}
                okText="Registrar Pago"
                cancelText="Cancelar"
                width={600}
                destroyOnClose
            >
                <Form form={form} layout="vertical" name="paymentForm">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="owner_id"
                                label="Propietario"
                                rules={[{ required: true, message: 'Seleccione un titular' }]}
                            >
                                <Select placeholder="Seleccione Titular" onChange={() => form.setFieldsValue({ tenant_id: undefined })}>
                                    {owners.map(o => (
                                        <Option key={o.id} value={o.id}>{o.fullName}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item noStyle dependencies={['owner_id']}>
                                {({ getFieldValue }) => {
                                    const selectedOwner = getFieldValue('owner_id');
                                    let filteredTenants = tenants;

                                    if (selectedOwner) {
                                        const ownerProps = properties.filter(p => p.owner_id === selectedOwner);
                                        const ownerPropIds = new Set(ownerProps.map(p => p.id));
                                        const ownerUnits = units.filter(u => ownerPropIds.has(u.property_id));
                                        const ownerUnitIds = new Set(ownerUnits.map(u => u.id));
                                        filteredTenants = tenants.filter(t => ownerUnitIds.has(t.unit_id));
                                    }

                                    return (
                                        <Form.Item
                                            name="tenant_id"
                                            label="Locatario"
                                            rules={[{ required: true, message: 'Seleccione un locatario' }]}
                                        >
                                            <Select
                                                placeholder="Seleccione Locatario"
                                                disabled={!selectedOwner}
                                                onChange={(val) => {
                                                    const t = tenants.find(ten => ten.id === val);
                                                    if (t) {
                                                        form.setFieldsValue({ rentAmount: t.rent_amount });
                                                    }
                                                }}
                                            >
                                                {filteredTenants.map(t => {
                                                    const u = units.find(unit => unit.id === t.unit_id);
                                                    return (
                                                        <Option key={t.id} value={t.id}>{`${t.lastName}, ${t.firstName} (U. ${u ? u.name : '?'})`}</Option>
                                                    );
                                                })}
                                            </Select>
                                        </Form.Item>
                                    );
                                }}
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="date"
                                label="Fecha de Pago"
                                initialValue={dayjs()}
                                rules={[{ required: true, message: 'Seleccione fecha' }]}
                            >
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} allowClear={false} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="periodDate"
                                label="Período a Imputar"
                                initialValue={dayjs()}
                                rules={[{ required: true, message: 'Seleccione período' }]}
                            >
                                <DatePicker picker="month" format="MM/YYYY" style={{ width: '100%' }} allowClear={false} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="paymentMethod"
                                label="Forma de Pago"
                                rules={[{ required: true, message: 'Seleccione forma' }]}
                                initialValue="Efectivo"
                            >
                                <Select>
                                    <Option value="Efectivo">Efectivo</Option>
                                    <Option value="Transferencia Bancaria">Transferencia Bancaria</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item noStyle dependencies={['paymentMethod']}>
                                {({ getFieldValue }) => {
                                    if (getFieldValue('paymentMethod') === 'Transferencia Bancaria') {
                                        return (
                                            <Row gutter={8}>
                                                <Col span={12}>
                                                    <Form.Item name={['bankDetails', 'cbuAlias']} label="CBU / Alias">
                                                        <Input placeholder="Ej. jperez.banco" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item label="Comprobante" name={['bankDetails', 'receiptUrl']}>
                                                        <Upload
                                                            beforeUpload={() => false}
                                                            maxCount={1}
                                                            accept="image/*,.pdf"
                                                        >
                                                            <Button icon={<UploadOutlined />} style={{ width: '100%' }}>Adjuntar Archivo.</Button>
                                                        </Upload>
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                        );
                                    }
                                    return null;
                                }}
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="rentAmount" label="Alquiler Mes Actual ($)" rules={[{ required: true, message: 'Requerido' }]}>
                                <InputNumber style={{ width: '100%', color: '#52c41a' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="expensasAmount" label="Expensas ($)" initialValue={0}>
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="tasasAmount" label="Tasas Municipales ($)" initialValue={0}>
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="otrosAmount" label="Otros Cargos ($)" initialValue={0}>
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item shouldUpdate>
                                {() => {
                                    const rent = form.getFieldValue('rentAmount') || 0;
                                    const tasas = form.getFieldValue('tasasAmount') || 0;
                                    const expensas = form.getFieldValue('expensasAmount') || 0;
                                    const otros = form.getFieldValue('otrosAmount') || 0;
                                    const total = rent + tasas + expensas + otros;

                                    return (
                                        <div style={{ padding: '10px 15px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                            <Text strong style={{ color: '#389e0d', fontSize: 16 }}>Suma Total a Abonar:</Text>
                                            <Text strong style={{ color: '#52c41a', fontSize: 20 }}>{formatCurrency(total)}</Text>
                                        </div>
                                    );
                                }}
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default Payments;
