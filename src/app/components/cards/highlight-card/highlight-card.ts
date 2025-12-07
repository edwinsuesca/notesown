import { Component, effect, ElementRef, input, output, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-highlight-card',
  imports: [FormsModule, ButtonModule],
  templateUrl: './highlight-card.html',
  styleUrl: './highlight-card.css',
})
export class HighlightCard {
  content = input<string>('');
  contentChange = output<string>();
  remove = output<void>();
textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textareaRef');

  constructor() {
    // Ajustar altura cuando cambia el contenido desde el input
    effect(() => {
      const content = this.content();
      const textarea = this.textareaRef()?.nativeElement;
      if (textarea) {
        setTimeout(() => this.adjustHeight(textarea), 0);
      }
    });
  }

  onContentChange(value: string) {
    this.contentChange.emit(value);
  }

  autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.adjustHeight(textarea);
  }

  private adjustHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  onRemove() {
    this.remove.emit();
  }
}
