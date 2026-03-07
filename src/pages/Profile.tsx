import React, { useState } from 'react';
import { Card, Typography, Descriptions, Button, Form, Input, Divider, Tag } from 'antd';
import { UserOutlined, LogoutOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Profile: React.FC = () => {
    const { user, logout, updateProfile } = useAuth();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [form] = Form.useForm();

    if (!user) return null;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            updateProfile(values.fullName);
            setIsEditing(false);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    <UserOutlined style={{ marginRight: 12 }} />
                    Mi Perfil
                </Title>
                <Button
                    type="primary"
                    danger
                    icon={<LogoutOutlined />}
                    onClick={handleLogout}
                >
                    Cerrar Sesión
                </Button>
            </div>

            <Card bordered={false} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{
                        background: '#e6f7ff',
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 24
                    }}>
                        <UserOutlined style={{ fontSize: 40, color: '#1890ff' }} />
                    </div>
                    <div>
                        <Title level={3} style={{ margin: 0, marginBottom: 8 }}>{user.fullName}</Title>
                        <Tag color={user.role === 'admin' ? 'purple' : 'cyan'} style={{ fontSize: 14, padding: '4px 12px' }}>
                            {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                        </Tag>
                    </div>
                </div>

                <Divider />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={4} style={{ margin: 0 }}>Datos de la Cuenta</Title>
                    {!isEditing && (
                        <Button type="link" icon={<EditOutlined />} onClick={() => {
                            form.setFieldsValue({ fullName: user.fullName });
                            setIsEditing(true);
                        }}>
                            Editar Nombre
                        </Button>
                    )}
                </div>

                {isEditing ? (
                    <Form form={form} layout="vertical" style={{ maxWidth: 400 }}>
                        <Form.Item
                            name="fullName"
                            label="Nombre Completo"
                            rules={[{ required: true, message: 'Por favor ignresa tu nombre' }]}
                        >
                            <Input size="large" />
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} style={{ marginRight: 8 }}>
                                Guardar Cambios
                            </Button>
                            <Button onClick={() => setIsEditing(false)}>
                                Cancelar
                            </Button>
                        </Form.Item>
                    </Form>
                ) : (
                    <Descriptions column={1} bordered size="middle">
                        <Descriptions.Item label="Correo Electrónico">{user.email}</Descriptions.Item>
                        <Descriptions.Item label="Nombre de Perfil">{user.fullName}</Descriptions.Item>
                        <Descriptions.Item label="ID de Sistema">
                            <Text type="secondary" style={{ fontFamily: 'monospace' }}>{user.id}</Text>
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Card>
        </div>
    );
};

export default Profile;
