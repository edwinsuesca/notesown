import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChecklistCard, ChecklistItem } from '../../components/cards/checklist/checklist';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { MasonryGrid } from '../../components/masonry-grid/masonry-grid';
import { TextCard } from '@/components/cards/text-card/text-card';

export type TextType = 'paragraph' | 'link' | 'highlight';
export type CardType = 'text' | 'checklist' | TextType;

export interface NoteCard {
  id: string;
  title: string;
  type: CardType;
  isTextType: boolean;
  textType?: TextType;
  content?: string;
  items?: ChecklistItem[];
}

@Component({
  selector: 'app-note-editor',
  imports: [
    CommonModule,
    ButtonModule,
    MenuModule,
    MasonryGrid,
    TextCard,
    ChecklistCard,
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
    },
    { 
      label: 'Enlace', 
      icon: 'pi pi-link',
      command: () => this.addCard('link')
    }
  ];

  addCard(type: CardType) {
    const newCard: NoteCard = {
      id: crypto.randomUUID(),
      title: 'Nueva tarjeta',
      isTextType: type === 'paragraph' || type === 'highlight' || type === 'link',
      type,
      content: type !== 'checklist' ? '' : undefined,
      items: type === 'checklist' ? [{ id: crypto.randomUUID(), text: '', checked: false }] : undefined,
      textType: type === 'paragraph' || type === 'highlight' || type === 'link' ? type : undefined
    };
    
    this.cards.update(cards => [...cards, newCard]);
  }

  updateCardTitle(id: string, title: string) {
    this.cards.update(cards =>
      cards.map(card => card.id === id ? { ...card, title } : card)
    );
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
