import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, finalize } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { NoteService } from '../../services/note.service';
import { FolderService } from '../../services/folder.service';
import { ItemNoteService } from '../../services/item-note.service';
import { SearchService, SearchableNote, GlobalSearchResponse, FolderRow, NoteRow, ItemNoteRow } from '../../services/search.service';
import { Note } from '../../models/note.model';
import { Folder } from '../../models/folder.model';
import { ItemNote } from '../../models/item-note.model';
import { RecentNoteCard } from '../../components/recent-note-card/recent-note-card';
import { FolderCard } from '../../components/folder-card/folder-card';
import { MasonryGrid } from '../../components/masonry-grid/masonry-grid';
import { ReadonlyTextCard } from '../../components/readonly-text-card/readonly-text-card';
import { ReadonlyChecklistCard } from '../../components/readonly-checklist-card/readonly-checklist-card';

interface FolderWithStats extends Folder {
  noteCount: number;
  lastUpdate: string;
}

export interface RecentItem extends ItemNote {
  note: Note;
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
    FolderCard,
    MasonryGrid,
    ReadonlyTextCard,
    ReadonlyChecklistCard
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  recentNotes = signal<Note[]>([]);
  recentItems = signal<RecentItem[]>([]);
  folders = signal<FolderWithStats[]>([]);
  loadingRecent = signal(true);
  loadingRecentItems = signal(true);
  loadingFolders = signal(true);
  
  // Búsqueda
  searchQuery = signal<string>('');
  allNotes = signal<SearchableNote[]>([]);
  allFolders = signal<Folder[]>([]);
  allItems = new Map<number, ItemNote[]>(); // Solo para fallback de búsqueda local (si falla RPC)
  filteredNotes = signal<SearchableNote[]>([]);
  filteredFolders = signal<FolderWithStats[]>([]);
  filteredItems = signal<ItemNoteRow[]>([]); // Items encontrados en la búsqueda
  isSearchMode = signal<boolean>(false);
  isSearching = signal<boolean>(false); // Indicador de búsqueda en progreso
  private searchSubject = new Subject<string>();
  
