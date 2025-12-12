import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { NoteService } from '../../services/note.service';
import { FolderService } from '../../services/folder.service';
import { Note } from '../../models/note.model';
import { Folder } from '../../models/folder.model';
import { RecentNoteCard } from '../../components/recent-note-card/recent-note-card';
import { FolderCard } from '../../components/folder-card/folder-card';

interface FolderWithStats extends Folder {
  noteCount: number;
  lastUpdate: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    CardModule, 
    ButtonModule, 
    SkeletonModule,
    DialogModule,
    InputTextModule,
    FormsModule,
    RecentNoteCard,
    FolderCard
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
  recentNotes = signal<Note[]>([]);
  folders = signal<FolderWithStats[]>([]);
  loadingRecent = signal(true);
  loadingFolders = signal(true);
  
  // Diálogo de crear carpeta
  createFolderDialogVisible = false;
  newFolderName = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private noteService: NoteService,
    private folderService: FolderService
  ) {}

  ngOnInit(): void {
    this.loadRecentNotes();
    this.loadFoldersWithStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRecentNotes(): void {
    this.loadingRecent.set(true);
    
    this.noteService.getRecentlyReadNotes(4)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notes) => {
          this.recentNotes.set(notes);
          this.loadingRecent.set(false);
        },
        error: (error) => {
          console.error('Error al cargar notas recientes:', error);
          this.loadingRecent.set(false);
        }
      });
  }

  private loadFoldersWithStats(): void {
    this.loadingFolders.set(true);

    forkJoin({
      folders: this.folderService.getFolders(),
      notes: this.noteService.getNotes()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ folders, notes }) => {
          // Calcular estadísticas para cada carpeta
          const foldersWithStats: FolderWithStats[] = folders.map(folder => {
            // Notas de esta carpeta
            const folderNotes = notes.filter(note => note.folder_id === folder.id);
            
            // Última actualización: la más reciente entre la carpeta y sus notas
            const dates = [
              folder.updated_at,
              ...folderNotes.map(note => note.updated_at).filter(Boolean)
            ].filter(Boolean) as string[];
            
            const lastUpdate = dates.length > 0 
              ? dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
              : folder.created_at;

            return {
              ...folder,
              noteCount: folderNotes.length,
              lastUpdate
            };
          });

          // Ordenar por última actualización (más reciente primero)
          foldersWithStats.sort((a, b) => 
            new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()
          );

          this.folders.set(foldersWithStats);
          this.loadingFolders.set(false);
        },
        error: (error) => {
          console.error('Error al cargar carpetas:', error);
          this.loadingFolders.set(false);
        }
      });
  }

  openNote(note: Note): void {
    this.router.navigate([note.folder_id, note.id]);
  }

  openFolder(folderId: number): void {
    this.router.navigate([folderId]);
  }

  formatRelativeTime(dateString?: string): string {
    if (!dateString) return 'hace un momento';
    
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

  /**
   * Muestra el diálogo para crear una nueva carpeta
   */
  showCreateFolderDialog(): void {
    this.newFolderName = '';
    this.createFolderDialogVisible = true;
  }

  /**
   * Crea una nueva carpeta con el nombre ingresado
   */
  createNewFolder(): void {
    if (!this.newFolderName.trim()) {
      this.createFolderDialogVisible = false;
      return;
    }

    this.folderService.createFolder({ name: this.newFolderName.trim() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newFolder) => {
          // Recargar carpetas
          this.loadFoldersWithStats();
          
          // Navegar a la nueva carpeta
          this.router.navigate([newFolder.id]);
          
          // Cerrar el diálogo
          this.createFolderDialogVisible = false;
        },
        error: (error) => {
          console.error('Error al crear carpeta:', error);
          this.createFolderDialogVisible = false;
        }
      });
  }

  /**
   * Cancela la creación de carpeta
   */
  cancelCreateFolder(): void {
    this.createFolderDialogVisible = false;
    this.newFolderName = '';
  }
}
