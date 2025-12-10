const fs = require('fs');

// --- RUTAS DE LOS ARCHIVOS ---
const targetPathProd = './src/environments/environment.prod.ts';
const targetPathDev = './src/environments/environment.ts';
const dirPath = './src/environments';

if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

const envConfigFileProd = `export const environment = {
  production: true,
  supabase: {
    url: '${process.env.SUPABASE_URL}',
    anonKey: '${process.env.SUPABASE_KEY}'
  }
};
`;

const envConfigFileDev = `export const environment = {
  production: false,
  supabase: {
    url: '${process.env.SUPABASE_URL || 'placeholder_dev_url'}', 
    anonKey: '${process.env.SUPABASE_KEY || 'placeholder_dev_key'}'
  }
};
`;

// --- ESCRITURA DE ARCHIVOS ---

// Escribir el archivo de producción
fs.writeFileSync(targetPathProd, envConfigFileProd, (err) => {
  if (err) throw console.error(err);
});

// Escribir el archivo base (environment.ts)
fs.writeFileSync(targetPathDev, envConfigFileDev, (err) => {
  if (err) throw console.error(err);
});