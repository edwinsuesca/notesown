import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

@Component({
  selector: 'app-readonly-checklist-card',
  standalone: true,
  imports: [CommonModule, FormsModule, CheckboxModule],
  template: `
    <div class="card relative group !px-3 !py-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]"
         (click)="cardClick.emit()">
      <h3 class="text-lg font-semibold text-surface-800 !m-0 !mb-2 opacity-50">
        {{ title() }}
      </h3>
      
      <div class="space-y-3 mb-3">
        @for (item of items(); track item.id) {
          <div class="flex items-center gap-3">
            <p-checkbox 
              [binary]="true"
              [ngModel]="item.checked"
              [disabled]="true"
              [inputId]="'check-readonly-' + item.id"
              styleClass="pointer-events-none">
            </p-checkbox>
            <span 
              class="flex-1"
              [class.line-through]="item.checked"
              [class.opacity-50]="item.checked">
              {{ item.text || 'Sin texto' }}
            </span>
          </div>
        }
        @if (items().length === 0) {
          <p class="text-sm opacity-30">
            Sin items
          </p>
        }
      </div>
    </div>
  `,
  styles: []
})
export class ReadonlyChecklistCard {
  title = input<string>('Nueva tarjeta');
  items = input<ChecklistItem[]>([]);
  cardClick = output<void>();
}
