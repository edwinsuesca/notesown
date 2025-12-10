import { Component, ElementRef, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AppMenu } from './app.menu';
import { LayoutService } from '../service/layout.service';
import { RouterModule, Router } from '@angular/router';
import { NotesTreeComponent } from '../../components/notes-tree/notes-tree';
import { EditorStateService } from '../../services/editor-state.service';
import { NoteService } from '../../services/note.service';

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
  editorState = inject(EditorStateService);
  noteService = inject(NoteService);
  router = inject(Router);
  
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

  /**
   * Verifica si se puede crear una nueva nota
   * Solo se puede crear si hay una carpeta seleccionada
   */
  isCreateNoteEnabled(): boolean {
    return this.editorState.selectedFolder() !== null;
  }

  /**
   * Crea una nueva nota en la carpeta seleccionada
   */
  createNewNote(): void {
    const selectedFolder = this.editorState.selectedFolder();
    
    if (!selectedFolder) {
      console.warn('No hay carpeta seleccionada');
      return;
    }

    // Crear la nota en Supabase
    this.noteService.createNote({
      name: 'Nueva Nota',
      folder_id: selectedFolder.id
    }).subscribe({
      next: (newNote) => {
        // Establecer la nota recién creada como seleccionada
        this.editorState.setSelectedNote(newNote);
        
        // Notificar que se debe actualizar el árbol de notas
        this.editorState.notifyNoteCreated();
        
        // Navegar a la nota recién creada
        this.router.navigate([selectedFolder.id, newNote.id]);
      },
      error: (error) => {
        console.error('Error al crear la nota:', error);
        // TODO: Mostrar mensaje de error al usuario
      }
    });
  }
}
