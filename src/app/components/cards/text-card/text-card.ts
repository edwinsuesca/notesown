import { Component, computed, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { Button } from 'primeng/button';
import { TextType } from '@/pages/note-editor/note-editor';

@Component({
  selector: 'app-text-card',
  standalone: true,
  imports: [Button],
  templateUrl: './text-card.html',
  styleUrl: './text-card.scss'
})
export class TextCard {
  title = input<string>('Nueva tarjeta');
  titleChange = output<string>();
  content = input<string>('');
  contentChange = output<string>();
  remove = output<void>();
  textType = input.required<TextType>();
  textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textareaRef');
  isEditing = signal<boolean>(false);

  constructor() {
    // Ajustar altura cuando cambia el contenido desde el input
    effect(() => {
      const content = this.content();
      const textarea = this.textareaRef()?.nativeElement;
      if (textarea) {
        setTimeout(() => this.adjustHeight(textarea), 0);
      }
    });

    // Iniciar en modo edición si es un link sin contenido
    effect(() => {
      if (this.textType() === 'link' && !this.content()) {
        this.isEditing.set(true);
      }
    });
  }

  onContentChange(value: string) {
    this.contentChange.emit(value);
  }

  onTitleChange(value: string) {
    this.titleChange.emit(value || 'Nueva tarjeta');
  }

  autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.adjustHeight(textarea);
  }

  private adjustHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  cardClass = computed(() => {
    switch (this.textType()) {
      case 'paragraph':
        return 'card relative group !px-3 !py-2';
      case 'link':
        return 'card link relative group !px-3 !py-2';
      case 'highlight':
        return 'relative group !px-3 !py-2 bg-amber-400/20 rounded-lg shadow-md border-l-4 border-amber-400';
    }
  });

  textareaClass = computed(() => {
    const baseClass = 'w-full border-none outline-none bg-transparent leading-relaxed resize-none overflow-hidden';
    if (this.textType() === 'link') {
      return `${baseClass} text-blue-600`;
    }
    return baseClass;
  });

  startEditing() {
    this.isEditing.set(true);
    setTimeout(() => {
      const textarea = this.textareaRef()?.nativeElement;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 0);
  }

  stopEditing() {
    this.isEditing.set(false);
  }
}
