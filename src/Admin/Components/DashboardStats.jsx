import React from 'react';
import { Monitor, Users, Settings, TrendingUp, Activity } from 'lucide-react';

const DashboardStats = ({ registrations, students }) => {
  const stats = [
    {
      title: 'Total Registrations',
      value: registrations.length,
      icon: Monitor,
      color: 'bg-blue-500',
      trend: '+12%'
    },
    {
      title: 'Total Students',
      value: students.length,
      icon: Users,
      color: 'bg-green-500',
      trend: '+8%'
    },
    {
      title: 'Active Admins',
      value: students.filter(s => s.role === 'admin').length,
      icon: Settings,
      color: 'bg-purple-500',
      trend: '0%'
    },
    {
      title: 'System Health',
      value: '98%',
      icon: Activity,
      color: 'bg-teal-500',
      trend: '+2%'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">{stat.title}</p>
                <p className="text-3xl font-bold text-slate-800 mt-2">{stat.value}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp size={14} className="text-green-500 mr-1" />
                  <span className="text-green-500 text-sm font-medium">{stat.trend}</span>
                  <span className="text-slate-500 text-sm ml-1">vs last month</span>
                </div>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <Icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;