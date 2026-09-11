// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
    site: 'https://www.pasthk.com/',
	integrations: [
		starlight({
			title: '香港新聞類編',
			sidebar: [
				{
					label: 'Reference',
					items: [{ autogenerate: { directory: 'archaeology' } }],
				},
			],
		}),
	],
});
