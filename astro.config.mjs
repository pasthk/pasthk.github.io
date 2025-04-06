import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightSidebarTopics from 'starlight-sidebar-topics'
import partytown from '@astrojs/partytown';

export default defineConfig({
	site: 'https://www.pasthk.com',
	base: '/',
	build: {
		format: 'file',
	},
	compressHTML: true,
	integrations: [
		starlight({
			customCss: [
				'./src/styles/custom.css',
			],
			title: '考鏡香江源流',
			description: '香港考古學文獻索引及綜述',
			locales: {
				root: {
					label: '中文（香港）',
					lang: 'zh-HK',
				},
			},
			plugins: [
				starlightSidebarTopics([
					{
						label: '序',
						link: '/foreword.html',
						items: [
							'foreword',
						],
					},
					{
						label: '第一章　香港考古調查',
						link: '/chapter-one/early-survey-1920s-to-1950s.html',
						items: [
							'chapter-one/early-survey-1920s-to-1950s', 
							'chapter-one/hong-kong-archaeological-survey-1982-to-1985', 
							'chapter-one/hong-kong-archaeological-survey-1995-to-1997', 
						],
					},
					{
						label: '第二章　香港考古發掘',
						link: '/chapter-two/tai-wan-site-lamma-island.html',
						items: [
							'chapter-two/tai-wan-site-lamma-island', 
						],
					},
					{
						label: '後記',
						link: '/afterword.html',
						items: [
							'afterword',
						],
					},
				]),
			],
		}), 
		partytown(

		),
	],
});