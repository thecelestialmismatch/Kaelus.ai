import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Robot, ChatCircle, ShieldCheck, Lightning, ArrowUp, TrendEmpty } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const DashboardOverview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        analyticsAPI.getStats(),
        analyticsAPI.getActivity()
      ]);
      setStats(statsRes.data);
      setActivity(activityRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'AI Agents',
      value: stats?.agents || 0,
      icon: Robot,
      color: 'from-[#00E5FF]/20 to-[#00E5FF]/5',
      iconColor: 'text-[#00E5FF]'
    },
    {
      title: 'Chat Sessions',
      value: stats?.chat_sessions || 0,
      icon: ChatCircle,
      color: 'from-[#7B2CBF]/20 to-[#7B2CBF]/5',
      iconColor: 'text-[#7B2CBF]'
    },
    {
      title: 'Messages Sent',
      value: stats?.messages || 0,
      icon: Lightning,
      color: 'from-green-500/20 to-green-500/5',
      iconColor: 'text-green-500'
    },
    {
      title: 'Threats Blocked',
      value: stats?.threats_blocked || 0,
      icon: ShieldCheck,
      color: 'from-red-500/20 to-red-500/5',
      iconColor: 'text-red-500'
    }
  ];

  const quickActions = [
    { title: 'New Chat', description: 'Start a conversation', path: '/dashboard/chat', icon: ChatCircle },
    { title: 'Create Agent', description: 'Build custom AI', path: '/dashboard/agents', icon: Robot },
    { title: 'Scan Text', description: 'Check compliance', path: '/dashboard/compliance', icon: ShieldCheck }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card rounded-lg p-3">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-[#00E5FF] text-sm">Messages: {payload[0]?.value || 0}</p>
          <p className="text-[#7B2CBF] text-sm">Scans: {payload[1]?.value || 0}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-overview">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-['Syne'] mb-2">
          Welcome back, {user?.name?.split(' ')[0] || 'User'}
        </h1>
        <p className="text-[#A1A1AA]">Here's what's happening with your AI agents</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card rounded-xl p-5"
            data-testid={`stat-${card.title.toLowerCase().replace(' ', '-')}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#A1A1AA] text-sm mb-1">{card.title}</p>
                <p className="text-3xl font-bold font-['Syne']">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon size={24} weight="duotone" className={card.iconColor} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity Chart & Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-card rounded-xl p-6"
        >
          <h3 className="text-lg font-bold font-['Syne'] mb-6">7-Day Activity</h3>
          {activity.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activity}>
                  <defs>
                    <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7B2CBF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#7B2CBF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#A1A1AA', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#A1A1AA', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    stroke="#00E5FF"
                    fillOpacity={1}
                    fill="url(#colorMessages)"
                  />
                  <Area
                    type="monotone"
                    dataKey="scans"
                    stroke="#7B2CBF"
                    fillOpacity={1}
                    fill="url(#colorScans)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex flex-col items-center justify-center text-[#A1A1AA]">
              <TrendEmpty size={48} className="mb-4 opacity-50" />
              <p>No activity data yet</p>
              <p className="text-sm">Start using SYNQRA to see insights</p>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-xl p-6"
        >
          <h3 className="text-lg font-bold font-['Syne'] mb-6">Quick Actions</h3>
          <div className="space-y-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#00E5FF]/30 transition-all group flex items-center gap-4"
                data-testid={`quick-action-${index}`}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00E5FF]/20 to-[#7B2CBF]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <action.icon size={20} weight="duotone" className="text-[#00E5FF]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{action.title}</p>
                  <p className="text-sm text-[#A1A1AA]">{action.description}</p>
                </div>
                <ArrowUp size={18} className="text-[#A1A1AA] rotate-45 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardOverview;
