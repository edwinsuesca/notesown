import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

@Component({
  selector: 'app-checklist-card',
  imports: [CommonModule, FormsModule, CheckboxModule, ButtonModule],
  templateUrl: './checklist-card.html',
  styleUrl: './checklist-card.css',
})
export class ChecklistCard {
  items = input<ChecklistItem[]>([]);
  itemsChange = output<ChecklistItem[]>();
  remove = output<void>();

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

  onRemove() {
    this.remove.emit();
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
}
