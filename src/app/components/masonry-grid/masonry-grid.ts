import {
  Component,
  ElementRef,
  QueryList,
  ViewChild,
  ViewChildren,
  AfterViewInit,
  AfterViewChecked,
  OnDestroy,
  Renderer2
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-masonry-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './masonry-grid.html',
  styleUrl: './masonry-grid.css'
})
export class MasonryGrid implements AfterViewInit, AfterViewChecked, OnDestroy {
  @ViewChild('gridContainer', { static: true }) gridContainer!: ElementRef<HTMLElement>;

  private needsAdjustment = false;
  private observer!: MutationObserver;

  private rowHeight = 1; // igual a grid-auto-rows
  private gap = 16;      // igual a gap

  constructor(private renderer: Renderer2) {}

  ngAfterViewInit() {
    // Esperar a que el DOM esté completamente renderizado
    setTimeout(() => {
      this.updateGridSettings();
      this.adjustAllCards();
    }, 150);
    
    // Observar cambios en los hijos del contenedor (ng-content)
    this.observer = new MutationObserver(() => {
      this.needsAdjustment = true;
    });
    
    this.observer.observe(this.gridContainer.nativeElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    window.addEventListener('resize', this.onResize);
  }

  ngAfterViewChecked() {
    // Ajustar después de cada cambio en la vista
    if (this.needsAdjustment) {
      this.needsAdjustment = false;
      setTimeout(() => this.adjustAllCards(), 50);
    }
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onResize);
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private updateGridSettings() {
    const style = getComputedStyle(this.gridContainer.nativeElement);
    this.rowHeight = parseFloat(style.getPropertyValue('grid-auto-rows')) || this.rowHeight;
    this.gap = parseFloat(style.getPropertyValue('gap')) || this.gap;
  }

  private adjustAllCards() {
    const children = Array.from(this.gridContainer.nativeElement.children) as HTMLElement[];
    
    if (children.length === 0) return;
    
    // Resetear todos los spans primero
    children.forEach((child) => {
      this.renderer.removeStyle(child, 'grid-row-end');
    });
    
    // Forzar reflow para obtener alturas reales
    this.gridContainer.nativeElement.offsetHeight;
    
    // Pequeño delay para asegurar que el navegador haya aplicado los cambios
    requestAnimationFrame(() => {
      children.forEach((child) => {
        // Obtener la altura real del elemento
        const cardHeight = child.getBoundingClientRect().height;
        
        // Calcular cuántas filas necesita
        const rowSpan = Math.ceil((cardHeight + this.gap) / (this.rowHeight + this.gap));
        
        this.renderer.setStyle(child, 'grid-row-end', `span ${rowSpan}`);
      });
    });
  }

  private onResize = () => {
    this.updateGridSettings();
    
    // Delay más largo para resize
    setTimeout(() => this.adjustAllCards(), 100);
  };
}
