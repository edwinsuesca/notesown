import { Component, effect, signal, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ChecklistCard, ChecklistItem } from '../../components/cards/checklist/checklist';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import { MasonryGrid } from '../../components/masonry-grid/masonry-grid';
import { TextCard } from '@/components/cards/text-card/text-card';
import { ItemNoteService } from '@/services/item-note.service';
import { CreateItemNoteDto, UpdateItemNoteDto } from '@/models/item-note.model';
import { EditorStateService } from '@/services/editor-state.service';
import { NoteService } from '@/services/note.service';
import { FolderService } from '@/services/folder.service';
import { Note } from '@/models/note.model';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export type TextType = 'paragraph' | 'link' | 'highlight';
export type CardType = 'text' | 'checklist' | TextType;

export interface ItemNote {
  id: string;
  title: string;
  type: CardType;
  isTextType: boolean;
  textType?: TextType;
  content?: string;
  items?: ChecklistItem[];
}

@Component({
  selector: 'app-note-editor',
  imports: [
    CommonModule,
    ButtonModule,
    MenuModule,
    BreadcrumbModule,
    MasonryGrid,
    TextCard,
    ChecklistCard,
  ],
  templateUrl: './note-editor.html',
  styleUrl: './note-editor.css',
})
export class NoteEditor implements OnInit, OnDestroy {
  @ViewChild('menu') menu!: Menu;
  
  cards = signal<ItemNote[]>([]);
  noteTitle = signal<string>('Mi Nota');
  noteId = signal<number | null>(null); // ID de la nota actual (null si es nueva)
  selectedFolder = signal<{ id: number; name: string } | null>(null);
  currentNote = signal<Note | null>(null);
  error = signal<string | null>(null);
  breadcrumbItems = signal<MenuItem[]>([]);
  
  breadcrumbHome: MenuItem = {
    icon: 'pi pi-home',
    label: 'Inicio',
    command: () => this.router.navigate(['/dashboard'])
  };

  // Subjects para debounce de auto-guardado
  private titleChange$ = new Subject<string>();
  private cardsChange$ = new Subject<ItemNote[]>();
  private destroy$ = new Subject<void>();
  
  // Map para manejar debounce individual por item
  private itemChanges$ = new Map<string, Subject<ItemNote>>();
  
  // Flag para evitar guardado durante la carga inicial
  private isLoadingNote = false;

