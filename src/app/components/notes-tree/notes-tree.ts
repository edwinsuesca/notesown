import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ContextMenuModule } from 'primeng/contextmenu';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenuItem } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { FolderService } from '../../services/folder.service';
import { NoteService } from '../../services/note.service';
import { Note } from '../../models/note.model';
import { Folder } from '../../models/folder.model';
import { EditorStateService } from '../../services/editor-state.service';

// Interfaz personalizada para nodos del árbol
interface TreeNode {
  key: string;
  label: string;
  data: {
    id: number;
    type: 'folder' | 'note' | 'new-note-button';
    folderId?: number;
    createdAt?: string;
    userId?: string;
  };
  icon: string;
  expandedIcon?: string;
  collapsedIcon?: string;
  children?: TreeNode[];
  leaf?: boolean;
  expanded?: boolean;
  styleClass?: string;
}

@Component({
  selector: 'app-notes-tree',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule, ContextMenuModule, DialogModule, InputTextModule, FormsModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: './notes-tree.html',
  styleUrl: './notes-tree.css'
})
export class NotesTreeComponent implements OnInit, OnDestroy {
  treeNodes: TreeNode[] = [];
  loading = false;
  selectedFolderId = signal<number | null>(null);
  selectedNoteId = signal<number | null>(null);
  private destroy$ = new Subject<void>();
  
  // Menú contextual
  contextMenuItems: MenuItem[] = [];
  currentContextNode: TreeNode | null = null;
  
  // Diálogo de renombrar
  renameDialogVisible = false;
  renameValue = '';
  nodeToRename: TreeNode | null = null;
  
  // Diálogo de crear carpeta
  createFolderDialogVisible = false;
  newFolderName = '';
  
  // Estado de expansión
  allExpanded = false;

  constructor(
    private router: Router,
    private folderService: FolderService,
    private noteService: NoteService,
    private editorState: EditorStateService,
    private confirmationService: ConfirmationService
  ) {
    // Effect para sincronizar con el estado global
    effect(() => {
      const folder = this.editorState.selectedFolder();
      this.selectedFolderId.set(folder?.id || null);
    });

    effect(() => {
      const note = this.editorState.selectedNote();
      this.selectedNoteId.set(note?.id || null);
    });
  }

