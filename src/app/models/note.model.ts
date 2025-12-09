/**
 * Interfaz para representar una nota
 */
export interface Note {
  id: number;
  created_at: string;
  folder_id: number;
  name: string;
  user_id: string;
  content?: string; // Contenido de la nota (si existe en la BD)
}

/**
 * Interfaz para crear una nueva nota
 */
export interface CreateNoteDto {
  name: string;
  folder_id: number;
  content?: string;
}

/**
 * Interfaz para actualizar una nota
 */
export interface UpdateNoteDto {
  name?: string;
  folder_id?: number;
  content?: string;
}