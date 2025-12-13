import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { LayoutService } from '../../service/layout.service';
import { AuthService } from '../../../services/auth.service';
import { User } from '@supabase/supabase-js';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterModule, CommonModule, StyleClassModule, AvatarModule, MenuModule],
  templateUrl: './app.topbar.html'
})
export class AppTopbar implements OnInit {
  items!: MenuItem[];
  currentUser: User | null = null;
  userMenuItems: MenuItem[] = [];

  constructor(
    public layoutService: LayoutService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    // Suscribirse al usuario actual
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
      this.setupUserMenu();
    });
  }

  setupUserMenu() {
    this.userMenuItems = [
      {
        label: 'Perfil',
        icon: 'pi pi-user',
        command: () => {
          // Navegar a perfil
        }
      },
      {
        label: 'Configuración',
        icon: 'pi pi-cog',
        routerLink: '/settings'
      },
      {
        separator: true
      },
      {
        label: 'Cerrar sesión',
        icon: 'pi pi-sign-out',
        command: () => {
          this.logout();
        }
      }
    ];
  }

  getInitials(email: string): string {
    if (!email) return 'U';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => { },
      error: (error) => {
        console.error('Error al cerrar sesión:', error);
      }
    });
  }

  /**
   * Navega al dashboard y activa el modo de búsqueda
   */
  navigateToSearch(): void {
    this.router.navigate(['/dashboard'], { 
      queryParams: { search: 'true' }
    });
  }
}