  ngOnInit(): void {
    this.loadFolders();
    
    // Suscribirse a eventos de refresco del árbol
    this.editorState.refreshNotesTree
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refresh();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga las carpetas y notas desde Supabase y las convierte a TreeNodes
   */
  loadFolders(): void {
    this.loading = true;
    
    // Cargar carpetas y notas en paralelo
    forkJoin({
      folders: this.folderService.getFolders(),
      notes: this.noteService.getNotes()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ folders, notes }) => {
          this.treeNodes = this.convertFoldersToTreeNodes(folders, notes);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar carpetas y notas:', error);
          this.loading = false;
        }
      });
  }

  /**
   * Convierte las carpetas de Supabase a TreeNodes de PrimeNG
   * e incluye las notas como hijos de cada carpeta
   */
  private convertFoldersToTreeNodes(folders: Folder[], notes: Note[]): TreeNode[] {
    // Agrupar notas por folder_id
    const notesByFolder = new Map<number, Note[]>();
    notes.forEach(note => {
      if (!notesByFolder.has(note.folder_id)) {
        notesByFolder.set(note.folder_id, []);
      }
      notesByFolder.get(note.folder_id)!.push(note);
    });

    // Crear TreeNodes para carpetas con sus notas
    return folders.map(folder => {
      const folderNotes = notesByFolder.get(folder.id) || [];
      
      // Convertir notas a TreeNodes
      const noteNodes = this.convertNotesToTreeNodes(folderNotes);
      
      // Agregar nodo especial de "nueva nota" al final
      const newNoteNode: TreeNode = {
        key: `new-note-${folder.id}`,
        label: 'Nueva nota',
        data: {
          id: folder.id,
          type: 'new-note-button',
          folderId: folder.id
        },
        icon: 'pi pi-plus',
        leaf: true,
        styleClass: 'new-note-node'
      };
      
      return {
        key: `folder-${folder.id}`,
        label: folder.name,
        data: {
          id: folder.id,
          type: 'folder',
          createdAt: folder.created_at
        },
        icon: 'pi pi-folder',
        expandedIcon: 'pi pi-folder-open',
        collapsedIcon: 'pi pi-folder',
        children: [...noteNodes, newNoteNode],
        leaf: false
      };
    });
  }

  /**
   * Convierte las notas a TreeNodes de PrimeNG
   */
  private convertNotesToTreeNodes(notes: Note[]): TreeNode[] {
    return notes.map(note => ({
      key: `note-${note.id}`,
      label: note.name,
      data: {
        id: note.id,
        type: 'note',
        folderId: note.folder_id,
        createdAt: note.created_at,
        userId: note.user_id
      },
      icon: 'pi pi-file',
      leaf: true
    }));
  }

  /**
   * Maneja el click en un nodo del árbol
   */
  onNodeClick(node: TreeNode, event: Event): void {
    event.stopPropagation();
    
    if (node.data.type === 'folder') {
      // Toggle expand/collapse al hacer clic en carpetas
      node.expanded = !node.expanded;      
    } else if (node.data.type === 'note') {
      const noteId = node.data.id;
      
      // Encontrar la carpeta padre
      const parentFolder = this.findParentFolder(node);
      if (parentFolder) {
        const folderId = parentFolder.data.id;
        
        // Navegar a la nota
        this.router.navigate([folderId, noteId]);
      }
    } else if (node.data.type === 'new-note-button' && node.data.folderId) {
      // Crear nueva nota en la carpeta
      this.createNoteInFolder(node.data.folderId, event);
    }
  }

  /**
   * Determina si un nodo está seleccionado
   */
  isNodeSelected(node: TreeNode): boolean {
    if (node.data.type === 'folder') {
      // Una carpeta está seleccionada si:
      // 1. Es la carpeta actual Y no hay nota seleccionada
      // 2. O contiene la nota seleccionada (verificando solo nodos de tipo 'note')
      const isFolderSelected = this.selectedFolderId() === node.data.id && !this.selectedNoteId();
      const containsSelectedNote = this.selectedNoteId() !== null && 
                                   node.children?.some(child => 
                                     child.data.type === 'note' && child.data.id === this.selectedNoteId()
                                   );
      return isFolderSelected || !!containsSelectedNote;
    } else if (node.data.type === 'note') {
      return this.selectedNoteId() === node.data.id;
    }
    return false;
  }

  /**
   * Obtiene el icono apropiado para un nodo
   */
  getNodeIcon(node: TreeNode): string {
    if (node.data.type === 'folder') {
      return node.expanded ? 'pi pi-folder-open' : 'pi pi-folder';
    }
    return 'pi pi-file';
  }

  /**
   * Encuentra una carpeta por su ID
   * @param folderId ID de la carpeta a buscar
   * @returns Nodo de la carpeta o null
   */
  private findFolderById(folderId: number): TreeNode | null {
    return this.treeNodes.find(node => node.data.id === folderId) || null;
  }

  /**
   * Encuentra la carpeta padre de un nodo (nota)
   * @param noteNode Nodo de la nota
   * @returns Nodo de la carpeta padre o null
   */
  private findParentFolder(noteNode: TreeNode): TreeNode | null {
    // Buscar en todos los nodos del árbol
    for (const folderNode of this.treeNodes) {
      if (folderNode.children) {
        // Verificar si la nota está en los hijos de esta carpeta
        const foundNote = folderNode.children.find(child => child.key === noteNode.key);
        if (foundNote) {
          return folderNode;
        }
      }
    }
    return null;
  }

  /**
   * Guarda el estado de expansión de las carpetas
   * @returns Map con el estado de expansión por key del nodo
   */
  private saveExpansionState(): Map<string, boolean> {
    const expansionState = new Map<string, boolean>();
    
    this.treeNodes.forEach(node => {
      if (node.key) {
        expansionState.set(node.key, node.expanded || false);
      }
    });
    
    return expansionState;
  }

  /**
   * Restaura el estado de expansión de las carpetas
   * @param expansionState Map con el estado de expansión guardado
   */
  private restoreExpansionState(expansionState: Map<string, boolean>): void {
    this.treeNodes.forEach(node => {
      if (node.key && expansionState.has(node.key)) {
        node.expanded = expansionState.get(node.key);
      }
    });
  }

  /**
   * Recarga las carpetas (útil para actualizar después de crear/editar)
   * Preserva el estado de expansión de las carpetas
   */
  refresh(): void {
    // Guardar estado de expansión antes de recargar
    const expansionState = this.saveExpansionState();
    
    // Recargar carpetas y notas en paralelo
    forkJoin({
      folders: this.folderService.getFolders(),
      notes: this.noteService.getNotes()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ folders, notes }) => {
          this.treeNodes = this.convertFoldersToTreeNodes(folders, notes);
          
          // Restaurar estado de expansión después de recargar
          this.restoreExpansionState(expansionState);
        },
        error: (error) => {
          console.error('Error al refrescar el árbol:', error);
        }
      });
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
          // Refrescar el árbol
          this.refresh();
          
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
   * Alterna entre expandir y colapsar todas las carpetas
   */
  toggleExpandAll(): void {
    this.allExpanded = !this.allExpanded;
    this.treeNodes.forEach(node => {
      node.expanded = this.allExpanded;
    });
  }

  /**
   * Crea una nueva nota en una carpeta específica
   */
  createNoteInFolder(folderId: number, event: Event): void {
    event.stopPropagation();
    
    this.noteService.createNote({
      name: 'Nueva Nota',
      folder_id: folderId
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newNote) => {
          // Establecer la nota como seleccionada
          this.editorState.setSelectedNote(newNote);
          
          // Refrescar el árbol
          this.editorState.notifyNoteCreated();
          
          // Navegar a la nueva nota
          this.router.navigate([folderId, newNote.id]);
        },
        error: (error) => {
          console.error('Error al crear nota:', error);
        }
      });
  }

  /**
   * Navega a la vista de carpeta
   */
  viewFolder(folderId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate([folderId]);
  }

  /**
   * Abre el menú contextual para un nodo
   */
  openContextMenu(node: TreeNode, event: Event, contextMenu: any): void {
    event.stopPropagation();
    this.currentContextNode = node;
    
    // Configurar items del menú según el tipo de nodo
    if (node.data.type === 'folder') {
      this.contextMenuItems = [
        {
          label: 'Ver',
          icon: 'pi pi-eye',
          command: () => this.viewFolder(node.data.id)
        },
        {
          label: 'Renombrar',
          icon: 'pi pi-pencil',
          command: () => this.renameNode(node)
        },
        {
          label: 'Eliminar',
          icon: 'pi pi-trash',
          command: () => this.deleteNode(node),
          styleClass: 'text-red-500'
        }
      ];
    } else if (node.data.type === 'note') {
      const parentFolder = this.findParentFolder(node);
      const folderId = parentFolder?.data.id;
      
      this.contextMenuItems = [
        {
          label: 'Ver',
          icon: 'pi pi-eye',
          command: () => {
            if (folderId) {
              this.router.navigate([folderId, node.data.id]);
            }
          }
        },
        {
          label: 'Renombrar',
          icon: 'pi pi-pencil',
          command: () => this.renameNode(node)
        },
        {
          label: 'Eliminar',
          icon: 'pi pi-trash',
          command: () => this.deleteNode(node),
          styleClass: 'text-red-500'
        }
      ];
    }
    
    contextMenu.show(event);
  }

  /**
   * Abre el diálogo para renombrar un nodo (carpeta o nota)
   */
  renameNode(node: TreeNode): void {
    this.nodeToRename = node;
    this.renameValue = node.label;
    this.renameDialogVisible = true;
  }

  /**
   * Guarda el nuevo nombre del nodo
   */
  saveRename(): void {
    if (!this.nodeToRename || !this.renameValue.trim() || this.renameValue === this.nodeToRename.label) {
      this.renameDialogVisible = false;
      return;
    }

    const node = this.nodeToRename;
    const newName = this.renameValue.trim();

    if (node.data.type === 'folder') {
      this.folderService.updateFolder(node.data.id, { name: newName })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.refresh();
            this.renameDialogVisible = false;
          },
          error: (error) => {
            console.error('Error al renombrar carpeta:', error);
            this.renameDialogVisible = false;
          }
        });
    } else if (node.data.type === 'note') {
      this.noteService.updateNote(node.data.id, { name: newName })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.refresh();
            this.renameDialogVisible = false;
          },
          error: (error) => {
            console.error('Error al renombrar nota:', error);
            this.renameDialogVisible = false;
          }
        });
    }
  }

  /**
   * Cancela el renombrado
   */
  cancelRename(): void {
    this.renameDialogVisible = false;
    this.nodeToRename = null;
    this.renameValue = '';
  }

  /**
   * Elimina un nodo (carpeta o nota)
   */
  deleteNode(node: TreeNode): void {
    const isFolder = node.data.type === 'folder';
    const header = isFolder ? 'Eliminar carpeta' : 'Eliminar nota';
    const message = isFolder
      ? `¿Estás seguro de eliminar la carpeta "${node.label}" y todas sus notas?`
      : `¿Estás seguro de eliminar la nota "${node.label}"?`;

    this.confirmationService.confirm({
      header: header,
      message: message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        if (node.data.type === 'folder') {
          this.folderService.deleteFolder(node.data.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.refresh();
                // Si la carpeta eliminada estaba seleccionada, navegar a home
                if (this.selectedFolderId() === node.data.id) {
                  this.router.navigate(['/']);
                }
              },
              error: (error) => {
                console.error('Error al eliminar carpeta:', error);
              }
            });
        } else if (node.data.type === 'note') {
          this.noteService.deleteNote(node.data.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.refresh();
                // Si la nota eliminada estaba seleccionada, navegar a la carpeta
                if (this.selectedNoteId() === node.data.id) {
                  const parentFolder = this.findParentFolder(node);
                  if (parentFolder) {
                    this.router.navigate([parentFolder.data.id]);
                  }
                }
              },
              error: (error) => {
                console.error('Error al eliminar nota:', error);
              }
            });
        }
      }
    });
  }
}
