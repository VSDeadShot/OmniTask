import { useState } from 'react';
import { Plus } from 'lucide-react';
import Pomodoro from './Pomodoro';

export default function Sidebar({ onAddTask }) {
  const [project, setProject] = useState('General');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);

    const newTaskData = {
      project, 
      title, 
      description, 
      status: 'pending',
      priority,
      dueDate: dueDate || null,
      tags: tagsArray
    };

    onAddTask(newTaskData);

    // Reset fields
    setTitle('');
    setDescription('');
    setTagsInput('');
    setDueDate('');
    setPriority('medium');
  };

  return (
    <aside className="sidebar">
      <div className="glass-panel animate-fade-in shadow-xl shadow-primary/10">
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

          <button type="submit" className="btn-primary mt-2 flex items-center justify-center gap-2">
            <Plus size={18} /> Add to {project}
          </button>
        </form>
      </div>

      <Pomodoro />
    </aside>
  );
}
