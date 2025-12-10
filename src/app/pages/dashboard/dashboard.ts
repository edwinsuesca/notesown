import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { NoteService } from '../../services/note.service';
import { FolderService } from '../../services/folder.service';
import { Note } from '../../models/note.model';
import { Folder } from '../../models/folder.model';

interface FolderWithStats extends Folder {
  noteCount: number;
  lastUpdate: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, SkeletonModule],
  template: `
    <div class="min-h-screen p-6">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-bold text-surface-900 dark:text-surface-100 mb-2">
          Dashboard
        </h1>
        <p class="text-surface-600 dark:text-surface-400">
          Bienvenido a tu espacio de notas
        </p>
      </div>

      <!-- Notas Recientes -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-100">
            Notas Recientes
          </h2>
        </div>

        @if (loadingRecent()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            @for (i of [1,2,3,4]; track i) {
              <p-card>
                <p-skeleton width="100%" height="2rem" styleClass="mb-2"></p-skeleton>
                <p-skeleton width="100%" height="1rem"></p-skeleton>
              </p-card>
            }
          </div>
        }

        @if (!loadingRecent() && recentNotes().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            @for (note of recentNotes(); track note.id) {
              <p-card 
                [header]="note.name"
                styleClass="cursor-pointer hover:shadow-lg transition-shadow"
                (click)="openNote(note)">
                <div class="text-surface-600 dark:text-surface-400 text-sm space-y-1">
                  <p>
                    <i class="pi pi-clock mr-1"></i>
                    {{ formatRelativeTime(note.read_at) }}
                  </p>
                </div>
                <ng-template pTemplate="footer">
                  <p-button 
                    icon="pi pi-eye" 
                    label="Abrir"
                    [text]="true"
                    size="small"
                    (onClick)="openNote(note); $event.stopPropagation()">
                  </p-button>
                </ng-template>
              </p-card>
            }
          </div>
        }

        @if (!loadingRecent() && recentNotes().length === 0) {
          <div class="text-center py-12 bg-surface-50 dark:bg-surface-800 rounded-lg">
            <i class="pi pi-file text-4xl text-surface-400 mb-3"></i>
            <p class="text-surface-600 dark:text-surface-400">
              No hay notas recientes
            </p>
          </div>
        }
      </div>

      <!-- Carpetas -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-semibold text-surface-900 dark:text-surface-100">
            Todas las Carpetas
          </h2>
        </div>

        @if (loadingFolders()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (i of [1,2,3,4,5,6]; track i) {
              <p-card>
                <p-skeleton width="100%" height="2rem" styleClass="mb-2"></p-skeleton>
                <p-skeleton width="60%" height="1rem" styleClass="mb-1"></p-skeleton>
                <p-skeleton width="80%" height="1rem"></p-skeleton>
              </p-card>
            }
          </div>
        }

        @if (!loadingFolders() && folders().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (folder of folders(); track folder.id) {
              <p-card 
                styleClass="cursor-pointer hover:shadow-lg transition-shadow"
                (click)="openFolder(folder.id)">
                <div class="flex items-start gap-3">
                  <i class="pi pi-folder text-3xl text-primary mt-1"></i>
                  <div class="flex-1">
                    <h3 class="text-xl font-semibold text-surface-900 dark:text-surface-100 mb-2">
                      {{ folder.name }}
                    </h3>
                    <div class="text-surface-600 dark:text-surface-400 text-sm space-y-1">
                      <p>
                        <i class="pi pi-file mr-1"></i>
                        {{ folder.noteCount }} {{ folder.noteCount === 1 ? 'nota' : 'notas' }}
                      </p>
                      <p>
                        <i class="pi pi-clock mr-1"></i>
                        Actualizada {{ formatRelativeTime(folder.lastUpdate) }}
                      </p>
                    </div>
                  </div>
                </div>
                <ng-template pTemplate="footer">
                  <p-button 
                    icon="pi pi-arrow-right" 
                    label="Ver carpeta"
                    [text]="true"
                    size="small"
                    (onClick)="openFolder(folder.id); $event.stopPropagation()">
                  </p-button>
                </ng-template>
              </p-card>
            }
          </div>
        }

        @if (!loadingFolders() && folders().length === 0) {
          <div class="text-center py-12 bg-surface-50 dark:bg-surface-800 rounded-lg">
            <i class="pi pi-folder-open text-4xl text-surface-400 mb-3"></i>
            <p class="text-surface-600 dark:text-surface-400">
              No hay carpetas creadas
            </p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class Dashboard implements OnInit, OnDestroy {
  recentNotes = signal<Note[]>([]);
  folders = signal<FolderWithStats[]>([]);
  loadingRecent = signal(true);
  loadingFolders = signal(true);
  
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
}
