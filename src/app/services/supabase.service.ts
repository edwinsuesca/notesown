import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

/**
 * Custom storage usando localStorage para persistir la sesión
 * localStorage mantiene la sesión incluso después de cerrar el navegador
 */
class LocalStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: new LocalStorageAdapter() as any,
          storageKey: 'supabase.auth.token'
        }
      }
    );
  }

  /**
   * Obtiene la instancia del cliente de Supabase
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Obtiene el usuario actual autenticado
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  /**
   * Obtiene la sesión actual
   */
  async getSession() {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }

  /**
   * Observable para escuchar cambios en el estado de autenticación
   */
  authChanges(callback: (event: string, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }
}
