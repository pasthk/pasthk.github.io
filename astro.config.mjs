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
			title: '香江之源',
			description: '考鏡香江源流——香港考古學文獻索引及綜述。',
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
						link: '/chapter-one/hong-kong-archaeological-survey-1982-to-1985.html',
						items: [
							'chapter-one/hong-kong-archaeological-survey-1982-to-1985', 
							'chapter-one/hong-kong-archaeological-survey-1995-to-1997', 
						],
					},
					{
						label: '跋',
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