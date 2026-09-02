import React from 'react';
import { 
  FiUser, 
  FiShield, 
  FiKey, 
  FiCheckCircle,
  FiMail,
  FiLock,
  FiCopy
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user, addToast } = useAuth();

  const copyFingerprint = (text) => {
    navigator.clipboard.writeText(text);
    addToast('Public key fingerprint copied.', 'info');
  };

  const publicKeyText = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ3D7a189f72c918e908b29f0a1c CryptoShield-RSA2048-MasterKey-2026";
  const sessionDigestText = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Operator Profile & Cryptographic Keys
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Identity credentials, assigned RSA-2048 public key envelopes, and vault authorization metadata.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-5 card p-6 flex flex-col items-center text-center justify-between">
          <div className="flex flex-col items-center">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-blue-600 border-2 border-blue-500/40 flex items-center justify-center text-white font-bold text-3xl mb-4 shadow-sm">
              {user?.username ? user.username[0].toUpperCase() : 'A'}
            </div>

            <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {user?.username || 'Security Admin'}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {user?.email || 'admin@cybersecurity.com'}
            </p>

            <div className="mt-3 badge badge-success text-xs font-semibold">
              <FiCheckCircle className="w-3.5 h-3.5" />
              Verified Security Officer
            </div>
          </div>

          <div 
            className="w-full mt-6 pt-5 border-t text-left space-y-3 text-xs"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Default Policy:</span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.default_security_level || 'High'}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Vault Access:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Read & Write (Full)</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-muted)' }}>Ephemeral Scratch Purge:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{user?.auto_delete_files ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>

        {/* Cryptographic Keys Card */}
        <div className="md:col-span-7 card p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="card-header -mx-6 -mt-6 mb-5">
              <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <FiKey className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Assigned Asymmetric Key Pair
              </h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                RSA-2048 envelope keys used for hybrid AES session wrapping
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Public Key Fingerprint (RSA-2048)</span>
                  <button
                    onClick={() => copyFingerprint(publicKeyText)}
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <FiCopy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <div 
                  className="p-3 rounded-lg border text-xs font-mono-code break-all leading-relaxed"
                  style={{ 
                    backgroundColor: 'var(--bg-input)', 
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)' 
                  }}
                >
                  {publicKeyText}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Session Key Master Digest (SHA-512)</span>
                  <button
                    onClick={() => copyFingerprint(sessionDigestText)}
                    className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <FiCopy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <div 
                  className="p-3 rounded-lg border text-xs font-mono-code break-all leading-relaxed"
                  style={{ 
                    backgroundColor: 'var(--bg-input)', 
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)' 
                  }}
                >
                  {sessionDigestText}
                </div>
              </div>
            </div>
          </div>

          <div 
            className="p-3.5 rounded-lg border text-xs flex items-center gap-2.5"
            style={{ 
              backgroundColor: 'var(--bg-input)', 
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)' 
            }}
          >
            <FiShield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span>RSA private keys are encrypted with PBKDF2 passphrases and protected in the secure key repository.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
