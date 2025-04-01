import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [starlight({
      title: '香江之源',
	  site: 'https://pasthk.github.io',
	  base: '/',
      sidebar: [
          {
              label: 'Guides',
              items: [
                  { label: 'Example Guide', slug: 'guides/example' },
              ],
          },
      ],
  }), sitemap()],

  vite: {
    plugins: [tailwindcss()],
  },
});