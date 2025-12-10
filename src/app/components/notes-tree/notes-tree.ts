import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  templateUrl: './notes-tree.html',
  styleUrl: './notes-tree.css'
})
export class NotesTreeComponent implements OnInit, OnDestroy {
  treeNodes: TreeNode[] = [];
  loading = false;
  selectedFolderId = signal<number | null>(null);
  selectedNoteId = signal<number | null>(null);
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private folderService: FolderService,
    private noteService: NoteService,
    private editorState: EditorStateService
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
    } else if (node.data.type === 'note') {
      const noteId = node.data.id;
      
      // Encontrar la carpeta padre
      const parentFolder = this.findParentFolder(node);
      if (parentFolder) {
        const folderId = parentFolder.data.id;
        
        // Navegar a la nota
        this.router.navigate([folderId, noteId]);
      }
    }
  }

  /**
   * Determina si un nodo está seleccionado
   */
  isNodeSelected(node: TreeNode): boolean {
    if (node.data.type === 'folder') {
      // Una carpeta está seleccionada si:
      // 1. Es la carpeta actual Y no hay nota seleccionada
      // 2. O contiene la nota seleccionada
      const isFolderSelected = this.selectedFolderId() === node.data.id && !this.selectedNoteId();
      const containsSelectedNote = this.selectedNoteId() !== null && 
                                   node.children?.some(child => child.data.id === this.selectedNoteId());
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
}
