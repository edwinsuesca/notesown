import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecentItem } from '@/pages/dashboard/dashboard';
import { ItemNoteRow } from '@/services/search.service';

@Component({
  selector: 'app-readonly-text-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './readonly-text-card.html',
  styles: []
})
export class ReadonlyTextCard {
  item = input.required<RecentItem | ItemNoteRow>();
  cardClick = output<void>();

  cardClass = computed(() => {
    switch (this.item().text_type) {
      case 'paragraph':
        return 'card relative group !px-3 !py-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]';
      case 'link':
        return 'card link relative group !px-3 !py-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]';
      case 'highlight':
        return 'relative group !px-3 !py-2 bg-amber-400/20 rounded-lg shadow-md border-l-4 border-amber-400 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]';
      default:
        return 'card relative group !px-3 !py-2 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]';
    }
  });

  contentClass = computed(() => {
    const baseClass = 'w-full leading-relaxed whitespace-pre-wrap break-words';
    if (this.item().text_type === 'link') {
      return `${baseClass} text-blue-600`;
    }
    return baseClass;
  });
}
