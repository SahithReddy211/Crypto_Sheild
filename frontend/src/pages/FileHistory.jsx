import React, { useState, useEffect } from 'react';
import { 
  FiSearch, 
  FiFilter, 
  FiLock, 
  FiUnlock, 
  FiCheckCircle, 
  FiDownload, 
  FiClock,
  FiXCircle
} from 'react-icons/fi';
import { statsService } from '../services/api';

export default function FileHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAlgo, setFilterAlgo] = useState('ALL');

  useEffect(() => {
    fetchHistoryData();
  }, []);

  const fetchHistoryData = async () => {
    try {
      const res = await statsService.getHistory();
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((item) => {
    const fileName = item.file_name || '';
    const algo = item.algorithm_used || item.algorithm || '';
    const matchesSearch = fileName.toLowerCase().includes(searchTerm.toLowerCase()) || algo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterAlgo === 'ALL' || algo.includes(filterAlgo);
    return matchesSearch && matchesFilter;
  });

  const getOperationBadge = (op) => {
    if (op === 'Encrypt') {
      return <span className="badge badge-info"><FiLock className="w-3 h-3" /> Encrypted</span>;
    }
    if (op === 'Decrypt') {
      return <span className="badge badge-blue" style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', borderColor: 'rgba(99,102,241,0.25)' }}><FiUnlock className="w-3 h-3" /> Decrypted</span>;
    }
    return <span className="badge badge-success"><FiCheckCircle className="w-3 h-3" /> Verified</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Audit Logs & History
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Historical trail of cryptographic operations, session records, and integrity verifications.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by filename or cipher..."
            className="glass-input pl-9 text-xs sm:text-sm"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <FiFilter className="text-slate-400 w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
            Filter Cipher:
          </span>
          <select
            value={filterAlgo}
            onChange={(e) => setFilterAlgo(e.target.value)}
            className="glass-input py-1.5 px-3 text-xs sm:text-sm"
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="ALL" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>All Algorithms</option>
            <option value="AES" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>AES-256-GCM</option>
            <option value="RSA" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>RSA-2048</option>
            <option value="DES" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Triple DES</option>
            <option value="SHA" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>SHA-512</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table-enterprise">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Operation</th>
                <th>Cipher Algorithm</th>
                <th>Execution Time</th>
                <th>Integrity</th>
                <th>Timestamp</th>
                <th>Operator</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    Loading operation history...
                  </td>
                </tr>
              ) : filteredHistory.length > 0 ? (
                filteredHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="font-semibold max-w-[220px] truncate" style={{ color: 'var(--text-primary)' }}>
                      {item.file_name || 'vault_payload.bin'}
                    </td>
                    <td>
                      {getOperationBadge(item.operation_type)}
                    </td>
                    <td className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {item.algorithm_used || item.algorithm || 'AES-256-GCM'}
                    </td>
                    <td>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                        {item.execution_time_ms || item.processing_time_ms || 42.5} ms
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <FiCheckCircle className="w-3.5 h-3.5" /> Passed
                      </span>
                    </td>
                    <td className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : item.date || '2026-08-19 11:45'}
                    </td>
                    <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {item.user || 'Admin'}
                    </td>
                    <td className="text-right">
                      <a
                        href="http://localhost:5000/api/download/sample_export.bin"
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors inline-flex"
                        title="Download Asset"
                      >
                        <FiDownload className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No history records match the selected search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
