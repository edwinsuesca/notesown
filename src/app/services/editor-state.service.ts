import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { Note } from '../models/note.model';

/**
 * Servicio para manejar el estado compartido del editor
 * Gestiona la carpeta y nota seleccionada actualmente
 */
@Injectable({
  providedIn: 'root'
})
export class EditorStateService {
  // Carpeta seleccionada actualmente
  selectedFolder = signal<{ id: number; name: string } | null>(null);
  
  // Nota seleccionada actualmente
  selectedNote = signal<Note | null>(null);

  // Subject para notificar cuando se debe refrescar el árbol de notas
  private refreshNotesTree$ = new Subject<void>();
  
  // Observable público para suscribirse a eventos de refresco
  refreshNotesTree = this.refreshNotesTree$.asObservable();

  /**
   * Establece la carpeta seleccionada
   */
  setSelectedFolder(folder: { id: number; name: string } | null): void {
    this.selectedFolder.set(folder);
  }

  /**
   * Establece la nota seleccionada
   */
  setSelectedNote(note: Note | null): void {
    this.selectedNote.set(note);
  }

  /**
   * Limpia la selección actual
   */
  clearSelection(): void {
    this.selectedFolder.set(null);
    this.selectedNote.set(null);
  }

  /**
   * Notifica que se ha creado o actualizado una nota
   * y el árbol debe refrescarse
   */
  notifyNoteCreated(): void {
    this.refreshNotesTree$.next();
  }
}
