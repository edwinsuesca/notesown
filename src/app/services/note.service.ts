import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { Note } from '../models/note.model';
import { CreateNoteDto } from '../models/note.model';
import { UpdateNoteDto } from '../models/note.model';

@Injectable({
  providedIn: 'root'
})
export class NoteService {

  constructor(private supabaseService: SupabaseService) { }

  /**
   * Consulta todas las notas del usuario actual
   * @returns Observable con la lista de notas
   */
  getNotes(): Observable<Note[]> {
    return from(
      this.supabaseService.getClient()
        .from('note')
        .select('*')
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as Note[];
      }),
      catchError(error => {
        console.error('Error al consultar notas:', error);
        throw error;
      })
    );
  }

  /**
   * Consulta las notas de una carpeta específica
   * @param folderId ID de la carpeta
   * @returns Observable con la lista de notas de la carpeta
   */
  getNotesByFolder(folderId: number): Observable<Note[]> {
    return from(
      this.supabaseService.getClient()
        .from('note')
        .select('*')
        .eq('folder_id', folderId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as Note[];
      }),
      catchError(error => {
        console.error('Error al consultar notas por carpeta:', error);
        throw error;
      })
    );
  }

  /**
   * Consulta una nota por su ID
   * @param id ID de la nota
   * @returns Observable con la nota encontrada
   */
  getNoteById(id: number): Observable<Note> {
    return from(
      this.supabaseService.getClient()
        .from('note')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as Note;
      }),
      catchError(error => {
        console.error('Error al consultar nota por ID:', error);
        throw error;
      })
    );
  }

  /**
   * Crea una nueva nota
   * @param noteData Datos de la nota a crear
   * @returns Observable con la nota creada
   */
  createNote(noteData: CreateNoteDto): Observable<Note> {
    return from(
      this.supabaseService.getClient()
        .from('note')
        .insert(noteData)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as Note;
      }),
      catchError(error => {
        console.error('Error al crear nota:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza una nota existente
   * @param id ID de la nota a actualizar
   * @param noteData Datos a actualizar
   * @returns Observable con la nota actualizada
   */
  updateNote(id: number, noteData: UpdateNoteDto): Observable<Note> {
    return from(
      this.supabaseService.getClient()
        .from('note')
        .update(noteData)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as Note;
      }),
      catchError(error => {
        console.error('Error al actualizar nota:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina una nota
   * @param id ID de la nota a eliminar
   * @returns Observable con la confirmación de eliminación
   */
  deleteNote(id: number): Observable<void> {
    return from(
      this.supabaseService.getClient()
        .from('note')
        .delete()
        .eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
      }),
      catchError(error => {
        console.error('Error al eliminar nota:', error);
        throw error;
      })
    );
  }

  /**
   * Busca notas por nombre
   * @param searchTerm Término de búsqueda
   * @returns Observable con la lista de notas que coinciden
   */
  searchNotesByName(searchTerm: string): Observable<Note[]> {
    return from(
      this.supabaseService.getClient()
        .from('note')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as Note[];
      }),
      catchError(error => {
        console.error('Error al buscar notas:', error);
        throw error;
      })
    );
  }

  /**
   * Mueve una nota a otra carpeta
   * @param noteId ID de la nota a mover
   * @param newFolderId ID de la carpeta destino
   * @returns Observable con la nota actualizada
   */
  moveNoteToFolder(noteId: number, newFolderId: number): Observable<Note> {
    return this.updateNote(noteId, { folder_id: newFolderId });
  }

  /**
   * Obtiene todas las notas agrupadas por carpeta
   * @returns Observable con un mapa de folder_id a array de notas
   */
  getNotesGroupedByFolder(): Observable<Map<number, Note[]>> {
    return this.getNotes().pipe(
      map(notes => {
        const grouped = new Map<number, Note[]>();
        notes.forEach(note => {
          if (!grouped.has(note.folder_id)) {
            grouped.set(note.folder_id, []);
          }
          grouped.get(note.folder_id)!.push(note);
        });
        return grouped;
      })
    );
  }
}
