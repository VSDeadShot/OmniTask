import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, CheckCircle, Clock } from 'lucide-react';

export default function Analytics({ tasks }) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const statusData = [
    { name: 'Completed', value: completedTasks },
    { name: 'Pending', value: pendingTasks }
  ];
  const COLORS = ['#10b981', '#6366f1'];

  const projectStats = tasks.reduce((acc, task) => {
    const rawProject = task.project || 'Uncategorized';
    const normalizedKey = rawProject.toLowerCase().replace(/\s+/g, '');
    
    const existingKey = Object.keys(acc).find(k => k.toLowerCase().replace(/\s+/g, '') === normalizedKey);
    const displayKey = existingKey ? existingKey : rawProject;

    if (!acc[displayKey]) {
      acc[displayKey] = { name: displayKey, completed: 0, pending: 0 };
    }
    if (task.status === 'completed') acc[displayKey].completed += 1;
    else acc[displayKey].pending += 1;
    return acc;
  }, {});
  const projectData = Object.values(projectStats).sort((a, b) => (b.completed + b.pending) - (a.completed + a.pending));

  return (
    <div className="analytics-container animate-fade-in">
      
      {/* Top Stats Cards */}
      <div className="analytics-stats-grid">
        <div className="glass-panel stat-card">
          <Target className="stat-icon text-primary" size={32} />
          <h3 className="stat-title">Total Tasks</h3>
          <p className="stat-value">{totalTasks}</p>
        </div>
        <div className="glass-panel stat-card">
          <CheckCircle className="stat-icon text-success" size={32} />
          <h3 className="stat-title">Completed</h3>
          <p className="stat-value text-success">{completedTasks}</p>
        </div>
        <div className="glass-panel stat-card">
          <Clock className="stat-icon text-warning" size={32} />
          <h3 className="stat-title">Completion Rate</h3>
          <p className="stat-value text-warning">{completionRate}%</p>
        </div>
      </div>

      <div className="analytics-charts-grid">
        {/* Status Pie Chart */}
        <div className="glass-panel chart-card">
          <h3 className="chart-title">Task Status Overview</h3>
          {totalTasks > 0 ? (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="empty-chart">No tasks available to chart.</p>
          )}
        </div>

        {/* Project Bar Chart */}
        <div className="glass-panel chart-card">
          <h3 className="chart-title">Workload by Project</h3>
          {projectData.length > 0 ? (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#666" tick={{fill: '#999', fontSize: 12}} />
                  <YAxis stroke="#666" tick={{fill: '#999'}} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #333', borderRadius: '8px' }}
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  />
                  <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="pending" stackId="a" fill="#6366f1" name="Pending" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="empty-chart">No project data available.</p>
          )}
        </div>
      </div>

    </div>
  );
}
