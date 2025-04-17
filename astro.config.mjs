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
			favicon: '/favicon.png',
			title: '考鏡香江源流',
			description: '香港考古文博綜述及文獻索引',
			titleDelimiter: '・',
			head: [
				{ tag: 'meta', attrs: { name: 'author', content: '吳健聰（北京大學考古文博學院博士研究生）', },},
				{ tag: 'meta', attrs: { name: 'description', content: '香港考古文博綜述及文獻索引', }, },
				{
					tag: 'script',
					attrs: {
					  src: 'https://www.googletagmanager.com/gtag/js?id={G-DEPPXHZVCM}',
					  async: true
					}
				  },
				  {
					tag: 'script',
					content: `
			window.dataLayer = window.dataLayer || [];
			function gtag(){dataLayer.push(arguments);}
			gtag('js', new Date());
			gtag('config', '{G-DEPPXHZVCM}');
			`
				},
				{
					"tag": "script",
					"attrs": {
						"async": true,
						"src": "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8975507583219124",
						"crossorigin": "anonymous"
					},
				},
			],
			customCss: [
				'/src/styles/custom.css',
			],
			components: {
			},
			locales: {
				root: {
					label: '中文（香港）',
					lang: 'zh-Hant',
				},
			},
			plugins: [
				starlightSidebarTopics([
					{
						label: '序',
						link: 'foreword.html',
						items: [
							'foreword',
							'preface',
						],
					},
					{
						label: '導論',
						link: 'introduction.html',
						items: [
							'introduction',
						],
					},					
					{
						label: '第一章　山海尋古',
						link: 'chapter-one/early-survey-1920s-to-1950s.html',
						items: [
							'chapter-one/early-survey-1920s-to-1950s', 
							'chapter-one/hong-kong-archaeological-survey-1982-to-1985', 
							'chapter-one/hong-kong-archaeological-survey-1997-to-1998', 
						],
					},
					{
						label: '第二章　黃沙之下',
						link: '/',
						items: [
						],
					},
					{
						label: '第三章　觀乎人文',
						link: 'chapter-three/archaeological-documentaries-on-cinema.html',
						items: [
							'chapter-three/archaeological-documentaries-on-cinema',
							'chapter-three/catalogues-and-books',
						],
					},
					{
						label: '第四章　嶺南一隅',
						link: '/',
						items: [
						],
					},
					{
						label: '考古文博文獻索引',
						link: 'bibliography/full-list.html',
						items: [
							'bibliography/full-list',
							{
								label: '區域調查',
								collapsed: true,
								items: [
									'bibliography/hong-kong-archaeological-survey-1st',
									'bibliography/hong-kong-archaeological-survey-2nd',
								],
							},
							{
								label: '南丫島',
								collapsed: true,
								items: [
									'bibliography/tai-wan-site',
									'bibliography/sham-wan-site',
								],
							},
							{
								label: '大嶼山',
								collapsed: true,
								items: [
									'bibliography/shek-pik-site',
								],
							},
							{
								label: '西貢',
								collapsed: true,
								items: [
									'bibliography/sha-ha-site',
									'bibliography/wong-tei-tung-site',
								],
							},
							{
								label: '九龍',
								collapsed: true,
								items: [
									'bibliography/lei-cheng-uk-han-tomb',
								],
							},
							{
								label: '屯門',
								collapsed: true,
								items: [
									'bibliography/so-kwun-wat-site',
								],
							},
							'bibliography/antiquities-and-monuments-ordinance', 
						],
					},
					{
						label: '後記',
						link: 'afterword.html',
						items: [
							'afterword',
						],
					},
				]),
			],
		}), 
		partytown({
			config: { 
				forward: [
					'dataLayer.push'
				],
			},
		},),
	],
});