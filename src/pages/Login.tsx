import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Layout } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Login: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        // Sanitizar el correo eliminando espacios accidentales
        const email = values.email ? values.email.trim() : '';
        const success = await login(email, values.password);
        setLoading(false);
        if (success) {
            navigate('/');
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
            <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: 12 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                        background: '#44a8ac',
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <LockOutlined style={{ fontSize: 28, color: 'white' }} />
                    </div>
                    <Title level={3} style={{ margin: 0, color: '#262626' }}>Control Deptos</Title>
                    <Text type="secondary">Ingresa tus credenciales para continuar</Text>
                </div>

                <Form
                    name="normal_login"
                    layout="vertical"
                    initialValues={{ remember: true }}
                    onFinish={onFinish}
                >
                    <Form.Item
                        name="email"
                        rules={[{ required: true, message: 'Por favor, ingresa tu Correo Electrónico!' }]}
                    >
                        <Input
                            prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                            placeholder="Correo Electrónico (ej: admin@gdneuquen.com)"
                            size="large"
                        />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Por favor, ingresa tu Contraseña!' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                            type="password"
                            placeholder="Contraseña (123456)"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
                        <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ background: '#44a8ac' }}>
                            Iniciar Sesión
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{ marginTop: 24, textAlign: 'center', padding: '12px', background: '#e6f7ff', borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>Solo personal autorizado.</Text>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>En caso de olvidar sus credenciales, contacte al administrador.</Text>
                </div>
            </Card>
        </Layout>
    );
};

export default Login;
