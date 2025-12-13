import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TextType = 'paragraph' | 'link' | 'highlight';

@Component({
  selector: 'app-readonly-text-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="cardClass()" (click)="cardClick.emit()">
      <h3 class="text-lg font-semibold text-surface-800 !m-0 !mb-2 opacity-50">
        {{ title() }}
      </h3>
      
      @if (textType() === 'link' && content()) {
        <a 
          [href]="content()" 
          target="_blank" 
          rel="noopener noreferrer"
          (click)="$event.stopPropagation()"
          class="text-blue-500 hover:text-blue-600 underline cursor-pointer break-all">
          {{ content() }}
        </a>
      } @else {
        <div [class]="contentClass()">
          {{ content() || 'Sin contenido' }}
        </div>
      }
    </div>
  `,
  styles: []
})
export class ReadonlyTextCard {
  title = input<string>('Nueva tarjeta');
  content = input<string>('');
  textType = input.required<TextType>();
  cardClick = output<void>();

  cardClass = computed(() => {
    switch (this.textType()) {
      case 'paragraph':
        return 'card relative group !px-3 !py-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]';
      case 'link':
        return 'card link relative group !px-3 !py-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]';
      case 'highlight':
        return 'relative group !px-3 !py-2 bg-amber-400/20 rounded-lg shadow-md border-l-4 border-amber-400 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]';
    }
  });

  contentClass = computed(() => {
    const baseClass = 'w-full leading-relaxed whitespace-pre-wrap break-words';
    if (this.textType() === 'link') {
      return `${baseClass} text-blue-600`;
    }
    return baseClass;
  });
}
