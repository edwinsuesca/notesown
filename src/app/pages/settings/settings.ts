import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { $t, updatePreset, updateSurfacePalette } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara';
import Nora from '@primeuix/themes/nora';
import { PrimeNG } from 'primeng/config';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import { LayoutService } from '../../layout/service/layout.service';
import { SURFACE_PALETTES, SurfacePalette } from '../../shared/constants/surface-palettes';

const presets = {
  Aura,
  Lara,
  Nora
} as const;

declare type KeyOfType<T> = keyof T extends infer U ? U : never;

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectButtonModule, ButtonModule, ToggleSwitchModule, BreadcrumbModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings {
  router = inject(Router);
  config: PrimeNG = inject(PrimeNG);
  layoutService: LayoutService = inject(LayoutService);
  platformId = inject(PLATFORM_ID);
  primeng = inject(PrimeNG);

  presets = Object.keys(presets);

  showMenuModeButton = signal(!this.router.url.includes('auth'));

  breadcrumbItems: MenuItem[] = [{ label: 'Configuración' }];

  breadcrumbHome: MenuItem = {
    icon: 'pi pi-home',
    label: 'Inicio',
    command: () => this.router.navigate(['/dashboard'])
  };

  menuModeOptions = [
    { label: 'Static', value: 'static' },
    { label: 'Overlay', value: 'overlay' }
  ];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.onPresetChange(this.layoutService.layoutConfig().preset);
    }
  }

  surfaces: SurfacePalette[] = SURFACE_PALETTES;

  selectedPrimaryColor = computed(() => {
    return this.layoutService.layoutConfig().primary;
  });

  selectedSurfaceColor = computed(() => this.layoutService.layoutConfig().surface);

  selectedPreset = computed(() => this.layoutService.layoutConfig().preset);

  menuMode = computed(() => this.layoutService.layoutConfig().menuMode);

  isDarkTheme = computed(() => this.layoutService.layoutConfig().darkTheme);

  followSystemTheme = computed(() => this.layoutService.layoutConfig().followSystemTheme);

  primaryColors = computed<SurfacePalette[]>(() => {
    const presetPalette = presets[this.layoutService.layoutConfig().preset as KeyOfType<typeof presets>].primitive;
    const colors = ['emerald', 'green', 'lime', 'orange', 'amber', 'yellow', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
    const palettes: SurfacePalette[] = [{ name: 'noir', palette: {} }];

    colors.forEach((color) => {
      palettes.push({
        name: color,
        palette: presetPalette?.[color as KeyOfType<typeof presetPalette>] as SurfacePalette['palette']
      });
    });

    return palettes;
  });

  toggleDarkMode() {
    this.layoutService.layoutConfig.update((state) => ({
      ...state,
      darkTheme: !state.darkTheme,
      followSystemTheme: false // Desactivar seguimiento del sistema al cambiar manualmente
    }));
  }

  toggleFollowSystemTheme() {
    const newFollowSystem = !this.layoutService.layoutConfig().followSystemTheme;

    if (newFollowSystem) {
      // Si activamos seguir el sistema, aplicar el tema del sistema actual
      const systemTheme = this.layoutService.getSystemTheme();
      this.layoutService.layoutConfig.update((state) => ({
        ...state,
        followSystemTheme: true,
        darkTheme: systemTheme
      }));
    } else {
      // Si desactivamos, mantener el tema actual
      this.layoutService.layoutConfig.update((state) => ({
        ...state,
        followSystemTheme: false
      }));
    }
  }

  getPresetExt() {
    const color: SurfacePalette = this.primaryColors().find((c) => c.name === this.selectedPrimaryColor()) || { name: '', palette: {} };
    const preset = this.layoutService.layoutConfig().preset;

    if (color.name === 'noir') {
      return {
        semantic: {
          primary: {
            50: '{surface.50}',
            100: '{surface.100}',
            200: '{surface.200}',
            300: '{surface.300}',
            400: '{surface.400}',
            500: '{surface.500}',
            600: '{surface.600}',
            700: '{surface.700}',
            800: '{surface.800}',
            900: '{surface.900}',
            950: '{surface.950}'
          },
          colorScheme: {
            light: {
              primary: {
                color: '{primary.950}',
                contrastColor: '#ffffff',
                hoverColor: '{primary.800}',
                activeColor: '{primary.700}'
              },
              highlight: {
                background: '{primary.950}',
                focusBackground: '{primary.700}',
                color: '#ffffff',
                focusColor: '#ffffff'
              }
            },
            dark: {
              primary: {
                color: '{primary.50}',
                contrastColor: '{primary.950}',
                hoverColor: '{primary.200}',
                activeColor: '{primary.300}'
              },
              highlight: {
                background: '{primary.50}',
                focusBackground: '{primary.300}',
                color: '{primary.950}',
                focusColor: '{primary.950}'
              }
            }
          }
        }
      };
    } else {
      if (preset === 'Nora') {
        return {
          semantic: {
            primary: color.palette,
            colorScheme: {
              light: {
                primary: {
                  color: '{primary.600}',
                  contrastColor: '#ffffff',
                  hoverColor: '{primary.700}',
                  activeColor: '{primary.800}'
                },
                highlight: {
                  background: '{primary.600}',
                  focusBackground: '{primary.700}',
                  color: '#ffffff',
                  focusColor: '#ffffff'
                }
              },
              dark: {
                primary: {
                  color: '{primary.500}',
                  contrastColor: '{surface.900}',
                  hoverColor: '{primary.400}',
                  activeColor: '{primary.300}'
                },
                highlight: {
                  background: '{primary.500}',
                  focusBackground: '{primary.400}',
                  color: '{surface.900}',
                  focusColor: '{surface.900}'
                }
              }
            }
          }
        };
      } else {
        return {
          semantic: {
            primary: color.palette,
            colorScheme: {
              light: {
                primary: {
                  color: '{primary.500}',
                  contrastColor: '#ffffff',
                  hoverColor: '{primary.600}',
                  activeColor: '{primary.700}'
                },
                highlight: {
                  background: '{primary.50}',
                  focusBackground: '{primary.100}',
                  color: '{primary.700}',
                  focusColor: '{primary.800}'
                }
              },
              dark: {
                primary: {
                  color: '{primary.400}',
                  contrastColor: '{surface.900}',
                  hoverColor: '{primary.300}',
                  activeColor: '{primary.200}'
                },
                highlight: {
                  background: 'color-mix(in srgb, {primary.400}, transparent 84%)',
                  focusBackground: 'color-mix(in srgb, {primary.400}, transparent 76%)',
                  color: 'rgba(255,255,255,.87)',
                  focusColor: 'rgba(255,255,255,.87)'
                }
              }
            }
          }
        };
      }
    }
  }

  updateColors(event: any, type: string, color: any) {
    if (type === 'primary') {
      this.layoutService.layoutConfig.update((state) => ({ ...state, primary: color.name }));
    } else if (type === 'surface') {
      this.layoutService.layoutConfig.update((state) => ({ ...state, surface: color.name }));
    }
    this.applyTheme(type, color);

    event.stopPropagation();
  }

  applyTheme(type: string, color: any) {
    if (type === 'primary') {
      updatePreset(this.getPresetExt());
    } else if (type === 'surface') {
      updateSurfacePalette(color.palette);
    }
  }

  onPresetChange(event: any) {
    this.layoutService.layoutConfig.update((state) => ({ ...state, preset: event }));
    const preset = presets[event as KeyOfType<typeof presets>];
    const surfacePalette = this.surfaces.find((s) => s.name === this.selectedSurfaceColor())?.palette;
    $t().preset(preset).preset(this.getPresetExt()).surfacePalette(surfacePalette).use({ useDefaultOptions: true });
  }

  onMenuModeChange(event: string) {
    this.layoutService.layoutConfig.update((prev) => ({ ...prev, menuMode: event }));
  }
}
