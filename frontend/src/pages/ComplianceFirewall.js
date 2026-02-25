import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, ShieldWarning, Warning, CheckCircle, 
  Scan, Clock, XCircle, Eye
} from '@phosphor-icons/react';
import { complianceAPI } from '../lib/api';
import { toast } from 'sonner';

const ComplianceFirewall = () => {
  const [text, setText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await complianceAPI.getLogs();
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleScan = async () => {
    if (!text.trim()) {
      toast.error('Please enter some text to scan');
      return;
    }

    setScanning(true);
    setResult(null);

    try {
      const response = await complianceAPI.scan(text);
      setResult(response.data);
      fetchLogs();
      
      if (response.data.blocked) {
        toast.error('Sensitive data detected and blocked!');
      } else if (response.data.risk_level !== 'SAFE') {
        toast.warning('Potential sensitive data found');
      } else {
        toast.success('No sensitive data detected');
      }
    } catch (error) {
      toast.error('Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const getRiskConfig = (level) => {
    const configs = {
      CRITICAL: { 
        color: 'text-red-500', 
        bg: 'bg-red-500/20', 
        border: 'border-red-500/50',
        icon: XCircle,
        label: 'Critical Risk'
      },
      HIGH: { 
        color: 'text-orange-500', 
        bg: 'bg-orange-500/20', 
        border: 'border-orange-500/50',
        icon: ShieldWarning,
        label: 'High Risk'
      },
      MEDIUM: { 
        color: 'text-yellow-500', 
        bg: 'bg-yellow-500/20', 
        border: 'border-yellow-500/50',
        icon: Warning,
        label: 'Medium Risk'
      },
      LOW: { 
        color: 'text-green-400', 
        bg: 'bg-green-500/20', 
        border: 'border-green-500/50',
        icon: Eye,
        label: 'Low Risk'
      },
      SAFE: { 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-500/20', 
        border: 'border-emerald-500/50',
        icon: CheckCircle,
        label: 'Safe'
      }
    };
    return configs[level] || configs.SAFE;
  };

  const sampleTexts = [
    { label: 'Email', text: 'Contact john.doe@company.com for details' },
    { label: 'SSN', text: 'SSN: 123-45-6789' },
    { label: 'Credit Card', text: 'Payment card: 4111111111111111' },
    { label: 'API Key', text: 'Use sk-api-key-1234567890abcdef for auth' },
    { label: 'Safe', text: 'The quarterly report shows 15% growth' },
  ];

  return (
    <div className="space-y-8" data-testid="compliance-firewall">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-['Syne'] mb-2">Compliance Firewall</h1>
        <p className="text-[#A1A1AA]">Scan text for sensitive data, PII, and security risks</p>
      </div>

      {/* Scanner */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Scan size={20} className="text-[#00E5FF]" />
            Text Scanner
          </h3>
          
          {/* Sample Data Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-[#A1A1AA]">Try:</span>
            {sampleTexts.map((sample, index) => (
              <button
                key={index}
                onClick={() => setText(sample.text)}
                className="px-3 py-1 rounded-full text-xs bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                {sample.label}
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input-field w-full h-48 resize-none mb-4"
            placeholder="Paste text to scan for sensitive data..."
            data-testid="compliance-input"
          />

          <button
            onClick={handleScan}
            disabled={scanning || !text.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            data-testid="scan-btn"
          >
            {scanning ? (
              <>
                <div className="spinner w-5 h-5" />
                Scanning...
              </>
            ) : (
              <>
                <ShieldCheck size={20} weight="bold" />
                Scan for Data Leaks
              </>
            )}
          </button>
        </div>

        {/* Results */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Scan Results</h3>
          
          {result ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Risk Level Badge */}
              <div className={`p-4 rounded-xl ${getRiskConfig(result.risk_level).bg} border ${getRiskConfig(result.risk_level).border}`}>
                <div className="flex items-center gap-3">
                  {React.createElement(getRiskConfig(result.risk_level).icon, {
                    size: 32,
                    weight: 'duotone',
                    className: getRiskConfig(result.risk_level).color
                  })}
                  <div>
                    <p className={`font-bold text-lg ${getRiskConfig(result.risk_level).color}`}>
                      {getRiskConfig(result.risk_level).label}
                    </p>
                    <p className="text-sm text-[#A1A1AA]">{result.summary}</p>
                  </div>
                </div>
                {result.blocked && (
                  <div className="mt-3 p-2 bg-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                    <XCircle size={16} />
                    This content would be blocked from being sent
                  </div>
                )}
              </div>

              {/* Findings */}
              {result.findings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-[#A1A1AA] mb-3">
                    Detected Issues ({result.findings.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.findings.map((finding, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-white/5 border border-white/5"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium capitalize">{finding.type.replace('_', ' ')}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getRiskConfig(finding.risk).bg} ${getRiskConfig(finding.risk).color}`}>
                            {finding.risk}
                          </span>
                        </div>
                        <p className="text-sm text-[#A1A1AA]">{finding.description}</p>
                        <p className="text-xs mono text-[#00E5FF] mt-1">
                          Match: {finding.match}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-[#A1A1AA]">
              <ShieldCheck size={48} className="mb-4 opacity-50" />
              <p>Enter text and click scan to check for sensitive data</p>
            </div>
          )}
        </div>
      </div>

      {/* Scan History */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock size={20} className="text-[#A1A1AA]" />
          Recent Scans
        </h3>

        {loadingLogs ? (
          <div className="flex justify-center py-8">
            <div className="spinner" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-[#A1A1AA]">
            <p>No scan history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#A1A1AA]">Time</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#A1A1AA]">Risk Level</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#A1A1AA]">Findings</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#A1A1AA]">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 10).map((log, index) => (
                  <tr key={log.id || index} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4 text-sm">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${getRiskConfig(log.risk_level).bg} ${getRiskConfig(log.risk_level).color}`}>
                        {log.risk_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{log.findings_count} detected</td>
                    <td className="py-3 px-4">
                      {log.blocked ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
                          Blocked
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                          Passed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceFirewall;
