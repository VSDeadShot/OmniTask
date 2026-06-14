import { FolderDot } from 'lucide-react';
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
  onDelete 
}) {
  return (
    <div 
      className="glass-panel project-section transition-all duration-200"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, project)}
    >
      <h3 className="project-title">
        <FolderDot className="text-accent" /> {project}
      </h3>
      <div className="task-list min-h-[50px]">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task}
            draggedTaskId={draggedTaskId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
