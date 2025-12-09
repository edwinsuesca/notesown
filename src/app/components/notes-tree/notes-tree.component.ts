import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeModule } from 'primeng/tree';
import { TreeNode } from 'primeng/api';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { FolderService } from '../../services/folder.service';
import { NoteService } from '../../services/note.service';
import { Note } from '../../models/note.model';
import { Folder } from '../../models/folder.model';
import { EditorStateService } from '../../services/editor-state.service';

@Component({
  selector: 'app-notes-tree',
  standalone: true,
  imports: [CommonModule, TreeModule],
  template: `
    <div class="notes-tree-container">
      <p-tree 
        [value]="treeNodes" 
        [loading]="loading"
        class="w-full border-none bg-transparent"
        [filter]="false"
        [propagateSelectionDown]="false"
        [propagateSelectionUp]="false">
        <ng-template let-node pTemplate="default">
          <div class="tree-node-content" (click)="onNodeClick(node, $event)">
            <i [class]="getNodeIcon(node)"></i>
            <span class="tree-node-label">{{ node.label }}</span>
          </div>
        </ng-template>
      </p-tree>
      
      @if (loading) {
        <div class="text-center py-4">
          <i class="pi pi-spin pi-spinner text-2xl"></i>
        </div>
      }
      
      @if (!loading && treeNodes.length === 0) {
        <div class="text-center py-4 text-surface-500 dark:text-surface-400">
          <i class="pi pi-folder-open text-3xl mb-2"></i>
          <p class="text-sm">No hay carpetas aún</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .notes-tree-container {
      width: 100%;
    }

    .tree-node-content {
      display: flex;
      align-items: center;
      padding: 0.5rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }

    .tree-node-content:hover {
      background: var(--surface-hover);
    }

    .tree-node-content i {
      margin-right: 0.5rem;
    }

    .tree-node-label {
      flex: 1;
    }

    :host ::ng-deep {
      .p-tree {
        background: transparent;
        border: none;
        padding: 0;
      }

      .p-tree .p-tree-container .p-treenode {
        padding: 0.25rem 0;
      }

      .p-tree .p-tree-container .p-treenode .p-treenode-content {
        padding: 0;
        border: none;
        background: transparent !important;
      }

      .p-tree .p-tree-container .p-treenode .p-treenode-content:focus {
        box-shadow: none;
      }

      /* Ocultar el icono por defecto de PrimeNG */
      .p-tree .p-tree-node-icon, .p-tree .p-tree-node-toggle-button {
        display: none !important;
      }
      
      .p-tree span.p-tree-node-icon .p-tree button.p-tree-node-toggle-button {
        display: none !important;
      }

      /* Estilos para carpetas */
      .tree-node-content .pi-folder,
      .tree-node-content .pi-folder-open {
        color: var(--primary-color);
        font-size: 1.1rem;
      }

      /* Estilos para notas */
      .tree-node-content .pi-file {
        color: var(--text-color-secondary);
        font-size: 0.9rem;
      }

      /* Indentación para notas dentro de carpetas */
      .p-tree .p-treenode-children {
        padding-left: 1rem;
      }

      /* Label de las notas más pequeño */
      .p-tree .p-treenode-children .tree-node-label {
        font-size: 0.9rem;
      }
    }
  `]
})
export class NotesTreeComponent implements OnInit, OnDestroy {
  treeNodes: TreeNode[] = [];
  loading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private folderService: FolderService,
    private noteService: NoteService,
    private editorState: EditorStateService
  ) {}

  ngOnInit(): void {
    this.loadFolders();
    
    // Suscribirse a eventos de refresco del árbol
    this.editorState.refreshNotesTree
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('Refrescando árbol de notas...');
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
          // TODO: Mostrar mensaje de error al usuario
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
        children: this.convertNotesToTreeNodes(folderNotes),
        leaf: folderNotes.length === 0
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
      
      // Establecer la carpeta seleccionada
      this.editorState.setSelectedFolder({
        id: node.data.id,
        name: node.label || 'Carpeta'
      });
      
      // Si la carpeta tiene notas, seleccionar la primera automáticamente
      if (node.children && node.children.length > 0) {
        const firstNote = node.children[0];
        
        // Cargar la primera nota
        this.noteService.getNoteById(firstNote.data.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (note) => {
              this.editorState.setSelectedNote(note);
              console.log('Primera nota seleccionada automáticamente:', note);
            },
            error: (error) => {
              console.error('Error al cargar la primera nota:', error);
            }
          });
      } else {
        // Si no hay notas, limpiar la selección
        this.editorState.setSelectedNote(null);
      }
      
      console.log('Carpeta seleccionada:', node.data);
    } else if (node.data.type === 'note') {
      console.log('Nota seleccionada:', node.data);
      
      // Cargar la nota completa desde el servicio
      this.noteService.getNoteById(node.data.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (note) => {
            // Establecer la carpeta padre como seleccionada usando el folder_id de la nota
            const parentFolder = this.findFolderById(note.folder_id);
            if (parentFolder) {
              this.editorState.setSelectedFolder({
                id: parentFolder.data.id,
                name: parentFolder.label || 'Carpeta'
              });
            }
            
            // Establecer la nota seleccionada
            this.editorState.setSelectedNote(note);
            console.log('Nota cargada en el estado:', note);
          },
          error: (error) => {
            console.error('Error al cargar la nota:', error);
          }
        });
    }
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
          
          console.log('Árbol refrescado con estado de expansión preservado');
        },
        error: (error) => {
          console.error('Error al refrescar el árbol:', error);
        }
      });
  }
}
