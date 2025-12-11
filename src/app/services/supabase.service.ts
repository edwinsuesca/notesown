import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

/**
 * Custom storage usando sessionStorage para evitar Navigator.locks
 * sessionStorage persiste la sesión durante la pestaña pero no usa locks
 */
class SessionStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return sessionStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    sessionStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    sessionStorage.removeItem(key);
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
          storage: new SessionStorageAdapter() as any,
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
