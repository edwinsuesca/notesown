import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Notfound } from './app/pages/notfound/notfound';
import { authGuard } from './app/guards/auth.guard';

export const appRoutes: Routes = [
    // Rutas de autenticación PRIMERO (sin layout)
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: 'notfound', component: Notfound },
    
    // Rutas con layout (protegidas)
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            { path: 'dashboard', loadComponent: () => import('./app/pages/dashboard/dashboard').then(m => m.Dashboard) },
            { path: 'settings', loadComponent: () => import('./app/pages/settings/settings').then(m => m.Settings) },
            { path: ':folderId', loadComponent: () => import('./app/pages/folder-view/folder-view').then(m => m.FolderView) },
            { path: ':folderId/:noteId', loadComponent: () => import('./app/pages/note-editor/note-editor').then(m => m.NoteEditor) }
        ]
    },
    
    // Catch-all al final
    { path: '**', redirectTo: '/notfound' }
];
