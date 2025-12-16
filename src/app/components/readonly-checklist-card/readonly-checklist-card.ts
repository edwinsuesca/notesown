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
  templateUrl: './readonly-checklist-card.html',
  styles: []
})
export class ReadonlyChecklistCard {
  title = input<string>('Nueva tarjeta');
  updatedAt = input<string>();
  items = input<ChecklistItem[]>([]);
  cardClick = output<void>();
}
