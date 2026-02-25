import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartLineUp, ChatCircle, ShieldCheck, Robot, 
  TrendUp, Clock, CalendarBlank 
} from '@phosphor-icons/react';
import { analyticsAPI } from '../lib/api';
import { toast } from 'sonner';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const Analytics = () => {
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
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Agents',
      value: stats?.agents || 0,
      icon: Robot,
      change: '+2',
      positive: true,
      color: '#00E5FF'
    },
    {
      title: 'Chat Sessions',
      value: stats?.chat_sessions || 0,
      icon: ChatCircle,
      change: '+12',
      positive: true,
      color: '#7B2CBF'
    },
    {
      title: 'Messages',
      value: stats?.messages || 0,
      icon: TrendUp,
      change: '+156',
      positive: true,
      color: '#22C55E'
    },
    {
      title: 'Threats Blocked',
      value: stats?.threats_blocked || 0,
      icon: ShieldCheck,
      change: stats?.threats_blocked > 0 ? `${stats.threats_blocked}` : '0',
      positive: false,
      color: '#EF4444'
    }
  ];

  const pieData = [
    { name: 'Messages', value: stats?.messages || 0, color: '#00E5FF' },
    { name: 'Scans', value: stats?.compliance_scans || 0, color: '#7B2CBF' },
    { name: 'Blocked', value: stats?.threats_blocked || 0, color: '#EF4444' }
  ].filter(d => d.value > 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card rounded-lg p-3 border border-white/10">
          <p className="text-sm font-medium mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
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
    <div className="space-y-8" data-testid="analytics">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Syne'] mb-2">Analytics</h1>
          <p className="text-[#A1A1AA]">Track your AI platform usage and performance</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#A1A1AA]">
          <CalendarBlank size={16} />
          Last 7 days
        </div>
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
          >
            <div className="flex items-start justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${card.color}20` }}
              >
                <card.icon size={24} weight="duotone" style={{ color: card.color }} />
              </div>
              <div className={`text-xs px-2 py-1 rounded-full ${
                card.positive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {card.change}
              </div>
            </div>
            <p className="text-[#A1A1AA] text-sm mb-1">{card.title}</p>
            <p className="text-3xl font-bold font-['Syne']">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-card rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <ChartLineUp size={20} className="text-[#00E5FF]" />
            Activity Trend
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity}>
                <defs>
                  <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorScan" x1="0" y1="0" x2="0" y2="1">
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
                  name="Messages"
                  stroke="#00E5FF"
                  fillOpacity={1}
                  fill="url(#colorMsg)"
                />
                <Area
                  type="monotone"
                  dataKey="scans"
                  name="Scans"
                  stroke="#7B2CBF"
                  fillOpacity={1}
                  fill="url(#colorScan)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold mb-6">Usage Distribution</h3>
          {pieData.length > 0 ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-[#A1A1AA]">
              <p>No data to display</p>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-[#A1A1AA]">{entry.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Daily Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Clock size={20} className="text-[#A1A1AA]" />
          Daily Breakdown
        </h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activity}>
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
              <Bar dataKey="messages" name="Messages" fill="#00E5FF" radius={[4, 4, 0, 0]} />
              <Bar dataKey="scans" name="Scans" fill="#7B2CBF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;
