import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StyleClassModule } from 'primeng/styleclass';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { LayoutService } from '../service/layout.service';
import { AuthService } from '../../services/auth.service';
import { User } from '@supabase/supabase-js';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, StyleClassModule, AvatarModule, MenuModule],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
                <i class="pi pi-bars"></i>
            </button>
            <a class="layout-topbar-logo" routerLink="/">
                <img src="notesown-icon.svg" alt="Notesown" class="w-8">
                <span>Notesown</span>
            </a>
        </div>

        <div class="layout-topbar-actions">
            <div class="flex items-center gap-3" *ngIf="currentUser">
                <div class="flex flex-col items-end">
                    <span class="text-sm font-medium text-surface-900 dark:text-surface-0">{{ currentUser.email }}</span>
                    <span class="text-xs text-muted-color">{{ currentUser.user_metadata['full_name'] || 'Usuario' }}</span>
                </div>
                <p-avatar 
                    [label]="getInitials(currentUser.email || '')"
                    styleClass="bg-primary text-primary-contrast cursor-pointer"
                    shape="circle"
                    (click)="menu.toggle($event)">
                </p-avatar>
                <p-menu #menu [model]="userMenuItems" [popup]="true" styleClass="w-48"></p-menu>
            </div>
        </div>
    </div>`
})
export class AppTopbar implements OnInit {
    items!: MenuItem[];
    currentUser: User | null = null;
    userMenuItems: MenuItem[] = [];

    constructor(
        public layoutService: LayoutService,
        private authService: AuthService
    ) {}

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
            next: () => {
                console.log('Sesión cerrada exitosamente');
            },
            error: (error) => {
                console.error('Error al cerrar sesión:', error);
            }
        });
    }
}
