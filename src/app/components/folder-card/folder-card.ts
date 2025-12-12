import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

export interface FolderCardData {
  id: number;
  name: string;
  noteCount: number;
  lastUpdate: string;
}

@Component({
  selector: 'app-folder-card',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './folder-card.html',
  styleUrl: './folder-card.css'
})
export class FolderCard {
  @Input({ required: true }) folder!: FolderCardData;
  @Output() folderClick = new EventEmitter<number>();

  onFolderClick(): void {
    this.folderClick.emit(this.folder.id);
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'hace un momento';
    if (diffMins < 60) return `hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
    if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    if (diffDays < 7) return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
    }
    
    const years = Math.floor(diffDays / 365);
    return `hace ${years} ${years === 1 ? 'año' : 'años'}`;
  }
}
