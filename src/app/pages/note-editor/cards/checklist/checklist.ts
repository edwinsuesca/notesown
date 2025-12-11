import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { ConfirmationService } from 'primeng/api';

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

@Component({
  selector: 'app-checklist-card',
  standalone: true,
  imports: [CommonModule, FormsModule, CheckboxModule, ButtonModule, ConfirmPopupModule],
  providers: [ConfirmationService],
  templateUrl: './checklist.html',
  styleUrl: './checklist.css',
})
export class ChecklistCard {
  title = input<string>('Nueva tarjeta');
  titleChange = output<string>();
  items = input<ChecklistItem[]>([]);
  itemsChange = output<ChecklistItem[]>();
  remove = output<void>();
  confirmationService = inject(ConfirmationService)

  onTitleChange(value: string) {
    this.titleChange.emit(value || 'Nueva tarjeta');
  }

  addItem() {
    const newItems = [...this.items(), {
      id: crypto.randomUUID(),
      text: '',
      checked: false
    }];
    this.itemsChange.emit(newItems);
    
    // Enfocar el nuevo item después de que se renderice
    setTimeout(() => {
      const inputs = document.querySelectorAll('.checklist-input');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
      lastInput?.focus();
    }, 0);
  }

  updateItem(id: string, text: string) {
    const newItems = this.items().map(item =>
      item.id === id ? { ...item, text } : item
    );
    this.itemsChange.emit(newItems);
  }

  toggleItem(id: string) {
    const newItems = this.items().map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    this.itemsChange.emit(newItems);
  }

  removeItem(id: string) {
    const newItems = this.items().filter(item => item.id !== id);
    this.itemsChange.emit(newItems);
  }

  onKeyDown(event: KeyboardEvent, itemId: string, index: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      
      const isLastItem = index === this.items().length - 1;
      
      if (isLastItem) {
        // Si es el último item, agregar uno nuevo
        this.addItem();
      } else {
        // Si no es el último, enfocar el siguiente
        const inputs = document.querySelectorAll('.checklist-input');
        const nextInput = inputs[index + 1] as HTMLInputElement;
        nextInput?.focus();
      }
    }
  }

  confirmRemove(event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: '¿Eliminar esta tarjeta?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-sm',
      accept: () => {
        this.remove.emit();
      }
    });
  }
}
