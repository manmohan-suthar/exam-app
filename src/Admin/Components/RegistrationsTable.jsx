import React, { useState, useMemo } from 'react';
import { Search, Download, Filter } from 'lucide-react';

const RegistrationsTable = ({ registrations, updateRegistrationStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'registeredAt', direction: 'desc' });

  const filteredAndSortedData = useMemo(() => {
    let filtered = registrations.filter(reg =>
      reg.centerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.pcName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.macAddress.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [registrations, searchTerm, sortConfig]);

  // Show all filtered data since we use scrolling instead of pagination
  const displayData = filteredAndSortedData;

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const exportToCSV = () => {
    const headers = ['Center Name', 'Center Address', 'PC Name', 'MAC Address', 'UUID', 'Hostname', 'Platform', 'Status', 'Registered At'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedData.map(reg => [
        `"${reg.centerName}"`,
        `"${reg.centerAddress}"`,
        `"${reg.pcName}"`,
        `"${reg.macAddress}"`,
        `"${reg.uuid}"`,
        `"${reg.hostname}"`,
        `"${reg.platform}"`,
        `"${reg.status || 'active'}"`,
        `"${new Date(reg.registeredAt).toLocaleString()}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'registrations.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg  w-[75vw] max-w-7xl h-[500px] flex flex-col" role="table" aria-label="PC Registrations Table">
      <div className="p-6 border-b border-slate-200 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-slate-800">PC Registrations</h3>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search registrations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="overflow-auto h-full flex flex-col">
          {/* Fixed Header */}
          <div className="bg-slate-50 border-b border-slate-200 flex-shrink-0" role="row">
            <div className="flex">
              {['centerName', 'centerAddress', 'pcName', 'macAddress', 'uuid', 'hostname', 'platform', 'status', 'registeredAt'].map(key => (
                <div
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 flex-shrink-0 ${
                    key === 'centerName' ? 'w-40' :
                    key === 'centerAddress' ? 'w-40' :
                    key === 'pcName' ? 'w-24' :
                    key === 'macAddress' ? 'w-36' :
                    key === 'uuid' ? 'w-32' :
                    key === 'hostname' ? 'w-32' :
                    key === 'platform' ? 'w-20' :
                    key === 'status' ? 'w-20' : 'w-40'
                  }`}
                  role="columnheader"
                >
                  {key === 'centerName' ? 'Center Name' :
                   key === 'centerAddress' ? 'Center Address' :
                   key === 'pcName' ? 'PC Name' :
                   key === 'macAddress' ? 'MAC Address' :
                   key === 'uuid' ? 'UUID' :
                   key === 'hostname' ? 'Hostname' :
                   key === 'platform' ? 'Platform' :
                   key === 'status' ? 'Status' : 'Registered At'}
                  {sortConfig.key === key && (
                    <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              ))}
              <div className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider flex-shrink-0 w-24" role="columnheader">
                Actions
              </div>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 w-full p-4">
            {displayData.map((reg) => (
              <div key={reg._id} className="flex border-b border-slate-200 hover:bg-slate-50 transition-colors" role="row">
                <div className="px-4 py-3 text-sm text-slate-900 truncate flex-shrink-0 w-40" title={reg.centerName} role="cell">{reg.centerName}</div>
                <div className="px-4 py-3 text-sm text-slate-900 truncate flex-shrink-0 w-40" title={reg.centerAddress} role="cell">{reg.centerAddress}</div>
                <div className="px-4 py-3 text-sm text-slate-900 flex-shrink-0 w-24" role="cell">{reg.pcName}</div>
                <div className="px-4 py-3 text-sm font-mono text-slate-900 flex-shrink-0 w-36" role="cell">{reg.macAddress}</div>
                <div className="px-4 py-3 text-sm font-mono text-slate-900 text-xs flex-shrink-0 w-32" role="cell">{reg.uuid}</div>
                <div className="px-4 py-3 text-sm text-slate-900 flex-shrink-0 w-32" role="cell">{reg.hostname}</div>
                <div className="px-4 py-3 text-sm text-slate-900 flex-shrink-0 w-20" role="cell">{reg.platform}</div>
                <div className="px-4 py-3 flex-shrink-0 w-20" role="cell">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    (reg.status || 'active') === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {reg.status || 'active'}
                  </span>
                </div>
                <div className="px-4 py-3 text-sm text-slate-900 flex-shrink-0 w-40" role="cell">
                  {new Date(reg.registeredAt).toLocaleString()}
                </div>
                <div className="px-4 py-3 flex-shrink-0 w-24" role="cell">
                  <select
                    value={reg.status || 'active'}
                    onChange={(e) => updateRegistrationStatus(reg._id, e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationsTable;