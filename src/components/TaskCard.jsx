import { Check, Trash2, Calendar, Tag, AlertCircle, GripVertical } from 'lucide-react';

export default function TaskCard({ task, draggedTaskId, onDragStart, onDragEnd, onToggleStatus, onDelete }) {
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

  return (
    <div 
      draggable="true"
      onDragStart={(e) => onDragStart(e, task.id)}
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
        
        {task.description && <div className="task-desc">{task.description}</div>}
        
        <div className="task-meta">
          {task.dueDate && (
            <span className={`meta-item ${isOverdue(task.dueDate) && task.status !== 'completed' ? 'overdue' : ''}`}>
              <Calendar size={12} /> 
              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
          
          {task.tags && task.tags.length > 0 && task.tags.map(tag => (
            <span key={tag} className="meta-tag">
              <Tag size={10} /> {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="task-actions">
        <button className="btn-icon" onClick={() => onDelete(task.id)}>
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
