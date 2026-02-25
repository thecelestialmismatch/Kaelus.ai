import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Cpu, House, ChatCircle, Robot, ShieldCheck, ChartLineUp, 
  Gear, SignOut, CreditCard, CaretDoubleLeft 
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';

const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);

  const menuItems = [
    { path: '/dashboard', icon: House, label: 'Overview' },
    { path: '/dashboard/chat', icon: ChatCircle, label: 'AI Chat' },
    { path: '/dashboard/agents', icon: Robot, label: 'Agents' },
    { path: '/dashboard/compliance', icon: ShieldCheck, label: 'Compliance' },
    { path: '/dashboard/analytics', icon: ChartLineUp, label: 'Analytics' },
    { path: '/dashboard/billing', icon: CreditCard, label: 'Billing' },
    { path: '/dashboard/settings', icon: Gear, label: 'Settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getPlanBadge = () => {
    const plan = user?.plan || 'free';
    const colors = {
      free: 'bg-[#27272A] text-[#A1A1AA]',
      pro: 'bg-[#00E5FF]/20 text-[#00E5FF]',
      enterprise: 'bg-[#7B2CBF]/20 text-[#7B2CBF]'
    };
    return colors[plan] || colors.free;
  };

  return (
    <div className="min-h-screen bg-[#030303] flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.2 }}
        className="fixed left-0 top-0 h-screen border-r border-white/5 bg-[#030303] z-50 flex flex-col"
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#7B2CBF] flex items-center justify-center flex-shrink-0">
              <Cpu size={24} weight="bold" className="text-black" />
            </div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xl font-bold font-['Syne']"
              >
                SYNQRA
              </motion.span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/dashboard'}
                  className={({ isActive }) =>
                    `sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`
                  }
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon size={22} weight="duotone" className="text-[#A1A1AA]" />
                  {!collapsed && (
                    <span className="text-sm">{item.label}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-white/5">
          {!collapsed && (
            <div className="glass-card rounded-lg p-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00E5FF] to-[#7B2CBF] flex items-center justify-center text-black font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getPlanBadge()}`}>
                    {(user?.plan || 'free').charAt(0).toUpperCase() + (user?.plan || 'free').slice(1)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className={`sidebar-item text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full ${collapsed ? 'justify-center' : ''}`}
            data-testid="logout-btn"
          >
            <SignOut size={22} weight="duotone" />
            {!collapsed && <span className="text-sm">Sign Out</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#1A1A1A] border border-white/10 flex items-center justify-center hover:bg-[#27272A] transition-colors"
        >
          <CaretDoubleLeft 
            size={14} 
            className={`text-[#A1A1AA] transition-transform ${collapsed ? 'rotate-180' : ''}`} 
          />
        </button>
      </motion.aside>

      {/* Main Content */}
      <main 
        className="flex-1 transition-all duration-200"
        style={{ marginLeft: collapsed ? 72 : 260 }}
      >
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
