/**
 * Interfaz para representar un item de nota (tarjeta)
 */
export interface ItemNote {
  id: string;
  note_id: number;
  title: string;
  type: string;
  content?: string;
  items?: any; // Para checklist items, se guardará como JSON
  text_type?: string;
  order: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interfaz para crear un nuevo item de nota
 */
export interface CreateItemNoteDto {
  id?: string; // Opcional: permite especificar el ID (UUID generado en el cliente)
  note_id: number;
  title: string;
  type: string;
  content?: string;
  items?: any;
  text_type?: string;
  order: number;
}

/**
 * Interfaz para actualizar un item de nota
 */
export interface UpdateItemNoteDto {
  title?: string;
  type?: string;
  content?: string;
  items?: any;
  text_type?: string;
  order?: number;
}
