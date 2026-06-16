import { useState, useEffect } from 'react';
import { Sparkles, LayoutDashboard, BarChart3, CheckCircle2, Trash2, Settings as SettingsIcon, Timer } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ProjectColumn from './components/ProjectColumn';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Pomodoro from './components/Pomodoro';
import './App.css';

const API_URL = 'http://localhost:3001/api/tasks';

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchTasks = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // Refresh periodically if cli changes it behind the scenes
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddTask = async (newTaskData) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskData)
      });
      const newTask = await response.json();
      setTasks([...tasks, newTask]);
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  const toggleStatus = async (task) => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    try {
      const response = await fetch(`${API_URL}/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, status: newStatus })
      });
      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const completeProjectTasks = async (project) => {
    const projectTasks = tasks.filter(t => t.project === project && t.status === 'pending');
    if (projectTasks.length === 0) return;
    
    try {
      const updatedPromises = projectTasks.map(task => 
        fetch(`${API_URL}/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' })
        }).then(res => res.json())
      );
      
      const updatedTasks = await Promise.all(updatedPromises);
      
      setTasks(currentTasks => currentTasks.map(t => {
        const updated = updatedTasks.find(ut => ut.id === t.id);
        return updated ? updated : t;
      }));
    } catch (error) {
      console.error("Failed to bulk update tasks:", error);
    }
  };

  const deleteTask = async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedTaskId(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = async (e, toProject) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.project === toProject) return;

    setTasks(tasks.map(t => t.id === taskId ? { ...t, project: toProject } : t));

    try {
      await fetch(`${API_URL}/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: toProject })
      });
    } catch (error) {
      console.error("Failed to move task:", error);
      fetchTasks();
    }
  };

  // Group pending tasks for Dashboard view
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const tasksByProject = pendingTasks.reduce((acc, task) => {
    if (!acc[task.project]) acc[task.project] = [];
    acc[task.project].push(task);
    return acc;
  }, {});

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const projects = Object.keys(tasksByProject).sort();

  return (
    <>
      <header className="app-header">
        <h1><Sparkles className="inline-block mr-2 text-accent" size={36} /> OmniTask</h1>
        
        <div className="nav-tabs">
          <button 
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button 
            className={`nav-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <CheckCircle2 size={18} /> Completed
          </button>
          <button 
            className={`nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={18} /> Analytics
          </button>
          <button 
            className={`nav-btn ${activeTab === 'focus' ? 'active' : ''}`}
            onClick={() => setActiveTab('focus')}
          >
            <Timer size={18} /> Focus
          </button>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 8px' }}></div>
          <button 
            className="nav-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </header>
      
      {activeTab === 'dashboard' ? (
        <div className="app-container">
          <Sidebar onAddTask={handleAddTask} />
          <main className="main-content">
            {loading ? (
              <div className="glass-panel text-center p-8">Loading your tasks...</div>
            ) : projects.length === 0 ? (
              <div className="glass-panel empty-state animate-fade-in">
                <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                <h3>All caught up!</h3>
                <p>Add a task to start tracking your cross-project work.</p>
              </div>
            ) : (
              projects.map((proj) => (
                <ProjectColumn 
                  key={proj}
                  project={proj}
                  tasks={tasksByProject[proj]}
                  draggedTaskId={draggedTaskId}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onToggleStatus={toggleStatus}
                  onDelete={deleteTask}
                  onCompleteAll={() => completeProjectTasks(proj)}
                />
              ))
            )}
          </main>
        </div>
      ) : activeTab === 'completed' ? (
        <div className="completed-view">
          <div className="glass-panel p-6">
            <h2 className="project-title mb-4"><CheckCircle2 className="text-success" /> Completed Tasks</h2>
            {completedTasks.length === 0 ? (
              <div className="empty-state">No completed tasks yet.</div>
            ) : (
              <div className="task-list">
                {completedTasks.map(task => (
                  <div key={task.id} className="glass-panel task-card completed p-4">
                    <button 
                      className="status-btn checked"
                      onClick={() => toggleStatus(task)}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <div className="task-content">
                      <div className="task-title-row">
                        <span className="task-title">{task.title}</span>
                      </div>
                      <div className="task-meta">
                        <span className="meta-item">{task.project}</span>
                        {task.dueDate && <span className="meta-item">{task.dueDate}</span>}
                      </div>
                    </div>
                    <div className="task-actions">
                      <button className="status-btn" style={{color: '#f87171', borderColor: 'rgba(248,113,113,0.2)'}} onClick={() => deleteTask(task.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'focus' ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '75vh' }}>
          <Pomodoro />
        </div>
      ) : (
        <Analytics tasks={tasks} />
      )}
      
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}

export default App;
