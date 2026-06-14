import { useState, useEffect } from 'react';
import { Plus, Check, Trash2, FolderDot, Sparkles, Calendar, Tag, AlertCircle } from 'lucide-react';
import './App.css';

const API_URL = 'http://localhost:3001/api/tasks';

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [project, setProject] = useState('General');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');

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
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          project, 
          title, 
          description, 
          status: 'pending',
          priority,
          dueDate: dueDate || null,
          tags: tagsArray
        })
      });
      const newTask = await response.json();
      setTasks([...tasks, newTask]);
      
      // Reset form
      setTitle('');
      setDescription('');
      setTagsInput('');
      setDueDate('');
      setPriority('medium');
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

  const deleteTask = async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const getPriorityColor = (level) => {
    switch(level) {
      case 'high': return 'text-red-400 border-red-500/50 bg-red-500/10';
      case 'medium': return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
      case 'low': return 'text-blue-400 border-blue-500/50 bg-blue-500/10';
      default: return 'text-gray-400 border-gray-500/50 bg-gray-500/10';
    }
  };

  const isOverdue = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date(new Date().setHours(0,0,0,0));
  };

  // Group tasks by project
  const tasksByProject = tasks.reduce((acc, task) => {
    if (!acc[task.project]) acc[task.project] = [];
    acc[task.project].push(task);
    return acc;
  }, {});

  const projects = Object.keys(tasksByProject).sort();

  return (
    <>
      <h1><Sparkles className="inline-block mr-2" size={36} /> OmniTask</h1>
      
      <div className="app-container">
        {/* Sidebar / Add Task */}
        <aside className="sidebar">
          <div className="glass-panel animate-fade-in">
            <h2 className="text-xl font-semibold mb-4 text-primary flex items-center gap-2">
              <Plus size={20} /> New Task
            </h2>
            <form onSubmit={handleSubmit} className="add-task-form">
              <div className="form-group">
                <label>Project</label>
                <input 
                  type="text" 
                  value={project} 
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="e.g. My Website, API Service..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Task Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group half">
                  <label>Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group half">
                  <label>Due Date</label>
                  <input 
                    type="date" 
                    value={dueDate} 
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Tags (comma separated)</label>
                <input 
                  type="text" 
                  value={tagsInput} 
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="e.g. bug, frontend, urgent"
                />
              </div>

              <div className="form-group">
                <label>Details / Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any additional info..."
                  rows={2}
                />
              </div>

              <button type="submit" className="btn-primary mt-2">
                Add to Project
              </button>
            </form>
          </div>
        </aside>

        {/* Main Content / Task List */}
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
            projects.map((proj, index) => (
              <div 
                key={proj} 
                className="glass-panel project-section animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <h3 className="project-title">
                  <FolderDot className="text-accent" /> {proj}
                </h3>
                <div className="task-list">
                  {tasksByProject[proj].map(task => (
                    <div 
                      key={task.id} 
                      className={`glass-panel task-card ${task.status === 'completed' ? 'completed' : ''} priority-${task.priority}`}
                    >
                      <button 
                        className={`status-btn ${task.status === 'completed' ? 'checked' : ''}`}
                        onClick={() => toggleStatus(task)}
                      >
                        {task.status === 'completed' && <Check size={16} />}
                      </button>
                      
                      <div className="task-content">
                        <div className="task-title-row">
                          <span className="task-title">{task.title}</span>
                          {task.priority === 'high' && <AlertCircle size={14} className="text-red-400" />}
                        </div>
                        
                        {task.description && <div className="task-desc">{task.description}</div>}
                        
                        <div className="task-meta">
                          {task.dueDate && (
                            <span className={`meta-item ${isOverdue(task.dueDate) && task.status !== 'completed' ? 'overdue' : ''}`}>
                              <Calendar size={12} /> 
                              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          
                          {task.tags && task.tags.map(tag => (
                            <span key={tag} className="meta-tag">
                              <Tag size={10} /> {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="task-actions">
                        <button className="btn-icon" onClick={() => deleteTask(task.id)}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    </>
  );
}

export default App;
