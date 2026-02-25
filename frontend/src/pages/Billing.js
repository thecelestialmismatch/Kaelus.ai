import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, Check, Lightning, Crown, Building, 
  SpinnerGap, ArrowRight, Sparkle 
} from '@phosphor-icons/react';
import { paymentsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

const Billing = () => {
  const { user, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(null);

  useEffect(() => {
    fetchPricing();
    checkPaymentStatus();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await paymentsAPI.getPricing();
      setPricing(response.data);
    } catch (error) {
      toast.error('Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    const sessionId = searchParams.get('session_id');
    const paymentStatus = searchParams.get('payment');
    
    if (sessionId && paymentStatus === 'success') {
      try {
        const response = await paymentsAPI.getCheckoutStatus(sessionId);
        if (response.data.payment_status === 'paid') {
          toast.success('Payment successful! Your plan has been upgraded.');
          // Refresh user data
          const meResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('synqra_token')}` }
          });
          if (meResponse.ok) {
            const userData = await meResponse.json();
            updateUser(userData);
          }
        }
      } catch (error) {
        console.error('Failed to verify payment:', error);
      }
    }
  };

  const handleCheckout = async (plan) => {
    if (plan === 'free' || plan === user?.plan) return;
    
    setCheckingOut(plan);
    try {
      const originUrl = window.location.origin;
      const response = await paymentsAPI.createCheckout(plan, originUrl);
      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Failed to start checkout');
      setCheckingOut(null);
    }
  };

  const plans = [
    {
      key: 'free',
      name: 'Free',
      price: '$0',
      period: '/forever',
      description: 'Perfect for getting started',
      icon: Lightning,
      features: ['1 AI Agent', '100 Messages/month', 'Basic Compliance Scan', 'Community Support'],
      color: 'from-gray-500/20 to-gray-500/5',
      borderColor: 'border-gray-500/30'
    },
    {
      key: 'pro',
      name: 'Pro',
      price: '$49',
      period: '/month',
      description: 'For growing teams',
      icon: Sparkle,
      features: ['10 AI Agents', 'Unlimited Messages', 'Advanced Compliance', 'Priority Support', 'Custom Templates', 'API Access'],
      popular: true,
      color: 'from-[#00E5FF]/20 to-[#00E5FF]/5',
      borderColor: 'border-[#00E5FF]/50'
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      price: '$299',
      period: '/month',
      description: 'For large organizations',
      icon: Building,
      features: ['Unlimited Agents', 'Unlimited Everything', 'Full Compliance Suite', 'Dedicated Support', 'Custom Integrations', 'SLA Guarantee', 'On-premise Option'],
      color: 'from-[#7B2CBF]/20 to-[#7B2CBF]/5',
      borderColor: 'border-[#7B2CBF]/50'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="billing">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-['Syne'] mb-2">Billing & Plans</h1>
        <p className="text-[#A1A1AA]">Manage your subscription and billing</p>
      </div>

      {/* Current Plan */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00E5FF]/20 to-[#7B2CBF]/20 flex items-center justify-center">
              <Crown size={28} weight="duotone" className="text-[#00E5FF]" />
            </div>
            <div>
              <p className="text-[#A1A1AA] text-sm">Current Plan</p>
              <p className="text-2xl font-bold font-['Syne'] capitalize">{user?.plan || 'Free'}</p>
            </div>
          </div>
          {user?.plan !== 'enterprise' && (
            <button
              onClick={() => handleCheckout(user?.plan === 'free' ? 'pro' : 'enterprise')}
              className="btn-primary flex items-center gap-2"
            >
              Upgrade <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const isCurrentPlan = user?.plan === plan.key || (user?.plan === undefined && plan.key === 'free');
          
          return (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-card rounded-xl p-6 relative ${plan.popular ? 'ring-1 ring-[#00E5FF]/50' : ''} ${isCurrentPlan ? plan.borderColor : ''}`}
              data-testid={`plan-${plan.key}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#00E5FF] text-black text-xs font-bold rounded-full">
                  Most Popular
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                  Current Plan
                </div>
              )}

              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-6`}>
                <plan.icon size={28} weight="duotone" className={plan.key === 'pro' ? 'text-[#00E5FF]' : plan.key === 'enterprise' ? 'text-[#7B2CBF]' : 'text-gray-400'} />
              </div>

              <h3 className="text-2xl font-bold font-['Syne'] mb-1">{plan.name}</h3>
              <p className="text-[#A1A1AA] text-sm mb-4">{plan.description}</p>
              
              <div className="mb-6">
                <span className="text-4xl font-bold font-['Syne']">{plan.price}</span>
                <span className="text-[#A1A1AA]">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Check size={16} weight="bold" className="text-[#00E5FF]" />
                    <span className="text-[#A1A1AA]">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.key)}
                disabled={isCurrentPlan || checkingOut === plan.key}
                className={`w-full py-3 rounded-full font-semibold transition-all flex items-center justify-center gap-2 ${
                  isCurrentPlan 
                    ? 'bg-white/5 text-[#A1A1AA] cursor-not-allowed' 
                    : plan.popular 
                      ? 'btn-primary' 
                      : 'btn-secondary'
                }`}
              >
                {checkingOut === plan.key ? (
                  <SpinnerGap size={20} className="animate-spin" />
                ) : isCurrentPlan ? (
                  'Current Plan'
                ) : (
                  <>
                    {plan.key === 'free' ? 'Downgrade' : 'Upgrade'} to {plan.name}
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Payment Info */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard size={24} className="text-[#00E5FF]" />
          <h3 className="text-lg font-semibold">Payment Information</h3>
        </div>
        <p className="text-[#A1A1AA] text-sm">
          Payments are securely processed through Stripe. Your card details are never stored on our servers.
        </p>
      </div>
    </div>
  );
};

export default Billing;
