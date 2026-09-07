import React, { useState, useEffect } from 'react';
import { Cloud, Key, Shield, Database, Globe, Check, AlertCircle, Loader2, X, ExternalLink } from 'lucide-react';

interface R2ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const R2ConfigModal: React.FC<R2ConfigModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [accountId, setAccountId] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [bucketName, setBucketName] = useState('gamersgrid-media');
  const [publicDomain, setPublicDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAlreadyConfigured, setIsAlreadyConfigured] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Check current status
      fetch('/api/r2-config')
        .then(res => res.json())
        .then(data => {
          if (data.isConfigured) {
            setIsAlreadyConfigured(true);
            if (data.bucketName) setBucketName(data.bucketName);
            if (data.publicDomain) setPublicDomain(data.publicDomain);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!accountId.trim() || !accessKeyId.trim() || !secretAccessKey.trim() || !bucketName.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please fill in Account ID, Access Key ID, Secret Access Key, and Bucket Name.'
      });
      return;
    }

    setLoading(true);

    try {
      const resp = await fetch('/api/save-r2-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountId.trim(),
          accessKeyId: accessKeyId.trim(),
          secretAccessKey: secretAccessKey.trim(),
          bucketName: bucketName.trim(),
          publicDomain: publicDomain.trim()
        })
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Failed to verify and save Cloudflare R2 credentials');
      }

      setStatusMessage({
        type: 'success',
        text: data.message || 'Connected to Cloudflare R2 successfully!'
      });

      setIsAlreadyConfigured(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Connection failed. Please check your credentials.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#18181b] border border-[#2A2A2E] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="p-4 bg-[#141416] border-b border-[#2A2A2E] flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7A22EC]/20 border border-[#7A22EC]/40 flex items-center justify-center text-[#7A22EC]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-gaming">Cloudflare R2 Storage Setup</h3>
              <p className="text-xs text-zinc-400">Direct CDN media streaming & storage billing</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#252528] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          
          {isAlreadyConfigured && !statusMessage && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
              <Check className="w-4 h-4 shrink-0" />
              <span>Cloudflare R2 is configured and active for direct uploads. You can update credentials below anytime.</span>
            </div>
          )}

          {statusMessage && (
            <div className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}>
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              )}
              <span className="flex-1">{statusMessage.text}</span>
            </div>
          )}

          {/* CLOUDFLARE_ACCOUNT_ID */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-purple-400" />
              <span>CLOUDFLARE_ACCOUNT_ID</span>
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="e.g. 9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e"
              className="w-full bg-[#101012] border border-[#2A2A2E] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7A22EC] placeholder:text-zinc-600 font-mono"
              required
            />
            <span className="text-[10px] text-zinc-500 mt-0.5 block">
              Found on your Cloudflare dashboard URL: dash.cloudflare.com/&lt;account_id&gt;
            </span>
          </div>

          {/* R2_ACCESS_KEY_ID */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-400" />
              <span>R2_ACCESS_KEY_ID</span>
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              placeholder="e.g. 7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c"
              className="w-full bg-[#101012] border border-[#2A2A2E] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7A22EC] placeholder:text-zinc-600 font-mono"
              required
            />
          </div>

          {/* R2_SECRET_ACCESS_KEY */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>R2_SECRET_ACCESS_KEY</span>
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
              className="w-full bg-[#101012] border border-[#2A2A2E] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7A22EC] placeholder:text-zinc-600 font-mono"
              required
            />
            <span className="text-[10px] text-zinc-500 mt-0.5 block">
              Generated in R2 Object Storage → Manage R2 API Tokens → Create API Token
            </span>
          </div>

          {/* R2_BUCKET_NAME */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span>R2_BUCKET_NAME</span>
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="gamersgrid-media"
              className="w-full bg-[#101012] border border-[#2A2A2E] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7A22EC] placeholder:text-zinc-600 font-mono"
              required
            />
          </div>

          {/* R2_PUBLIC_DOMAIN */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span>R2_PUBLIC_DOMAIN</span>
              <span className="text-zinc-500 text-[10px]">(Optional for public CDN delivery)</span>
            </label>
            <input
              type="text"
              value={publicDomain}
              onChange={(e) => setPublicDomain(e.target.value)}
              placeholder="https://pub-xxxxxx.r2.dev or https://media.gamersgrid.com"
              className="w-full bg-[#101012] border border-[#2A2A2E] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7A22EC] placeholder:text-zinc-600 font-mono"
            />
            <span className="text-[10px] text-zinc-500 mt-0.5 block">
              In Bucket Settings → Public Access → allow R2.dev subdomain or custom domain
            </span>
          </div>

          {/* Footer Controls */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#252528] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#5003BD] hover:bg-[#7A22EC] text-white flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all active:scale-95"
              id="btn-save-r2-config"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting & Verifying...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save & Connect R2</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
