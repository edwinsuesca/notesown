import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { Folder } from '../models/folder.model';
import { CreateFolderDto } from '../models/folder.model';
import { UpdateFolderDto } from '../models/folder.model';

@Injectable({
  providedIn: 'root'
})
export class FolderService {

  constructor(private supabaseService: SupabaseService) { }

  /**
   * Consulta todos los folders
   * @returns Observable con la lista de folders
   */
  getFolders(): Observable<Folder[]> {
    return from(
      this.supabaseService.getClient()
        .from('folder')
        .select('*')
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as Folder[];
      }),
      catchError(error => {
        console.error('Error al consultar folders:', error);
        throw error;
      })
    );
  }

  /**
   * Consulta un folder por su ID
   * @param id ID del folder
   * @returns Observable con el folder encontrado
   */
  getFolderById(id: number): Observable<Folder> {
    return from(
      this.supabaseService.getClient()
        .from('folder')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as Folder;
      }),
      catchError(error => {
        console.error('Error al consultar folder por ID:', error);
        throw error;
      })
    );
  }

  /**
   * Crea un nuevo folder
   * @param folderData Datos del folder a crear
   * @returns Observable con el folder creado
   */
  createFolder(folderData: CreateFolderDto): Observable<Folder> {
    return from(
      this.supabaseService.getClient()
        .from('folder')
        .insert(folderData)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as Folder;
      }),
      catchError(error => {
        console.error('Error al crear folder:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza un folder existente
   * @param id ID del folder a actualizar
   * @param folderData Datos a actualizar
   * @returns Observable con el folder actualizado
   */
  updateFolder(id: number, folderData: UpdateFolderDto): Observable<Folder> {
    return from(
      this.supabaseService.getClient()
        .from('folder')
        .update(folderData)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as Folder;
      }),
      catchError(error => {
        console.error('Error al actualizar folder:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina un folder
   * @param id ID del folder a eliminar
   * @returns Observable con la confirmación de eliminación
   */
  deleteFolder(id: number): Observable<void> {
    return from(
      this.supabaseService.getClient()
        .from('folder')
        .delete()
        .eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
      }),
      catchError(error => {
        console.error('Error al eliminar folder:', error);
        throw error;
      })
    );
  }

  /**
   * Busca folders por nombre
   * @param searchTerm Término de búsqueda
   * @returns Observable con la lista de folders que coinciden
   */
  searchFoldersByName(searchTerm: string): Observable<Folder[]> {
    return from(
      this.supabaseService.getClient()
        .from('folder')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as Folder[];
      }),
      catchError(error => {
        console.error('Error al buscar folders:', error);
        throw error;
      })
    );
  }
}
