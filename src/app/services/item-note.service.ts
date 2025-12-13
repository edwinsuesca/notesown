import { Injectable } from '@angular/core';
import { Observable, from, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { ItemNote, CreateItemNoteDto, UpdateItemNoteDto } from '../models/item-note.model';

@Injectable({
  providedIn: 'root'
})
export class ItemNoteService {

  constructor(private supabaseService: SupabaseService) { }

  /**
   * Consulta todos los items de una nota específica
   * @param noteId ID de la nota padre
   * @returns Observable con la lista de items
   */
  getItemsByNoteId(noteId: number): Observable<ItemNote[]> {
    return from(
      this.supabaseService.getClient()
        .from('item_note')
        .select('*')
        .eq('note_id', noteId)
        .order('order', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as ItemNote[];
      }),
      catchError(error => {
        console.error('Error al consultar items de nota:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene los últimos 4 items actualizados recientemente
   * @returns Observable con la lista de los 4 items más recientes
   */
  getRecentItems(limit: number = 4): Observable<ItemNote[]> {
    return from(
      this.supabaseService.getClient()
        .from('item_note')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(limit)
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as ItemNote[];
      }),
      catchError(error => {
        console.error('Error al consultar items recientes:', error);
        throw error;
      })
    );
  }

  /**
   * Crea un nuevo item de nota
   * @param itemData Datos del item a crear
   * @returns Observable con el item creado
   */
  createItemNote(itemData: CreateItemNoteDto): Observable<ItemNote> {
    return from(
      this.supabaseService.getClient()
        .from('item_note')
        .insert(itemData)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as ItemNote;
      }),
      catchError(error => {
        console.error('Error al crear item de nota:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza un item de nota existente
   * @param id ID del item a actualizar
   * @param itemData Datos a actualizar
   * @returns Observable con el item actualizado
   */
  updateItemNote(id: string, itemData: UpdateItemNoteDto): Observable<ItemNote> {
    return from(
      this.supabaseService.getClient()
        .from('item_note')
        .update(itemData)
        .eq('id', id)
        .select()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        // Tomar el primer elemento del array de resultados
        const data = response.data as ItemNote[];
        if (!data || data.length === 0) {
          throw new Error('No se encontró el item para actualizar');
        }
        return data[0];
      }),
      catchError(error => {
        console.error('Error al actualizar item de nota:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina un item de nota
   * @param id ID del item a eliminar
   * @returns Observable con la confirmación de eliminación
   */
  deleteItemNote(id: string): Observable<void> {
    return from(
      this.supabaseService.getClient()
        .from('item_note')
        .delete()
        .eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
      }),
      catchError(error => {
        console.error('Error al eliminar item de nota:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina todos los items de una nota
   * @param noteId ID de la nota padre
   * @returns Observable con la confirmación de eliminación
   */
  deleteAllItemsByNoteId(noteId: number): Observable<void> {
    return from(
      this.supabaseService.getClient()
        .from('item_note')
        .delete()
        .eq('note_id', noteId)
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
      }),
      catchError(error => {
        console.error('Error al eliminar items de nota:', error);
        throw error;
      })
    );
  }

  /**
   * Sincroniza los items de una nota (elimina los existentes y crea los nuevos)
   * @param noteId ID de la nota padre
   * @param items Lista de items a sincronizar
   * @returns Observable con los items creados
   */
  syncItemsForNote(noteId: number, items: CreateItemNoteDto[]): Observable<ItemNote[]> {
    return this.deleteAllItemsByNoteId(noteId).pipe(
      switchMap(() => {
        if (items.length === 0) {
          return of([]);
        }
        
        const createObservables = items.map(item => this.createItemNote(item));
        return forkJoin(createObservables);
      }),
      catchError(error => {
        console.error('Error al sincronizar items de nota:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza múltiples items de nota (upsert)
   * @param noteId ID de la nota padre
   * @param items Lista de items a actualizar/crear
   * @returns Observable con los items actualizados
   */
  upsertItems(noteId: number, items: CreateItemNoteDto[]): Observable<ItemNote[]> {
    return from(
      this.supabaseService.getClient()
        .from('item_note')
        .upsert(items, { onConflict: 'id' })
        .select()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as ItemNote[];
      }),
      catchError(error => {
        console.error('Error al hacer upsert de items:', error);
        throw error;
      })
    );
  }
}
