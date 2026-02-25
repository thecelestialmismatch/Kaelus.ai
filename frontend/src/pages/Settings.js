import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Bell, Palette, SpinnerGap, Check } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'security', label: 'Security', icon: Lock },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'appearance', label: 'Appearance', icon: Palette }
  ];

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulated update - in real app, call API
    setTimeout(() => {
      updateUser({ ...user, name: formData.name });
      toast.success('Profile updated successfully');
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-8" data-testid="settings">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-['Syne'] mb-2">Settings</h1>
        <p className="text-[#A1A1AA]">Manage your account preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="glass-card rounded-xl p-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
                  activeTab === tab.key 
                    ? 'bg-[#00E5FF]/10 text-[#00E5FF]' 
                    : 'hover:bg-white/5 text-[#A1A1AA]'
                }`}
              >
                <tab.icon size={20} weight="duotone" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-xl p-6"
          >
            {activeTab === 'profile' && (
              <div>
                <h3 className="text-xl font-semibold mb-6">Profile Settings</h3>
                
                {/* Avatar */}
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00E5FF] to-[#7B2CBF] flex items-center justify-center text-3xl font-bold text-black">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium mb-1">{user?.name || 'User'}</p>
                    <p className="text-sm text-[#A1A1AA]">{user?.email}</p>
                    <p className="text-xs text-[#00E5FF] mt-1 capitalize">{user?.plan || 'Free'} Plan</p>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field w-full"
                      data-testid="settings-name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="input-field w-full opacity-50 cursor-not-allowed"
                    />
                    <p className="text-xs text-[#A1A1AA] mt-1">Email cannot be changed</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex items-center gap-2"
                    data-testid="save-profile-btn"
                  >
                    {loading ? (
                      <SpinnerGap size={18} className="animate-spin" />
                    ) : (
                      <Check size={18} weight="bold" />
                    )}
                    Save Changes
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h3 className="text-xl font-semibold mb-6">Security Settings</h3>
                
                <div className="space-y-6">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Password</h4>
                      <button className="text-sm text-[#00E5FF] hover:underline">
                        Change Password
                      </button>
                    </div>
                    <p className="text-sm text-[#A1A1AA]">Last changed: Never</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
                        Not Enabled
                      </span>
                    </div>
                    <p className="text-sm text-[#A1A1AA] mb-3">
                      Add an extra layer of security to your account
                    </p>
                    <button className="btn-secondary text-sm py-2">
                      Enable 2FA
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Active Sessions</h4>
                    </div>
                    <p className="text-sm text-[#A1A1AA]">1 active session</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h3 className="text-xl font-semibold mb-6">Notification Preferences</h3>
                
                <div className="space-y-4">
                  {[
                    { label: 'Email notifications', desc: 'Receive updates via email', enabled: true },
                    { label: 'Security alerts', desc: 'Get notified about security events', enabled: true },
                    { label: 'Product updates', desc: 'Learn about new features', enabled: false },
                    { label: 'Marketing emails', desc: 'Tips, offers, and news', enabled: false }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-[#A1A1AA]">{item.desc}</p>
                      </div>
                      <button
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          item.enabled ? 'bg-[#00E5FF]' : 'bg-[#27272A]'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            item.enabled ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div>
                <h3 className="text-xl font-semibold mb-6">Appearance</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3">Theme</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button className="p-4 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/50 text-center">
                        <div className="w-full h-16 rounded-lg bg-[#030303] mb-3 flex items-center justify-center">
                          <span className="text-2xl">🌙</span>
                        </div>
                        <span className="text-sm font-medium text-[#00E5FF]">Dark Mode</span>
                      </button>
                      <button className="p-4 rounded-xl bg-white/5 border border-white/10 text-center opacity-50 cursor-not-allowed">
                        <div className="w-full h-16 rounded-lg bg-white mb-3 flex items-center justify-center">
                          <span className="text-2xl">☀️</span>
                        </div>
                        <span className="text-sm font-medium">Light Mode</span>
                        <p className="text-xs text-[#A1A1AA] mt-1">Coming Soon</p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3">Accent Color</label>
                    <div className="flex gap-3">
                      {['#00E5FF', '#7B2CBF', '#22C55E', '#EF4444', '#F59E0B'].map((color) => (
                        <button
                          key={color}
                          className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${
                            color === '#00E5FF' ? 'ring-2 ring-offset-2 ring-offset-[#030303] ring-white' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
