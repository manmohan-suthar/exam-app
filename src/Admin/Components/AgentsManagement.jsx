import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Users, Edit, Trash2, UserCheck, UserX } from 'lucide-react';

const AgentsManagement = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    agent_id: '',
    password: ''
  });
  const [editingAgent, setEditingAgent] = useState(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/admin/agents`);
      setAgents(response.data.agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      alert('Error fetching agents');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingAgent) {
        // Update agent
        await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/agents/${editingAgent._id}`, {
          name: formData.name,
          agent_id: formData.agent_id,
          status: formData.status
        });
        alert('Agent updated successfully!');
      } else {
        // Create new agent
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/admin/agents`, formData);
        alert('Agent created successfully!');
      }

      setFormData({ name: '', agent_id: '', password: '' });
      setShowCreateForm(false);
      setEditingAgent(null);
      fetchAgents();
    } catch (error) {
      console.error('Error saving agent:', error);
      alert(error.response?.data?.error || 'Error saving agent');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      agent_id: agent.agent_id,
      password: '', // Don't show existing password
      status: agent.status
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (agentId) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/admin/agents/${agentId}`);
      alert('Agent deleted successfully!');
      fetchAgents();
    } catch (error) {
      console.error('Error deleting agent:', error);
      alert(error.response?.data?.error || 'Error deleting agent');
    }
  };

  const toggleAgentStatus = async (agentId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await axios.put(`${import.meta.env.VITE_API_BASE_URL}/admin/agents/${agentId}`, { status: newStatus });
      alert(`Agent ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      fetchAgents();
    } catch (error) {
      console.error('Error updating agent status:', error);
      alert('Error updating agent status');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', agent_id: '', password: '' });
    setEditingAgent(null);
    setShowCreateForm(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-slate-800">Agents Management</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <UserPlus size={16} />
          Add Agent
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-medium text-slate-800 mb-4">
            {editingAgent ? 'Edit Agent' : 'Create New Agent'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter agent name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Agent ID *
                </label>
                <input
                  type="text"
                  name="agent_id"
                  value={formData.agent_id}
                  onChange={handleInputChange}
                  required
                  disabled={!!editingAgent} // Can't change ID when editing
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                  placeholder="e.g., AGT001"
                />
              </div>
            </div>

            {!editingAgent && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingAgent}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Enter password"
                />
              </div>
            )}

            {editingAgent && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status || 'active'}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Saving...' : (editingAgent ? 'Update Agent' : 'Create Agent')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-slate-500 hover:bg-slate-600 text-white px-6 py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Agents List */}
      <div className="bg-slate-50 rounded-lg p-6">
        <h4 className="text-lg font-medium text-slate-800 mb-4">Agents ({agents.length})</h4>

        {agents.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No agents created yet</p>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div key={agent._id} className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-slate-800">{agent.name}</p>
                    <p className="text-sm text-slate-600">ID: {agent.agent_id}</p>
                    <p className="text-xs text-slate-500">
                      Created: {new Date(agent.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      agent.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {agent.status}
                    </span>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(agent)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit agent"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => toggleAgentStatus(agent._id, agent.status)}
                        className={`p-2 rounded ${
                          agent.status === 'active'
                            ? 'text-orange-600 hover:bg-orange-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={agent.status === 'active' ? 'Deactivate agent' : 'Activate agent'}
                      >
                        {agent.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>

                      <button
                        onClick={() => handleDelete(agent._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete agent"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentsManagement;