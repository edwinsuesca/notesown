import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenuItem, ConfirmationService } from 'primeng/api';
import { NoteService } from '../../services/note.service';
import { FolderService } from '../../services/folder.service';
import { EditorStateService } from '../../services/editor-state.service';
import { Note } from '../../models/note.model';
import { Folder } from '../../models/folder.model';

@Component({
  selector: 'app-folder-view',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, SkeletonModule, BreadcrumbModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  template: `
    <div class="min-h-screen p-4">
      <!-- Breadcrumb -->
      @if (folder() && !error()) {
        <div class="mb-4">
          <p-breadcrumb 
            [model]="breadcrumbItems()" 
            [home]="breadcrumbHome"
            styleClass="!bg-transparent border-0 p-0">
          </p-breadcrumb>
        </div>
      }

      <!-- Header -->
      @if (folder() && !error()) {
        <div class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-3 flex-1">
              <i class="pi pi-folder !text-3xl text-primary"></i>
              <h1 
                contenteditable="true"
                (blur)="updateFolderName($any($event.target).textContent || folder()?.name || '')"
                class="!text-3xl font-bold text-surface-900 dark:text-surface-100 outline-none focus:ring-2 focus:ring-primary rounded px-2 !m-0 transition-all cursor-text"
                [textContent]="folder()?.name">
              </h1>

              <span class="!text-surface-600 dark:text-surface-400">
                ({{ notes().length }} {{ notes().length === 1 ? 'nota' : 'notas' }})
              </span>
            </div>
            <p-button
              icon="pi pi-trash"
              severity="danger"
              [outlined]="true"
              (onClick)="confirmDeleteFolder()"
              pTooltip="Eliminar carpeta"
              tooltipPosition="left">
            </p-button>
          </div>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <i class="pi pi-exclamation-triangle text-6xl text-red-500 mb-4"></i>
          <h2 class="text-2xl font-semibold text-surface-700 dark:text-surface-300 mb-2">
            Error
          </h2>
          <p class="text-surface-600 dark:text-surface-400 mb-6">
            {{ error() }}
          </p>
          <p-button
            icon="pi pi-home"
            label="Ir a inicio"
            (onClick)="router.navigate(['/dashboard'])"
            severity="secondary">
          </p-button>
        </div>
      }

      <!-- Loading State -->
      @if (loading() && !error()) {
        <div class="flex flex-wrap gap-4">
          @for (i of [1,2,3,4,5,6]; track i) {
            <p-card styleClass="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)]">
              <p-skeleton width="100%" height="2rem" styleClass="mb-2"></p-skeleton>
              <p-skeleton width="100%" height="4rem"></p-skeleton>
            </p-card>
          }
        </div>
      }

      <!-- Notes Grid -->
      @if (!loading() && notes().length > 0) {
        <div class="flex flex-wrap gap-4">
          @for (note of notes(); track note.id) {
            <p-card 
              [header]="note.name"
              styleClass="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)] cursor-pointer hover:shadow-lg transition-shadow"
              (click)="openNote(note.id)">
              <div class="text-surface-600 dark:text-surface-400 text-sm">
                <p>Creada: {{ formatDate(note.created_at) }}</p>
              </div>
              <ng-template pTemplate="footer">
                <div class="flex gap-2">
                  <p-button 
                    icon="pi pi-eye" 
                    label="Abrir"
                    [text]="true"
                    (onClick)="openNote(note.id); $event.stopPropagation()">
                  </p-button>
                </div>
              </ng-template>
            </p-card>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && notes().length === 0 && folder()) {
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <i class="pi pi-folder-open !text-6xl text-surface-300 dark:text-surface-600 mb-4"></i>
          <h2 class="!text-xl font-semibold text-surface-700 dark:text-surface-300 mb-2">
            No hay notas en {{ folder()?.name }}
          </h2>
          <p class="text-surface-500 dark:text-surface-400 mb-6">
            Crea tu primera nota en esta carpeta
          </p>
          <p-button
            icon="pi pi-plus"
            label="Nueva nota"
            (onClick)="createNewNote()"
            severity="primary"
            size="large">
          </p-button>
        </div>
      }
    </div>

    <!-- Confirm Dialog -->
    <p-confirmDialog></p-confirmDialog>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class FolderView implements OnInit, OnDestroy {
  folder = signal<Folder | null>(null);
  notes = signal<Note[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  breadcrumbItems = signal<MenuItem[]>([]);

  breadcrumbHome: MenuItem = {
    icon: 'pi pi-home',
    label: 'Inicio',
    command: () => this.router.navigate(['/dashboard'])
  };

  private destroy$ = new Subject<void>();
  private folderId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private noteService: NoteService,
    private folderService: FolderService,
    private editorState: EditorStateService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const folderId = parseInt(params['folderId'], 10);
        if (!isNaN(folderId)) {
          this.folderId = folderId;
          this.loadFolderData(folderId);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFolderData(folderId: number): void {
    this.loading.set(true);
    this.error.set(null);

    // Cargar información de la carpeta
    this.folderService.getFolderById(folderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (folder) => {
          if (!folder) {
            this.error.set(`No se encontró la carpeta con ID ${folderId}`);
            this.loading.set(false);
            return;
          }

          this.folder.set(folder);

          // Configurar breadcrumb
          this.breadcrumbItems.set([
            { label: this.truncateText(folder.name, 30) }
          ]);

          // Establecer carpeta seleccionada en el estado global
          this.editorState.setSelectedFolder({
            id: folder.id,
            name: folder.name
          });

          // Limpiar nota seleccionada
          this.editorState.setSelectedNote(null);
        },
        error: (error) => {
          console.error('Error al cargar carpeta:', error);
          this.error.set(`No se encontró la carpeta con ID ${folderId}`);
          this.loading.set(false);
        }
      });

    // Cargar notas de la carpeta
    this.noteService.getNotesByFolder(folderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notes) => {
          this.notes.set(notes);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error al cargar notas:', error);
          if (!this.error()) {
            this.error.set('Error al cargar las notas de la carpeta');
          }
          this.loading.set(false);
        }
      });
  }

  openNote(noteId: number): void {
    if (this.folderId) {
      this.router.navigate([this.folderId, noteId]);
    }
  }

  createNewNote(): void {
    if (!this.folderId) return;

    this.noteService.createNote({
      name: 'Nueva Nota',
      folder_id: this.folderId
    }).subscribe({
      next: (newNote) => {
        this.editorState.notifyNoteCreated();
        this.openNote(newNote.id);
      },
      error: (error) => {
        console.error('Error al crear nota:', error);
      }
    });
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Sin fecha';

    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  updateFolderName(newName: string): void {
    const trimmedName = newName.trim();
    const currentFolder = this.folder();

    if (!currentFolder || !trimmedName || trimmedName === currentFolder.name) {
      return;
    }

    this.folderService.updateFolder(currentFolder.id, { name: trimmedName })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedFolder) => {
          this.folder.set(updatedFolder);

          // Actualizar breadcrumb
          this.breadcrumbItems.set([
            { label: this.truncateText(updatedFolder.name, 30) }
          ]);

          // Actualizar estado global
          this.editorState.setSelectedFolder({
            id: updatedFolder.id,
            name: updatedFolder.name
          });

          // Refrescar árbol de notas
          this.editorState.notifyNoteCreated();
        },
        error: (error) => {
          console.error('Error al actualizar nombre de carpeta:', error);
        }
      });
  }

  confirmDeleteFolder(): void {
    const currentFolder = this.folder();
    const notesList = this.notes();

    if (!currentFolder) return;

    // Crear lista HTML de notas
    let notesListHtml = '';
    if (notesList.length > 0) {
      notesListHtml = '<ul class="text-left mt-3 mb-0">';
      notesList.forEach(note => {
        notesListHtml += `<li class="mb-1">• ${note.name}</li>`;
      });
      notesListHtml += '</ul>';
    }

    this.confirmationService.confirm({
      header: '¿Eliminar carpeta?',
      message: notesList.length > 0
        ? `Se eliminarán las siguientes ${notesList.length} ${notesList.length === 1 ? 'nota' : 'notas'}:${notesListHtml}`
        : `¿Estás seguro de que deseas eliminar la carpeta "${currentFolder.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteFolder();
      }
    });
  }

  private deleteFolder(): void {
    const currentFolder = this.folder();
    if (!currentFolder) return;

    this.folderService.deleteFolder(currentFolder.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Refrescar árbol de notas
          this.editorState.notifyNoteCreated();

          // Navegar al dashboard
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Error al eliminar carpeta:', error);
        }
      });
  }
}
