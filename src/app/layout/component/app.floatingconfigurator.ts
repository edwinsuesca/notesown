import { Component, computed, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { LayoutService } from '../service/layout.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-floating-configurator',
    imports: [CommonModule, ButtonModule, TooltipModule],
    template: `
        <div class="fixed top-8 right-8 z-50" *ngIf="float()">
            <p-button 
                type="button" 
                (onClick)="toggleDarkMode()" 
                [rounded]="true" 
                [icon]="isDarkTheme() ? 'pi pi-moon' : 'pi pi-sun'" 
                severity="secondary"
                [pTooltip]="isDarkTheme() ? 'Modo claro' : 'Modo oscuro'"
                tooltipPosition="left" />
        </div>
    `
})
export class AppFloatingConfigurator {
    LayoutService = inject(LayoutService);

    float = input<boolean>(true);

    isDarkTheme = computed(() => this.LayoutService.layoutConfig().darkTheme);

    toggleDarkMode() {
        this.LayoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
    }
}
