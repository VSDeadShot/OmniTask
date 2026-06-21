import { FolderDot, CheckSquare } from 'lucide-react';
import TaskCard from './TaskCard';

export default function ProjectColumn({ 
  project, 
  tasks, 
  draggedTaskId, 
  onDragStart, 
  onDragEnd, 
  onDragOver, 
  onDragLeave, 
  onDrop, 
  onToggleStatus, 
  onUpdateTask,
  onDelete,
  onCompleteAll
}) {
  return (
    <div 
      className="glass-panel project-section transition-all duration-200"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, project)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
        <h3 className="project-title" style={{ margin: 0, padding: 0, border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FolderDot className="text-accent" /> {project}
        </h3>
        {tasks.length > 0 && (
          <button 
            className="check-all-btn"
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.25rem', 
              fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', 
              background: 'transparent', border: 'none', cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#4ade80'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            onClick={onCompleteAll}
            title="Complete all tasks in this project"
          >
            <CheckSquare size={14} /> Check All
          </button>
        )}
      </div>
      <div className="task-list min-h-[50px]">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task}
            draggedTaskId={draggedTaskId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onToggleStatus={onToggleStatus}
            onUpdateTask={onUpdateTask}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
