import { Injectable, effect, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { $t, updatePreset, updateSurfacePalette } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara';
import Nora from '@primeuix/themes/nora';
import { SURFACE_PALETTES } from '../../shared/constants/surface-palettes';

export interface layoutConfig {
  preset?: string;
  primary?: string;
  surface?: string | undefined | null;
  darkTheme?: boolean;
  menuMode?: string;
  followSystemTheme?: boolean;
}

interface LayoutState {
  staticMenuDesktopInactive?: boolean;
  overlayMenuActive?: boolean;
  configSidebarVisible?: boolean;
  staticMenuMobileActive?: boolean;
  menuHoverActive?: boolean;
}

interface MenuChangeEvent {
  key: string;
  routeEvent?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  _config: layoutConfig = {
    preset: 'Aura',
    primary: 'cyan',
    surface: null,
    darkTheme: false,
    menuMode: 'static',
    followSystemTheme: false
  };

  _state: LayoutState = {
    staticMenuDesktopInactive: false,
    overlayMenuActive: false,
    configSidebarVisible: false,
    staticMenuMobileActive: false,
    menuHoverActive: false
  };

  layoutConfig = signal<layoutConfig>(this._config);

  layoutState = signal<LayoutState>(this._state);

  private configUpdate = new Subject<layoutConfig>();

  private overlayOpen = new Subject<any>();

  private menuSource = new Subject<MenuChangeEvent>();

  private resetSource = new Subject();

  menuSource$ = this.menuSource.asObservable();

  resetSource$ = this.resetSource.asObservable();

  configUpdate$ = this.configUpdate.asObservable();

  overlayOpen$ = this.overlayOpen.asObservable();

  theme = computed(() => (this.layoutConfig()?.darkTheme ? 'light' : 'dark'));

  isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().staticMenuMobileActive);

  isDarkTheme = computed(() => this.layoutConfig().darkTheme);

  getPrimary = computed(() => this.layoutConfig().primary);

  getSurface = computed(() => this.layoutConfig().surface);

  isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');

  transitionComplete = signal<boolean>(false);

  private initialized = false;
  private systemThemeMediaQuery?: MediaQueryList;

  constructor() {
    // Cargar configuración guardada
    this.loadConfig();

    // Inicializar tema de PrimeNG
    this.initializeTheme();

    effect(() => {
      const config = this.layoutConfig();
      if (config) {
        this.onConfigUpdate();
        this.saveConfig(config);
      }
    });

    effect(() => {
      const config = this.layoutConfig();

      if (!this.initialized || !config) {
        this.initialized = true;
        return;
      }

      this.handleDarkModeTransition(config);
    });

    // Inicializar listener del tema del sistema
    this.initSystemThemeListener();
  }

  private loadConfig(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedConfig = localStorage.getItem('layoutConfig');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          // Si está configurado para seguir el sistema, aplicar el tema actual del sistema
          if (config.followSystemTheme) {
            config.darkTheme = this.getSystemTheme();
          }
          this.layoutConfig.set(config);
          this._config = config;

          // Aplicar el tema inmediatamente al DOM
          this.toggleDarkMode(config);
        } catch (e) {
          console.error('Error loading layout config:', e);
        }
      } else {
        // Si no hay configuración guardada, aplicar el tema por defecto
        this.toggleDarkMode(this._config);
      }
    }
  }

  private initializeTheme(): void {
    if (typeof window === 'undefined') return;

    const config = this.layoutConfig();
    const presets = { Aura, Lara, Nora };
    const preset = presets[config.preset as keyof typeof presets] || Aura;

    try {
      // Obtener la paleta del preset
      const presetPalette = preset.primitive;

      // Obtener el color primario guardado o usar cyan por defecto
      const primaryColorName = config.primary || 'cyan';
      const primaryPalette = (presetPalette as any)?.[primaryColorName];

      // Crear extensión del preset con el color primario
      const presetExt = {
        semantic: {
          primary: primaryPalette || presetPalette?.['cyan'],
          colorScheme: {
            light: {
              primary: {
                color: '{primary.500}',
                contrastColor: '#ffffff',
                hoverColor: '{primary.600}',
                activeColor: '{primary.700}'
              }
            },
            dark: {
              primary: {
                color: '{primary.400}',
                contrastColor: '{surface.900}',
                hoverColor: '{primary.300}',
                activeColor: '{primary.200}'
              }
            }
          }
        }
      };

      // Obtener la paleta de superficie guardada
      const surfacePalette = this.getSurfacePalette(config.surface);

      // Aplicar preset con colores personalizados y paleta de superficie
      const themeBuilder = $t().preset(preset).preset(presetExt);
      if (surfacePalette) {
        themeBuilder.surfacePalette(surfacePalette);
      }
      themeBuilder.use({ useDefaultOptions: true });
    } catch (e) {
      console.error('Error initializing theme:', e);
    }
  }

  private getSurfacePalette(surfaceName: string | null | undefined): any {
    if (!surfaceName) return null;

    const surface = SURFACE_PALETTES.find(s => s.name === surfaceName);
    return surface?.palette || null;
  }

  private saveConfig(config: layoutConfig): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('layoutConfig', JSON.stringify(config));
      } catch (e) {
        console.error('Error saving layout config:', e);
      }
    }
  }

  private initSystemThemeListener(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      // Listener para cambios en el tema del sistema
      this.systemThemeMediaQuery.addEventListener('change', (e) => {
        if (this.layoutConfig().followSystemTheme) {
          this.layoutConfig.update((state) => ({ ...state, darkTheme: e.matches }));
        }
      });

      // Aplicar tema del sistema si está activado (ya se aplicó en loadConfig)
      // Solo necesitamos asegurarnos de que el listener esté activo
    }
  }

  getSystemTheme(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }

  private handleDarkModeTransition(config: layoutConfig): void {
    if ((document as any).startViewTransition) {
      this.startViewTransition(config);
    } else {
      this.toggleDarkMode(config);
      this.onTransitionEnd();
    }
  }

  private startViewTransition(config: layoutConfig): void {
    const transition = (document as any).startViewTransition(() => {
      this.toggleDarkMode(config);
    });

    transition.ready
      .then(() => {
        this.onTransitionEnd();
      })
      .catch(() => { });
  }

  toggleDarkMode(config?: layoutConfig): void {
    const _config = config || this.layoutConfig();
    if (_config.darkTheme) {
      document.documentElement.classList.add('app-dark');
    } else {
      document.documentElement.classList.remove('app-dark');
    }
  }

  private onTransitionEnd() {
    this.transitionComplete.set(true);
    setTimeout(() => {
      this.transitionComplete.set(false);
    });
  }

  onMenuToggle() {
    if (this.isOverlay()) {
      this.layoutState.update((prev) => ({ ...prev, overlayMenuActive: !this.layoutState().overlayMenuActive }));

      if (this.layoutState().overlayMenuActive) {
        this.overlayOpen.next(null);
      }
    }

    if (this.isDesktop()) {
      this.layoutState.update((prev) => ({ ...prev, staticMenuDesktopInactive: !this.layoutState().staticMenuDesktopInactive }));
    } else {
      this.layoutState.update((prev) => ({ ...prev, staticMenuMobileActive: !this.layoutState().staticMenuMobileActive }));

      if (this.layoutState().staticMenuMobileActive) {
        this.overlayOpen.next(null);
      }
    }
  }

  isDesktop() {
    return window.innerWidth > 991;
  }

  isMobile() {
    return !this.isDesktop();
  }

  onConfigUpdate() {
    this._config = { ...this.layoutConfig() };
    this.configUpdate.next(this.layoutConfig());
  }

  onMenuStateChange(event: MenuChangeEvent) {
    this.menuSource.next(event);
  }

  reset() {
    this.resetSource.next(true);
  }
}
