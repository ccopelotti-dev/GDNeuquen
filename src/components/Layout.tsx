import { Layout as AntLayout, Menu, Typography, theme, Select } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Home, Users, Receipt, Wallet } from 'lucide-react';
import { SolutionOutlined, UserOutlined } from '@ant-design/icons';
import React from 'react';
import { useProperty } from '../context/PropertyContext';
import { useAuth } from '../context/AuthContext';

const { Header, Content, Sider } = AntLayout;
const { Title } = Typography;

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { properties, activePropertyId, setActivePropertyId } = useProperty();
  const { user } = useAuth();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  React.useEffect(() => {
    if (properties.length === 1 && !activePropertyId) {
      setActivePropertyId(properties[0].id);
    }
  }, [properties, activePropertyId, setActivePropertyId]);

  const menuItems = [
    {
      key: '/',
      icon: <LayoutDashboard size={18} />,
      label: 'Resumen General',
    },
    {
      key: '/unidades',
      icon: <Home size={18} />,
      label: 'Unidades',
    },
    {
      key: '/propietarios',
      icon: <SolutionOutlined style={{ fontSize: 18 }} />,
      label: 'Propietarios',
    },
    {
      key: '/inquilinos',
      icon: <Users size={18} />,
      label: 'Locatarios',
    },
    {
      key: '/cobranzas',
      icon: <Receipt size={18} />,
      label: 'Cobranzas',
    }
  ];

  if (user?.role === 'admin') {
    menuItems.push({
      key: '/liquidaciones',
      icon: <Wallet size={18} />,
      label: 'Liquidaciones',
    });
  }

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        theme="dark"
      >
        <div style={{ height: 32, margin: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Title level={4} style={{ color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            Control Deptos
          </Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 500 }}>Propiedad Activa:</span>
            <Select
              style={{ width: 250 }}
              placeholder="Seleccione una propiedad"
              value={activePropertyId}
              onChange={(val) => setActivePropertyId(val)}
              options={properties.map(p => ({ label: p.name, value: p.id }))}
              allowClear
              onClear={() => {
                // If cleared, go back to dashboard root where all properties are grid.
                setActivePropertyId(null);
                navigate('/');
              }}
            />
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginLeft: 16 }}
              onClick={() => navigate('/perfil')}
            >
              <div style={{ background: '#f0f2f5', borderRadius: '50%', width: 32, height: 32, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <UserOutlined />
              </div>
              <span style={{ fontWeight: 500 }}>Mi Perfil</span>
            </div>
          </div>
        </Header>
        <Content style={{ margin: '24px 16px 0' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default AppLayout;
