import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { MessageModule } from 'primeng/message';
import { CommonModule } from '@angular/common';
import { AppFloatingConfigurator } from '../../layout/component/app.floatingconfigurator';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule, AppFloatingConfigurator, MessageModule, CommonModule],
  template: `
        <app-floating-configurator />
        <div class="flex flex-col items-center justify-center min-h-screen min-w-screen overflow-hidden">
          <div class="py-20 px-8 sm:px-20">
              <div class="flex flex-col items-center mb-8">
                  <img src="notesown-icon.svg" alt="Notesown" class="mb-4 h-12">
                  <div class="text-center text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Bienvenido a Notesown!</div>
                  <span class="text-center text-muted-color font-medium">Inicia sesión para continuar</span>
              </div>

              <div>
                  <label for="email" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Correo electrónico</label>
                  <input pInputText id="email" type="email" placeholder="Correo electrónico" class="w-full md:w-120 mb-8" [(ngModel)]="email" />

                  <label for="password" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Contraseña</label>
                  <p-password id="password" [(ngModel)]="password" placeholder="Contraseña" [toggleMask]="true" class="mb-4" [fluid]="true" [feedback]="false"></p-password>

                  <p-message *ngIf="errorMessage" severity="error" [text]="errorMessage" styleClass="mb-4 w-full"></p-message>
                  
                  <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                      <div class="flex items-center">
                          <p-checkbox [(ngModel)]="checked" id="rememberme1" binary class="mr-2"></p-checkbox>
                          <label for="rememberme1">Recordarme</label>
                      </div>
                      <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary">¿Olvidaste tu contraseña?</span>
                  </div>
                  <p-button 
                      label="Iniciar sesión" 
                      styleClass="w-full" 
                      (onClick)="onLogin()" 
                      [loading]="loading"
                      [disabled]="loading || !email || !password">
                  </p-button>
              </div>
          </div>
        </div>
    `
})
export class Login {
  email: string = '';
  password: string = '';
  checked: boolean = false;
  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  onLogin(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor ingrese email y contraseña';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login({
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        // Redirigir a la ruta principal o a la ruta de retorno
        const returnUrl = this.getReturnUrl();
        this.router.navigate([returnUrl]);
      },
      error: (error) => {
        this.loading = false;
        console.error('Error en login:', error);

        // Manejar diferentes tipos de errores
        if (error.message?.includes('Invalid login credentials')) {
          this.errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña.';
        } else if (error.message?.includes('Email not confirmed')) {
          this.errorMessage = 'Por favor confirma tu email antes de iniciar sesión.';
        } else {
          this.errorMessage = error.message || 'Error al iniciar sesión. Intenta nuevamente.';
        }
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  private getReturnUrl(): string {
    // Obtener la URL de retorno de los query params
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('returnUrl') || '/';
  }
}