  menuItems: MenuItem[] = [
    { 
      label: 'Párrafo', 
      icon: 'pi pi-align-left',
      command: () => this.addCard('paragraph')
    },
    { 
      label: 'Checklist', 
      icon: 'pi pi-check-square',
      command: () => this.addCard('checklist')
    },
    { 
      label: 'Nota Resaltada', 
      icon: 'pi pi-star',
      command: () => this.addCard('highlight')
    },
    { 
      label: 'Enlace', 
      icon: 'pi pi-link',
      command: () => this.addCard('link')
    }
  ];

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private itemNoteService: ItemNoteService,
    private editorState: EditorStateService,
    private noteService: NoteService,
    private folderService: FolderService
  ) {
    // Configurar auto-guardado con debounce
    this.setupAutoSave();

    // Effect para detectar cambios en el título
    effect(() => {
      const title = this.noteTitle();
      if (!this.isLoadingNote && this.noteId()) {
        this.titleChange$.next(title);
      }
    });

    // Effect para detectar cambios en las tarjetas (solo para logging)
    // El guardado individual se maneja en cada método de actualización
    effect(() => {
      const cards = this.cards();
    });

    // Effect para cargar nota cuando se selecciona
    effect(() => {
      const selectedNote = this.editorState.selectedNote();
      if (selectedNote) {
        this.loadNote(selectedNote);
      } else {
        // Si no hay nota seleccionada, limpiar el editor
        const selectedFolder = this.editorState.selectedFolder();
        if (selectedFolder) {
          this.clearEditor();
        }
      }
    });

    // Effect para sincronizar carpeta seleccionada
    effect(() => {
      this.selectedFolder.set(this.editorState.selectedFolder());
    });
  }

  ngOnInit(): void {
    // Suscribirse a cambios en los parámetros de ruta
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const folderId = parseInt(params['folderId'], 10);
        const noteId = parseInt(params['noteId'], 10);

        if (!isNaN(folderId) && !isNaN(noteId)) {
          // Cargar la nota desde la URL
          this.loadNoteFromRoute(folderId, noteId);
        }
      });
  }

  ngOnDestroy(): void {
    // Limpiar todos los subjects de items
    this.itemChanges$.forEach(subject => {
      subject.complete();
    });
    this.itemChanges$.clear();
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga una nota basándose en los parámetros de la ruta
   */
  private loadNoteFromRoute(folderId: number, noteId: number): void {
    this.error.set(null);
    
    // Cargar la nota
    this.noteService.getNoteById(noteId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (note) => {
          if (!note) {
            this.error.set(`No se encontró la nota con ID ${noteId}`);
            return;
          }
          
          // Verificar que la nota pertenece a la carpeta correcta
          if (note.folder_id !== folderId) {
            this.error.set(`La nota ${noteId} no pertenece a la carpeta ${folderId}`);
            return;
          }
          
          // Cargar carpeta para obtener su nombre
          this.folderService.getFolderById(folderId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (folder) => {
                if (folder) {
                  // Configurar breadcrumb
                  this.breadcrumbItems.set([
                    { 
                      label: this.truncateText(folder.name, 20),
                      command: () => this.router.navigate([folderId])
                    },
                    { label: this.truncateText(note.name, 30) }
                  ]);
                  
                  // Establecer carpeta seleccionada
                  this.editorState.setSelectedFolder({
                    id: folderId,
                    name: folder.name
                  });
                }
              },
              error: (error) => {
                console.error('Error al cargar carpeta:', error);
              }
            });
          
          // Establecer nota seleccionada
          this.editorState.setSelectedNote(note);
          
          // Actualizar read_at sin modificar updated_at
          this.noteService.updateReadAt(noteId, note.updated_at)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {},
              error: (error) => {
                console.error('Error al actualizar read_at:', error);
              }
            });
          
          // Cargar la nota en el editor
          this.loadNote(note);
        },
        error: (error) => {
          console.error('Error al cargar nota desde ruta:', error);
          this.error.set(`No se encontró la nota con ID ${noteId}`);
        }
      });
  }

  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Configura el sistema de auto-guardado con debounce
   */
  private setupAutoSave(): void {
    // Auto-guardar título después de 500ms sin cambios
    this.titleChange$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(title => {
        this.saveNoteTitle(title);
      });
  }

  /**
   * Configura el debounce para un item específico
   * @param itemId ID del item
   */
  private setupItemDebounce(itemId: string): void {
    if (this.itemChanges$.has(itemId)) {
      return; // Ya está configurado
    }

    const itemSubject = new Subject<ItemNote>();
    this.itemChanges$.set(itemId, itemSubject);

    itemSubject
      .pipe(
        debounceTime(500),
        takeUntil(this.destroy$)
      )
      .subscribe(item => {
        this.saveIndividualItem(item);
      });
  }

  addCard(type: CardType) {
    const newCard: ItemNote = {
      id: crypto.randomUUID(),
      title: 'Nueva tarjeta',
      isTextType: type === 'paragraph' || type === 'highlight' || type === 'link',
      type,
      content: type !== 'checklist' ? '' : undefined,
      items: type === 'checklist' ? [{ id: crypto.randomUUID(), text: '', checked: false }] : undefined,
      textType: type === 'paragraph' || type === 'highlight' || type === 'link' ? type : undefined
    };
    
    this.cards.update(cards => [...cards, newCard]);
    
    // Configurar debounce para el nuevo item
    this.setupItemDebounce(newCard.id);
    
    // Guardar inmediatamente el nuevo item en Supabase
    if (this.noteId()) {
      this.createItemInDatabase(newCard);
    }
  }

  updateCardTitle(id: string, title: string) {
    this.cards.update(cards =>
      cards.map(card => card.id === id ? { ...card, title } : card)
    );
    
    // Emitir cambio para auto-guardado con debounce
    const updatedCard = this.cards().find(card => card.id === id);
    if (updatedCard && this.noteId() && !this.isLoadingNote) {
      this.setupItemDebounce(id);
      this.itemChanges$.get(id)?.next(updatedCard);
    }
  }

  updateCardContent(id: string, content: string) {
    this.cards.update(cards =>
      cards.map(card => card.id === id ? { ...card, content } : card)
    );
    
    // Emitir cambio para auto-guardado con debounce
    const updatedCard = this.cards().find(card => card.id === id);
    if (updatedCard && this.noteId() && !this.isLoadingNote) {
      this.setupItemDebounce(id);
      this.itemChanges$.get(id)?.next(updatedCard);
    }
  }

  updateCardItems(id: string, items: ChecklistItem[]) {
    this.cards.update(cards =>
      cards.map(card => card.id === id ? { ...card, items } : card)
    );
    
    // Emitir cambio para auto-guardado con debounce
    const updatedCard = this.cards().find(card => card.id === id);
    if (updatedCard && this.noteId() && !this.isLoadingNote) {
      this.setupItemDebounce(id);
      this.itemChanges$.get(id)?.next(updatedCard);
    }
  }

  removeCard(id: string) {
    // Eliminar de Supabase si existe
    if (this.noteId() && !this.isLoadingNote) {
      this.deleteItemFromDatabase(id);
    }
    
    // Limpiar el subject del item
    const subject = this.itemChanges$.get(id);
    if (subject) {
      subject.complete();
      this.itemChanges$.delete(id);
    }
    
    this.cards.update(cards => cards.filter(card => card.id !== id));
  }

  /**
   * Guarda el título de la nota en Supabase
   * @param title Nuevo título de la nota
   */
  private saveNoteTitle(title: string): void {
    const currentNoteId = this.noteId();
    const currentNote = this.currentNote();
    
    if (!currentNoteId || !currentNote) {
      return;
    }

    // Validar que el título no esté vacío
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      console.warn('El título no puede estar vacío');
      // Restaurar el título anterior
      this.noteTitle.set(currentNote.name);
      return;
    }

    // Solo actualizar si el título cambió
    if (currentNote.name === trimmedTitle) {
      return;
    }

    this.noteService.updateNote(currentNoteId, { name: trimmedTitle }).subscribe({
      next: (updatedNote) => {
        this.currentNote.set(updatedNote);
        
        // Actualizar breadcrumb
        const folder = this.selectedFolder();
        if (folder) {
          this.breadcrumbItems.set([
            { 
              label: this.truncateText(folder.name, 20),
              command: () => this.router.navigate([folder.id])
            },
            { label: this.truncateText(updatedNote.name, 30) }
          ]);
        }
        
        // Notificar al árbol para que actualice el nombre
        this.editorState.notifyNoteCreated();
      },
      error: (error) => {
        console.error('Error al actualizar título:', error);
      }
    });
  }

  /**
   * Guarda un item individual en Supabase
   * @param item Item a guardar
   */
  private saveIndividualItem(item: ItemNote): void {
    const currentNoteId = this.noteId();
    
    if (!currentNoteId) {
      return;
    }

    // Preparar el DTO para actualización
    const updateDto: UpdateItemNoteDto = {
      title: item.title,
      type: item.type,
      text_type: item.textType,
      content: item.content,
      items: item.items,
      order: this.cards().findIndex(c => c.id === item.id)
    };

    this.itemNoteService.updateItemNote(item.id, updateDto).subscribe({
      next: () => {},
      error: (error) => {
        console.error('Error al actualizar item:', error);
      }
    });
  }

  /**
   * Crea un nuevo item en la base de datos
   * @param item Item a crear
   */
  private createItemInDatabase(item: ItemNote): void {
    const currentNoteId = this.noteId();
    
    if (!currentNoteId) {
      return;
    }
    
    const createDto: CreateItemNoteDto = {
      // No enviamos id, la base de datos lo genera automáticamente
      note_id: currentNoteId,
      title: item.title,
      type: item.type,
      text_type: item.textType,
      content: item.content,
      items: item.items,
      order: this.cards().length - 1
    };

    this.itemNoteService.createItemNote(createDto).subscribe({
      next: (createdItem) => {        
        // Actualizar el ID local con el ID generado por la base de datos
        this.cards.update(cards =>
          cards.map(card => card.id === item.id ? { ...card, id: createdItem.id } : card)
        );
        
        // Reconfigurar debounce con el nuevo ID
        const oldSubject = this.itemChanges$.get(item.id);
        if (oldSubject) {
          oldSubject.complete();
          this.itemChanges$.delete(item.id);
        }
        this.setupItemDebounce(createdItem.id);
      },
      error: (error) => {
        console.error('Error al crear item:', error);
      }
    });
  }

  /**
   * Elimina un item de la base de datos
   * @param itemId ID del item a eliminar
   */
  private deleteItemFromDatabase(itemId: string): void {    
    this.itemNoteService.deleteItemNote(itemId).subscribe({
      next: () => {},
      error: (error) => {
        console.error('Error al eliminar item:', error);
      }
    });
  }

  /**
   * Prepara el payload de items para enviar a Supabase
   * @param cards Lista de tarjetas del editor
   * @param noteId ID de la nota padre
   * @returns Array de CreateItemNoteDto listos para insertar
   */
  prepareItemsPayload(cards: ItemNote[], noteId: number): CreateItemNoteDto[] {
    return cards.map((card, index) => {
      const payload: CreateItemNoteDto = {
        note_id: noteId,
        title: card.title,
        type: card.type,
        order: index,
      };

      // Agregar content si es un tipo de texto
      if (card.isTextType && card.content !== undefined) {
        payload.content = card.content;
        payload.text_type = card.textType;
      }

      // Agregar items si es un checklist
      if (card.type === 'checklist' && card.items) {
        payload.items = card.items; // Se guardará como JSON en la BD
      }

      return payload;
    });
  }

  /**
   * Guarda los items en Supabase
   * @param items Array de items a guardar
   */
  saveItems(items: CreateItemNoteDto[]): void {
    const currentNoteId = this.noteId();
    if (!currentNoteId) {
      console.error('No hay noteId para guardar los items');
      return;
    }

    this.itemNoteService.syncItemsForNote(currentNoteId, items).subscribe({
      next: () => {},
      error: (error) => {
        console.error('Error al guardar items:', error);
      }
    });
  }

  /**
   * Carga los items de una nota desde Supabase
   * @param noteId ID de la nota a cargar
   */
  loadNoteItems(noteId: number): void {
    this.noteId.set(noteId);
    
    this.itemNoteService.getItemsByNoteId(noteId).subscribe({
      next: (items) => {
        // Convertir los items de Supabase al formato del editor
        const editorCards: ItemNote[] = items.map(item => ({
          id: item.id,
          title: item.title,
          type: item.type as CardType,
          isTextType: item.type === 'paragraph' || item.type === 'highlight' || item.type === 'link',
          textType: item.text_type as TextType | undefined,
          content: item.content,
          items: item.items, // Ya viene como JSON desde la BD
        }));
        
        this.cards.set(editorCards);
        
        // Configurar debounce para cada item cargado
        editorCards.forEach(card => {
          this.setupItemDebounce(card.id);
        });
        
        // Desactivar flag después de cargar
        setTimeout(() => {
          this.isLoadingNote = false;
        }, 100);
      },
      error: (error) => {
        console.error('Error al cargar items:', error);
        this.isLoadingNote = false;
      }
    });
  }

  /**
   * Establece el ID de la nota actual
   * Útil cuando se crea una nueva nota o se carga una existente
   * @param noteId ID de la nota
   */
  setNoteId(noteId: number): void {
    this.noteId.set(noteId);
  }

  /**
   * Carga una nota completa con sus items
   * @param note Nota a cargar
   */
  loadNote(note: Note): void {    
    // Activar flag para evitar auto-guardado durante la carga
    this.isLoadingNote = true;
    
    // Establecer la nota actual
    this.currentNote.set(note);
    this.noteId.set(note.id);
    this.noteTitle.set(note.name);
    
    // Cargar los items de la nota
    this.loadNoteItems(note.id);
  }

  /**
   * Limpia el editor para crear una nueva nota
   */
  clearEditor(): void {
    this.currentNote.set(null);
    this.noteId.set(null);
    this.noteTitle.set('Mi Nota');
    this.cards.set([]);
  }

  /**
   * Crea una nueva nota en la carpeta actualmente seleccionada
   */
  createNoteInCurrentFolder(): void {
    const folder = this.selectedFolder();
    
    if (!folder) {
      console.warn('No hay carpeta seleccionada');
      return;
    }

    // Crear la nota en Supabase
    this.noteService.createNote({
      name: 'Nueva Nota',
      folder_id: folder.id
    }).subscribe({
      next: (newNote) => {
        // Establecer la nota recién creada como seleccionada
        this.editorState.setSelectedNote(newNote);
        
        // Notificar que se debe actualizar el árbol de notas
        this.editorState.notifyNoteCreated();
        
        // La nota se cargará automáticamente por el effect
      },
      error: (error) => {
        console.error('Error al crear la nota:', error);
        // TODO: Mostrar mensaje de error al usuario
      }
    });
  }
}
