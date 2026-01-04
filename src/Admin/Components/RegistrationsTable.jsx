import React, { useState, useMemo } from 'react';
import { Search, Download, Filter, Plus, Edit2, Trash2 } from 'lucide-react';

const RegistrationsTable = ({ registrations, updateRegistrationStatus, createRegistration, updateRegistration, deleteRegistration }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'registeredAt', direction: 'desc' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [newReg, setNewReg] = useState({
    centerName: '',
    centerAddress: '',
    pcName: '',
    hostname: '',
    macAddress: '',
    uuid: '',
    platform: '',
    status: 'active'
  });
  const [errors, setErrors] = useState({});

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

  const validateReg = (reg) => {
    const errs = {};
    if (!reg.centerName.trim()) errs.centerName = 'Center Name is required';
    if (!reg.centerAddress.trim()) errs.centerAddress = 'Center Address is required';
    if (!reg.pcName.trim()) errs.pcName = 'PC Name is required';
    if (!reg.hostname.trim()) errs.hostname = 'Hostname is required';
    if (!reg.macAddress.trim()) errs.macAddress = 'MAC Address is required';
    if (!reg.uuid.trim()) errs.uuid = 'UUID is required';
    if (!reg.platform.trim()) errs.platform = 'Platform is required';
    return errs;
  };

  const handleCreate = async () => {
    const errs = validateReg(newReg);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    try {
      await createRegistration(newReg);
      setNewReg({
        centerName: '',
        centerAddress: '',
        pcName: '',
        hostname: '',
        macAddress: '',
        uuid: '',
        platform: '',
        status: 'active'
      });
      setErrors({});
      setShowCreateModal(false);
    } catch (error) {
      setErrors({ general: 'Failed to create registration' });
    }
  };

  const handleEdit = (reg) => {
    setEditingId(reg._id);
    setEditData({
      centerName: reg.centerName,
      centerAddress: reg.centerAddress,
      pcName: reg.pcName,
      hostname: reg.hostname
    });
  };

  const handleSave = async (id) => {
    console.log('handleSave called with id:', id, 'editData:', editData);
    const errs = {};
    if (!editData.centerName.trim()) errs.centerName = 'Center Name is required';
    if (!editData.centerAddress.trim()) errs.centerAddress = 'Center Address is required';
    if (!editData.pcName.trim()) errs.pcName = 'PC Name is required';
    if (!editData.hostname.trim()) errs.hostname = 'Hostname is required';
    if (Object.keys(errs).length > 0) {
      console.log('Validation errors:', errs);
      setErrors(errs);
      return;
    }
    try {
      console.log('Calling updateRegistration');
      await updateRegistration(id, editData);
      console.log('updateRegistration successful');
      setEditingId(null);
      setEditData({});
      setErrors({});
    } catch (error) {
      console.log('updateRegistration failed:', error);
      setErrors({ general: 'Failed to update registration' });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
    setErrors({});
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this registration?')) {
      try {
        await deleteRegistration(id);
      } catch (error) {
        alert('Failed to delete registration');
      }
    }
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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden w-full max-w-7xl  flex flex-col" role="table" aria-label="PC Registrations Table">
      <div className="p-6 border-b border-slate-200 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-slate-800">PC Registrations</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Add New
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
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

      <div className="flex-1 w-[920px] mb-20 ">
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
              <div className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider flex-shrink-0 w-32" role="columnheader">
                Actions
              </div>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 w-full p-4">
            {displayData.map((reg) => (
              <div key={reg._id} className="flex border-b border-slate-200 hover:bg-slate-50 transition-colors" role="row">
                <div className="px-4 py-3 text-sm text-slate-900 truncate flex-shrink-0 w-40" role="cell">
                  {editingId === reg._id ? (
                    <input
                      type="text"
                      value={editData.centerName}
                      onChange={(e) => setEditData({ ...editData, centerName: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  ) : (
                    <span title={reg.centerName}>{reg.centerName}</span>
                  )}
                </div>
                <div className="px-4 py-3 text-sm text-slate-900 truncate flex-shrink-0 w-40" role="cell">
                  {editingId === reg._id ? (
                    <input
                      type="text"
                      value={editData.centerAddress}
                      onChange={(e) => setEditData({ ...editData, centerAddress: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  ) : (
                    <span title={reg.centerAddress}>{reg.centerAddress}</span>
                  )}
                </div>
                <div className="px-4 py-3 text-sm text-slate-900 flex-shrink-0 w-24" role="cell">
                  {editingId === reg._id ? (
                    <input
                      type="text"
                      value={editData.pcName}
                      onChange={(e) => setEditData({ ...editData, pcName: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  ) : (
                    reg.pcName
                  )}
                </div>
                <div className="px-4 py-3 text-sm font-mono text-slate-900 flex-shrink-0 w-36" role="cell">{reg.macAddress}</div>
                <div className="px-4 py-3 text-sm font-mono text-slate-900 text-xs flex-shrink-0 w-32" role="cell">{reg.uuid}</div>
                <div className="px-4 py-3 text-sm text-slate-900 flex-shrink-0 w-32" role="cell">
                  {editingId === reg._id ? (
                    <input
                      type="text"
                      value={editData.hostname}
                      onChange={(e) => setEditData({ ...editData, hostname: e.target.value })}
                      className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  ) : (
                    reg.hostname
                  )}
                </div>
                <div className="px-4 py-3 text-sm text-slate-900 flex-shrink-0 w-20" role="cell">{reg.platform}</div>
                <div className="px-4 py-3 flex-shrink-0 w-20" role="cell">
                  <select
                    value={reg.status || 'active'}
                    onChange={(e) => updateRegistrationStatus(reg._id, e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="px-4 py-3 text-sm text-slate-900 flex-shrink-0 w-40" role="cell">
                  {new Date(reg.registeredAt).toLocaleString()}
                </div>
                <div className="px-4 py-3 flex-shrink-0 w-32" role="cell">
                  {editingId === reg._id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleSave(reg._id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(reg)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                      >
                        <Edit2 size={12} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(reg._id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Registration</h3>
            {errors.general && <p className="text-red-600 mb-4">{errors.general}</p>}
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Center Name"
                value={newReg.centerName}
                onChange={(e) => setNewReg({ ...newReg, centerName: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.centerName && <p className="text-red-600 text-sm">{errors.centerName}</p>}
              <input
                type="text"
                placeholder="Center Address"
                value={newReg.centerAddress}
                onChange={(e) => setNewReg({ ...newReg, centerAddress: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.centerAddress && <p className="text-red-600 text-sm">{errors.centerAddress}</p>}
              <input
                type="text"
                placeholder="PC Name"
                value={newReg.pcName}
                onChange={(e) => setNewReg({ ...newReg, pcName: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.pcName && <p className="text-red-600 text-sm">{errors.pcName}</p>}
              <input
                type="text"
                placeholder="Hostname"
                value={newReg.hostname}
                onChange={(e) => setNewReg({ ...newReg, hostname: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.hostname && <p className="text-red-600 text-sm">{errors.hostname}</p>}
              <input
                type="text"
                placeholder="MAC Address"
                value={newReg.macAddress}
                onChange={(e) => setNewReg({ ...newReg, macAddress: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.macAddress && <p className="text-red-600 text-sm">{errors.macAddress}</p>}
              <input
                type="text"
                placeholder="UUID"
                value={newReg.uuid}
                onChange={(e) => setNewReg({ ...newReg, uuid: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.uuid && <p className="text-red-600 text-sm">{errors.uuid}</p>}
              <input
                type="text"
                placeholder="Platform"
                value={newReg.platform}
                onChange={(e) => setNewReg({ ...newReg, platform: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.platform && <p className="text-red-600 text-sm">{errors.platform}</p>}
              <select
                value={newReg.status}
                onChange={(e) => setNewReg({ ...newReg, status: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewReg({
                    centerName: '',
                    centerAddress: '',
                    pcName: '',
                    hostname: '',
                    macAddress: '',
                    uuid: '',
                    platform: '',
                    status: 'active'
                  });
                  setErrors({});
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationsTable;