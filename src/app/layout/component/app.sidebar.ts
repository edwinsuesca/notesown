import { Component, ElementRef, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AppMenu } from './app.menu';
import { LayoutService } from '../service/layout.service';
import { RouterModule } from '@angular/router';
import { NotesTreeComponent } from '../../components/notes-tree/notes-tree.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, AppMenu, ButtonModule, TooltipModule, RouterModule, NotesTreeComponent],
  template: ` 
    <div class="layout-sidebar flex flex-col">
      <!-- Área principal para notas -->
      <div class="flex-1 overflow-y-auto">
        <app-notes-tree></app-notes-tree>
      </div>

      <!-- Botón de nueva nota con routerLink -->
      <p-button
        icon="pi pi-plus"
        routerLink="/editor"
        [pTooltip]="'Nueva nota'"
        label="Nueva nota"
        styleClass="w-full mb-4"
        tooltipPosition="top"/>
      
      <!-- Menú de navegación -->
      <app-menu></app-menu>
      
      <!-- Controles de apariencia -->
      <div class="flex gap-2 p-4">
        <p-button 
          [text]="true"
          [rounded]="true"
          icon="pi pi-sun"
          [severity]="isLightThemeActive() ? 'primary' : 'secondary'"
          (onClick)="setLightTheme()"
          [pTooltip]="'Modo claro'"
          tooltipPosition="top"
          styleClass="flex-1 justify-center">
        </p-button>
        <p-button 
          [text]="true"
          [rounded]="true"
          icon="pi pi-moon"
          [severity]="isDarkThemeActive() ? 'primary' : 'secondary'"
          (onClick)="setDarkTheme()"
          [pTooltip]="'Modo oscuro'"
          tooltipPosition="top"
          styleClass="flex-1 justify-center">
        </p-button>
        <p-button 
          [text]="true"
          [rounded]="true"
          icon="pi pi-desktop"
          [severity]="isSystemThemeActive() ? 'primary' : 'secondary'"
          (onClick)="setSystemTheme()"
          [pTooltip]="'Seguir sistema'"
          tooltipPosition="top"
          styleClass="flex-1 justify-center">
        </p-button>
      </div>
    </div>
  `
})
export class AppSidebar {
  layoutService = inject(LayoutService);
  
  isDarkTheme = computed(() => this.layoutService.layoutConfig().darkTheme);
  followSystemTheme = computed(() => this.layoutService.layoutConfig().followSystemTheme);

  constructor(public el: ElementRef) {}

  isLightThemeActive(): boolean {
    return !this.isDarkTheme() && !this.followSystemTheme();
  }

  isDarkThemeActive(): boolean {
    return !!this.isDarkTheme() && !this.followSystemTheme();
  }

  isSystemThemeActive(): boolean {
    return !!this.followSystemTheme();
  }

  setLightTheme() {
    this.layoutService.layoutConfig.update((state) => ({ 
      ...state, 
      darkTheme: false,
      followSystemTheme: false 
    }));
  }

  setDarkTheme() {
    this.layoutService.layoutConfig.update((state) => ({ 
      ...state, 
      darkTheme: true,
      followSystemTheme: false 
    }));
  }

  setSystemTheme() {
    const systemTheme = this.layoutService.getSystemTheme();
    this.layoutService.layoutConfig.update((state) => ({ 
      ...state, 
      followSystemTheme: true,
      darkTheme: systemTheme
    }));
  }
}
