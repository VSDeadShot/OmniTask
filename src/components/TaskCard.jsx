import { useState } from 'react';
import { Check, CheckCircle2, Trash2, Calendar, Tag, AlertCircle, GripVertical, Folder } from 'lucide-react';

export default function TaskCard({ task, draggedTaskId, onDragStart, onDragEnd, onToggleStatus, onUpdateTask, onDelete }) {
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(task.description || '');
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectValue, setProjectValue] = useState(task.project || '');

  const handleProjectBlur = () => {
    setIsEditingProject(false);
    if (projectValue !== task.project && projectValue.trim() !== '') {
      onUpdateTask(task.id, { project: projectValue.trim() });
    }
  };

  const handleProjectKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  };

  const getPriorityClass = (level) => {
    switch(level) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  const isOverdue = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date(new Date().setHours(0,0,0,0));
  };

  const handleDescBlur = () => {
    setIsEditingDesc(false);
    if (descValue !== task.description) {
      onUpdateTask(task.id, { description: descValue });
    }
  };

  const handleDescKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.target.blur();
    }
  };

  return (
    <div 
      draggable={!isEditingDesc ? "true" : "false"}
      onDragStart={(e) => { if(!isEditingDesc) onDragStart(e, task.id); }}
      onDragEnd={onDragEnd}
      className={`glass-panel task-card cursor-grab ${task.status === 'completed' ? 'completed' : ''} ${getPriorityClass(task.priority)} ${draggedTaskId === task.id ? 'opacity-50' : ''}`}
    >
      <div className="drag-handle text-gray-500 pt-1">
        <GripVertical size={16} />
      </div>

      <button 
        className={`status-btn ${task.status === 'completed' ? 'checked' : ''}`}
        onClick={() => onToggleStatus(task)}
      >
        {task.status === 'completed' && <Check size={16} />}
      </button>
      
      <div className="task-content">
        <div className="task-title-row">
          <span className="task-title">{task.title}</span>
          {task.priority === 'high' && <AlertCircle size={14} className="text-red-400" />}
        </div>
        
        {isEditingDesc ? (
          <textarea
            className="task-desc-input"
            value={descValue}
            onChange={(e) => setDescValue(e.target.value)}
            onBlur={handleDescBlur}
            onKeyDown={handleDescKeyDown}
            autoFocus
            style={{ 
              width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', 
              color: 'var(--text-muted)', borderRadius: '4px', padding: '4px', fontSize: '0.85rem', 
              resize: 'none', minHeight: '40px', outline: 'none' 
            }}
          />
        ) : (
          <div 
            className="task-desc" 
            onClick={() => setIsEditingDesc(true)}
            style={{ cursor: 'text', minHeight: task.description ? 'auto' : '20px' }}
            title="Click to edit description"
          >
            {task.description || <span style={{ opacity: 0.3, fontStyle: 'italic' }}>Add description...</span>}
          </div>
        )}
        
        <div className="task-meta">
          {task.dueDate ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span className={`meta-item ${isOverdue(task.dueDate) && task.status !== 'completed' ? 'overdue' : ''}`} style={{ cursor: 'pointer' }}>
                <Calendar size={12} /> 
                {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <input 
                type="date" 
                title="Change Deadline"
                value={new Date(task.dueDate).toISOString().split('T')[0]}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => onUpdateTask(task.id, { dueDate: e.target.value || null })}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />
            </div>
          ) : (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span className="meta-item" style={{ cursor: 'pointer', opacity: 0.5 }}>
                <Calendar size={12} /> Add Date
              </span>
              <input 
                type="date" 
                title="Add Deadline"
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => onUpdateTask(task.id, { dueDate: e.target.value || null })}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />
            </div>
          )}
          
          {task.tags && task.tags.length > 0 && task.tags.map(tag => (
            <span key={tag} className="meta-tag">
              <Tag size={10} /> {tag}
            </span>
          ))}
          
          {isEditingProject ? (
            <input
              type="text"
              value={projectValue}
              onChange={(e) => setProjectValue(e.target.value)}
              onBlur={handleProjectBlur}
              onKeyDown={handleProjectKeyDown}
              autoFocus
              className="meta-item meta-tag"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--accent)', color: 'white', width: '90px', padding: '0 4px', outline: 'none', borderRadius: '4px' }}
            />
          ) : (
            <span 
              className="meta-item meta-tag" 
              onClick={() => setIsEditingProject(true)}
              style={{ cursor: 'pointer', opacity: 0.8 }}
              title="Click to change project"
            >
              <Folder size={10} /> {task.project ? task.project.replace(/omni\s+task/gi, 'OmniTask') : 'Uncategorized'}
            </span>
          )}
        </div>
      </div>

      <div className="task-actions flex gap-2">
        <button 
          className="btn-icon text-green-500 hover:text-green-400" 
          onClick={() => onToggleStatus(task)}
          title={task.status === 'completed' ? "Mark Pending" : "Mark Done"}
        >
          <CheckCircle2 size={18} />
        </button>
        <button 
          className="btn-icon text-red-500 hover:text-red-400" 
          onClick={() => onDelete(task.id)}
          title="Delete Task"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
