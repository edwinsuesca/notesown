import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Note } from '../models/note.model';
import { Folder } from '../models/folder.model';
import { ItemNote } from '../models/item-note.model';
import { SupabaseService } from './supabase.service';

export interface SearchableNote extends Note {
  items?: ItemNote[];
}

export interface SearchResult {
  folders: Folder[];
  notes: SearchableNote[];
  matchedItems: Map<number, ItemNote[]>; // noteId -> items que coinciden
}

// Interfaces para las entidades completas devueltas por la búsqueda
export interface FolderRow {
  id: number;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface NoteRow {
  id: number;
  name: string;
  folder_id: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  content?: string;
}

export interface ItemNoteRow {
  id: string;
  title: string;
  content: string;
  note_id: number;
  type: string;
  text_type?: string;
  items?: any[];
  order: number;
  created_at: string;
  updated_at: string;
}

export interface GlobalSearchResponse {
  folders: FolderRow[];
  notes: NoteRow[];
  items: ItemNoteRow[];
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchQuerySubject = new BehaviorSubject<string>('');
  public searchQuery$: Observable<string> = this.searchQuerySubject.asObservable();

  constructor(private supabaseService: SupabaseService) { }

  /**
   * Actualiza el término de búsqueda
   */
  setSearchQuery(query: string): void {
    this.searchQuerySubject.next(query);
  }

  /**
   * Obtiene el término de búsqueda actual
   */
  getSearchQuery(): string {
    return this.searchQuerySubject.value;
  }

  /**
   * Limpia el término de búsqueda
   */
  clearSearch(): void {
    this.searchQuerySubject.next('');
  }

  /**
   * Realiza una búsqueda profunda en carpetas, notas y contenidos
   * @param query Término de búsqueda
   * @param folders Lista de carpetas
   * @param notes Lista de notas
   * @param allItems Mapa de noteId -> items de la nota
   * @returns Resultados de búsqueda filtrados
   */
  deepSearch(
    query: string,
    folders: Folder[],
    notes: SearchableNote[],
    allItems: Map<number, ItemNote[]>
  ): SearchResult {
    // Si no hay query, devolver todo
    if (!query || query.trim() === '') {
      return {
        folders,
        notes,
        matchedItems: allItems
      };
    }

    const normalizedQuery = this.normalizeText(query);
    const matchedFolders: Folder[] = [];
    const matchedNotes: SearchableNote[] = [];
    const matchedItems = new Map<number, ItemNote[]>();

    // Buscar en carpetas
    folders.forEach(folder => {
      if (this.normalizeText(folder.name).includes(normalizedQuery)) {
        matchedFolders.push(folder);
      }
    });

    // Buscar en notas y sus contenidos
    notes.forEach(note => {
      let noteMatches = false;
      const noteItemMatches: ItemNote[] = [];

      // Verificar si el nombre de la nota coincide
      if (this.normalizeText(note.name).includes(normalizedQuery)) {
        noteMatches = true;
      }

      // Buscar en los items de la nota
      const items = allItems.get(note.id) || [];
      items.forEach(item => {
        let itemMatches = false;

        // Buscar en el título del item
        if (this.normalizeText(item.title).includes(normalizedQuery)) {
          itemMatches = true;
        }

        // Buscar en el contenido del item (para text cards)
        if (item.content && this.normalizeText(item.content).includes(normalizedQuery)) {
          itemMatches = true;
        }

        // Buscar en los items del checklist
        if (item.items && Array.isArray(item.items)) {
          const checklistMatches = item.items.some((checkItem: any) =>
            this.normalizeText(checkItem.text || '').includes(normalizedQuery)
          );
          if (checklistMatches) {
            itemMatches = true;
          }
        }

        if (itemMatches) {
          noteItemMatches.push(item);
          noteMatches = true;
        }
      });

      // Si la nota o alguno de sus items coincide, agregarla a los resultados
      if (noteMatches) {
        matchedNotes.push(note);
        if (noteItemMatches.length > 0) {
          matchedItems.set(note.id, noteItemMatches);
        }
      }
    });

    return {
      folders: matchedFolders,
      notes: matchedNotes,
      matchedItems
    };
  }

  /**
   * Normaliza texto para búsqueda (lowercase y sin acentos)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Realiza una búsqueda global usando la función RPC de Supabase
   * Devuelve las entidades completas (folders, notes, items)
   * @param searchTerm Término de búsqueda
   * @returns Observable con los resultados agrupados por tipo
   */
  searchGlobalFullEntities(searchTerm: string): Observable<GlobalSearchResponse | null> {
    return from(this.supabaseService.getClient().auth.getUser()).pipe(
      switchMap(userResponse => {
        const currentUserId = userResponse.data.user?.id;
        if (!currentUserId) {
          throw new Error('Usuario no autenticado');
        }
        
        return from(
          this.supabaseService.getClient().rpc('search_global_full_entities', {
            search_term: searchTerm,
            user_id_param: currentUserId
          })
        );
      }),
      map(response => {
        if (response.error) {
          console.error('Error al ejecutar la búsqueda:', response.error);
          throw response.error;
        }
        
        console.log('🔍 Respuesta RPC raw:', response.data);
        
        // La función RPC devuelve directamente el objeto, no un array
        if (!response.data) {
          return null;
        }
        
        // Si data es un array, tomar el primer elemento
        if (Array.isArray(response.data)) {
          return response.data.length > 0 ? response.data[0] as GlobalSearchResponse : null;
        }
        
        // Si data es directamente el objeto
        return response.data as GlobalSearchResponse;
      }),
      catchError(error => {
        console.error('Error en búsqueda RPC:', error);
        throw error;
      })
    );
  }
}