  // Diálogo de crear carpeta
  createFolderDialogVisible = false;
  newFolderName = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private noteService: NoteService,
    private folderService: FolderService,
    private itemNoteService: ItemNoteService,
    private searchService: SearchService
  ) {
    // Configurar debounce para búsqueda (500ms para reducir peticiones)
    this.searchSubject
      .pipe(
        debounceTime(500), // Espera 500ms después de que el usuario deje de escribir
        distinctUntilChanged(), // Solo busca si el texto cambió
        switchMap(query => {
          // switchMap cancela la búsqueda anterior si hay una nueva
          if (!query || query.trim() === '') {
            // Restaurar datos originales
            this.isSearching.set(false);
            this.filteredFolders.set(this.folders());
            this.filteredNotes.set([]);
            this.filteredItems.set([]);
            return [];
          }

          // Indicar que se está buscando
          this.isSearching.set(true);

          // Realizar búsqueda RPC con entidades completas
          return this.searchService.searchGlobalFullEntities(query).pipe(
            finalize(() => this.isSearching.set(false)) // Siempre desactivar indicador al terminar
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (results) => {
          console.log('🔍 Resultados de búsqueda recibidos:', results);
          
          // Si no hay resultados, salir
          if (!results) {
            console.log('❌ No hay resultados (null/undefined)');
            this.filteredFolders.set([]);
            this.filteredNotes.set([]);
            this.filteredItems.set([]);
            return;
          }

          // Si es un array vacío (del switchMap cuando query está vacío)
          if (Array.isArray(results) && results.length === 0) {
            console.log('⚠️ Array vacío recibido');
            return;
          }

          // results es GlobalSearchResponse
          const result = results as GlobalSearchResponse;
          
          console.log('📊 Procesando resultados:', {
            folders: result.folders?.length || 0,
            notes: result.notes?.length || 0,
            items: result.items?.length || 0
          });

          // Convertir FolderRow a FolderWithStats (null si no hay carpetas)
          const foldersWithStats: FolderWithStats[] = result.folders 
            ? result.folders.map((folder: FolderRow) => ({
                id: folder.id,
                name: folder.name,
                created_at: folder.created_at,
                updated_at: folder.updated_at,
                noteCount: 0,
                lastUpdate: folder.updated_at
              }))
            : [];

          // Convertir NoteRow a Note (null si no hay notas)
          const notes: Note[] = result.notes
            ? result.notes.map((note: NoteRow) => ({
                id: note.id,
                name: note.name,
                folder_id: note.folder_id,
                user_id: note.user_id,
                created_at: note.created_at,
                updated_at: note.updated_at,
                content: note.content
              }))
            : [];

          // Items ya vienen en el formato correcto (null si no hay items)
          const items: ItemNoteRow[] = result.items || [];

          console.log('✅ Actualizando señales:', {
            folders: foldersWithStats.length,
            notes: notes.length,
            items: items.length
          });

          this.filteredFolders.set(foldersWithStats);
          this.filteredNotes.set(notes);
          this.filteredItems.set(items);
        },
        error: (error) => {
          console.error('Error en búsqueda RPC:', error);
          this.isSearching.set(false);
          
          // Fallback a búsqueda local
          const query = this.searchQuery();
          if (query) {
            const results = this.searchService.deepSearch(
              query,
              this.allFolders(),
              this.allNotes(),
              this.allItems
            );

            const filteredFoldersWithStats = this.calculateFolderStats(
              results.folders,
              this.allNotes()
            );
            this.filteredFolders.set(filteredFoldersWithStats);
            this.filteredNotes.set(results.notes);
          }
        }
      });
  }

  ngOnInit(): void {
    this.loadRecentNotes();
    this.loadRecentItems();
    this.loadAllData();
    
    // Verificar si se debe activar el modo búsqueda
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['search'] === 'true') {
          this.isSearchMode.set(true);
        }
      });
  }

  ngAfterViewInit(): void {
    // Si está en modo búsqueda, hacer focus en el input
    if (this.isSearchMode() && this.searchInput) {
      setTimeout(() => {
        this.searchInput.nativeElement.focus();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubject.complete();
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

  /**
   * Carga los últimos 4 contenidos (items) actualizados recientemente
   * Optimizado: una sola consulta a la base de datos
   */
  private loadRecentItems(): void {
    this.loadingRecentItems.set(true);

    // Obtener los últimos 4 items directamente
    this.itemNoteService.getRecentItems(4)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          if (items.length === 0) {
            this.recentItems.set([]);
            this.loadingRecentItems.set(false);
            return;
          }

          // Obtener las notas únicas de estos items
          const uniqueNoteIds = [...new Set(items.map(item => item.note_id))];
          const noteRequests = uniqueNoteIds.map(noteId => 
            this.noteService.getNoteById(noteId)
          );

          forkJoin(noteRequests)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (notes) => {
                // Crear mapa de notas por ID
                const notesMap = new Map(notes.map(note => [note.id, note]));

                // Combinar items con sus notas
                const itemsWithNotes: RecentItem[] = items.map(item => ({
                  ...item,
                  note: notesMap.get(item.note_id)!
                }));

                this.recentItems.set(itemsWithNotes);
                this.loadingRecentItems.set(false);
              },
              error: (error) => {
                console.error('Error al cargar notas de items recientes:', error);
                this.loadingRecentItems.set(false);
              }
            });
        },
        error: (error) => {
          console.error('Error al cargar items recientes:', error);
          this.loadingRecentItems.set(false);
        }
      });
  }

  /**
   * Carga todos los datos necesarios para búsqueda y visualización
   */
  private loadAllData(): void {
    this.loadingFolders.set(true);

    forkJoin({
      folders: this.folderService.getFolders(),
      notes: this.noteService.getNotes()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ folders, notes }) => {
          // Guardar datos originales para fallback de búsqueda
          this.allFolders.set(folders);
          this.allNotes.set(notes);
          
          // Calcular estadísticas para cada carpeta
          const foldersWithStats = this.calculateFolderStats(folders, notes);
          this.folders.set(foldersWithStats);
          this.filteredFolders.set(foldersWithStats);
          
          this.loadingFolders.set(false);
        },
        error: (error) => {
          console.error('Error al cargar datos:', error);
          this.loadingFolders.set(false);
        }
      });
  }

  /**
   * Calcula estadísticas para las carpetas
   */
  private calculateFolderStats(folders: Folder[], notes: Note[]): FolderWithStats[] {
    const foldersWithStats: FolderWithStats[] = folders.map(folder => {
      const folderNotes = notes.filter(note => note.folder_id === folder.id);
      
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

    foldersWithStats.sort((a, b) => 
      new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()
    );

    return foldersWithStats;
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
          this.loadAllData();
          
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

  /**
   * Maneja el cambio en el input de búsqueda
   */
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }


  /**
   * Limpia la búsqueda
   */
  clearSearch(): void {
    this.searchQuery.set('');
    this.onSearchChange('');
    this.isSearchMode.set(false);
  }

  /**
   * Abre una nota desde los resultados de búsqueda
   */
  openNoteFromSearch(note: Note): void {
    this.router.navigate([note.folder_id, note.id]);
  }

  /**
   * Navega a la nota que contiene un item reciente
   */
  openNoteFromItem(item: RecentItem): void {
    this.router.navigate([item.note.folder_id, item.note_id]);
  }

  /**
   * Navega a la nota que contiene un item encontrado en la búsqueda
   */
  openNoteFromSearchItem(item: ItemNoteRow): void {
    // Necesitamos obtener el folder_id de la nota
    // Por ahora navegamos solo con el note_id, el router debería manejarlo
    const note = this.filteredNotes().find(n => n.id === item.note_id);
    if (note) {
      this.router.navigate([note.folder_id, item.note_id]);
    } else {
      // Si no encontramos la nota en los resultados, intentamos obtenerla
      this.noteService.getNoteById(item.note_id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (note) => {
            this.router.navigate([note.folder_id, note.id]);
          },
          error: (error) => {
            console.error('Error al obtener nota:', error);
          }
        });
    }
  }
}
