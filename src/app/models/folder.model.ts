/**
 * Interfaz para representar un folder
 */
export interface Folder {
  id: number;
  created_at: string;
  updated_at?: string;
  name: string;
}

/**
 * Interfaz para crear un nuevo folder
 */
export interface CreateFolderDto {
  name: string;
}

/**
 * Interfaz para actualizar un folder
 */
export interface UpdateFolderDto {
  name?: string;
}