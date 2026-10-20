import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
const root = fileURLToPath(new URL('../../apps/web', import.meta.url));
export default defineConfig({ root, plugins:[react()], css:{postcss:{plugins:[tailwindcss({content:[root+'/design-lab.html',root+'/src/**/*.{js,jsx,ts,tsx}']}),autoprefixer()]}}, build:{ outDir:'../../.local/tp31/dist',emptyOutDir:true,rollupOptions:{input:root+'/design-lab.html'} }, server:{host:'127.0.0.1',port:5193,strictPort:true},preview:{host:'127.0.0.1',port:5193,strictPort:true} });
