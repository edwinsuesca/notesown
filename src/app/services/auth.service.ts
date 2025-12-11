import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from, firstValueFrom } from 'rxjs';
import { map, catchError, filter } from 'rxjs/operators';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { LoginCredentials, RegisterCredentials } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private sessionInitialized = false;
  private initializationPromise: Promise<void>;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    this.currentUserSubject = new BehaviorSubject<User | null>(null);
    this.currentUser = this.currentUserSubject.asObservable();
    this.initializationPromise = this.initializeAuthListener();
  }

  /**
   * Obtiene el valor actual del usuario
   */
  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Inicializa el listener de cambios de autenticación
   */
  private async initializeAuthListener(): Promise<void> {
    try {
      const session = await this.supabaseService.getSession();
      
      if (session?.user) {
        this.currentUserSubject.next(session.user);
      } else {
        this.currentUserSubject.next(null);
      }

      // NOTA: authChanges deshabilitado porque causa bucle infinito
      // cuando persistSession está deshabilitado
      
    } catch (error) {
      console.error('Error al inicializar autenticación:', error);
      this.currentUserSubject.next(null);
    } finally {
      this.sessionInitialized = true;
    }
  }

  /**
   * Inicia sesión con email y contraseña
   */
  login(credentials: LoginCredentials): Observable<User> {
    return from(
      this.supabaseService.getClient().auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        if (!response.data.user) {
          throw new Error('No se pudo obtener el usuario');
        }
        this.currentUserSubject.next(response.data.user);
        return response.data.user;
      }),
      catchError(error => {
        console.error('Error en login:', error);
        throw error;
      })
    );
  }

  /**
   * Registra un nuevo usuario
   */
  register(credentials: RegisterCredentials): Observable<User> {
    return from(
      this.supabaseService.getClient().auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.fullName
          }
        }
      })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        if (!response.data.user) {
          throw new Error('No se pudo crear el usuario');
        }
        return response.data.user;
      }),
      catchError(error => {
        console.error('Error en registro:', error);
        throw error;
      })
    );
  }

  /**
   * Cierra la sesión del usuario actual
   */
  logout(): Observable<void> {
    return from(
      this.supabaseService.getClient().auth.signOut()
    ).pipe(
      map(() => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/auth/login']);
      }),
      catchError(error => {
        console.error('Error en logout:', error);
        throw error;
      })
    );
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this.currentUserValue !== null;
  }

  /**
   * Espera a que la sesión se inicialice
   */
  async waitForInitialization(): Promise<void> {
    return this.initializationPromise;
  }

  /**
   * Verifica si la sesión ya se inicializó
   */
  isSessionInitialized(): boolean {
    return this.sessionInitialized;
  }

  /**
   * Recuperación de contraseña
   */
  resetPassword(email: string): Observable<void> {
    return from(
      this.supabaseService.getClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
      }),
      catchError(error => {
        console.error('Error en recuperación de contraseña:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza la contraseña del usuario
   */
  updatePassword(newPassword: string): Observable<User> {
    return from(
      this.supabaseService.getClient().auth.updateUser({
        password: newPassword
      })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        if (!response.data.user) {
          throw new Error('No se pudo actualizar la contraseña');
        }
        return response.data.user;
      }),
      catchError(error => {
        console.error('Error al actualizar contraseña:', error);
        throw error;
      })
    );
  }
}
