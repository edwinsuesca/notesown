import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParagraphCard } from '../../components/cards/paragraph-card/paragraph-card';
import { ChecklistCard, ChecklistItem } from '../../components/cards/checklist-card/checklist-card';
import { HighlightCard } from '../../components/cards/highlight-card/highlight-card';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { MasonryGrid } from '../../components/masonry-grid/masonry-grid';

export type CardType = 'paragraph' | 'checklist' | 'highlight';

export interface NoteCard {
  id: string;
  type: CardType;
  content?: string;
  items?: ChecklistItem[];
}

@Component({
  selector: 'app-note-editor',
  imports: [
    CommonModule,
    ParagraphCard,
    ChecklistCard,
    HighlightCard,
    ButtonModule,
    MenuModule,
    MasonryGrid
  ],
  templateUrl: './note-editor.html',
  styleUrl: './note-editor.css',
})
export class NoteEditor {
  @ViewChild('menu') menu!: Menu;
  
  cards = signal<NoteCard[]>([]);
  noteTitle = signal<string>('Mi Nota');

  menuItems: MenuItem[] = [
    { 
      label: 'Párrafo', 
      icon: 'pi pi-align-left',
      command: () => this.addCard('paragraph')
    },
    { 
      label: 'Checklist', 
      icon: 'pi pi-check-square',
      command: () => this.addCard('checklist')
    },
    { 
      label: 'Nota Resaltada', 
      icon: 'pi pi-star',
      command: () => this.addCard('highlight')
    }
  ];

  addCard(type: CardType) {
    const newCard: NoteCard = {
      id: crypto.randomUUID(),
      type,
      content: type !== 'checklist' ? '' : undefined,
      items: type === 'checklist' ? [{ id: crypto.randomUUID(), text: '', checked: false }] : undefined
    };
    
    this.cards.update(cards => [...cards, newCard]);
  }

  updateCardContent(id: string, content: string) {
    this.cards.update(cards =>
      cards.map(card => card.id === id ? { ...card, content } : card)
    );
  }

  updateCardItems(id: string, items: ChecklistItem[]) {
    this.cards.update(cards =>
      cards.map(card => card.id === id ? { ...card, items } : card)
    );
  }

  removeCard(id: string) {
    this.cards.update(cards => cards.filter(card => card.id !== id));
  }
}
