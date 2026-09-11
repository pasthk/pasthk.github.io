// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
    site: 'https://www.pasthk.com/',
    build: {
        format: 'file',
    },
	integrations: [
		starlight({
			title: '香港新聞類編',
			defaultLocale: 'root',
			locales: {
				root: { label: '繁體中文', lang: 'zh-TW' },
			},
			sidebar: [
				{
					label: 'Reference',
					items: [{ autogenerate: { directory: 'archaeology' } }],
				},
			],
		}),
	],
});
