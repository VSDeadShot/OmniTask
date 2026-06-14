import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ProjectColumn from './components/ProjectColumn';
import './App.css';

const API_URL = 'http://localhost:3001/api/tasks';

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

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

  const deleteTask = async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  // --- Drag and Drop Handlers ---
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

    // Optimistic Update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, project: toProject } : t));

    // Update Backend
    try {
      await fetch(`${API_URL}/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: toProject })
      });
    } catch (error) {
      console.error("Failed to move task:", error);
      fetchTasks(); // Revert
    }
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
      <h1><Sparkles className="inline-block mr-2 text-accent" size={36} /> OmniTask</h1>
      
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
              />
            ))
          )}
        </main>
      </div>
    </>
  );
}

export default App;
