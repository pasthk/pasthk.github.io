import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightSidebarTopics from 'starlight-sidebar-topics';

import partytown from '@astrojs/partytown';

export default defineConfig({
    site: 'https://www.pasthk.com',
    build: {
        format: 'file',
    },
    integrations: [starlight({
        prerender: true,
        title: '香港新聞類編',
        description: '認識香港，從歷史開始。',
        lastUpdated: true,
        locales: {
            root: { label: '繁體中文', lang: 'zh-TW' },
        },
        customCss: ['./src/styles/custom.css'],
        components: {
            ThemeProvider: './src/components/ThemeProvider.astro',
            ThemeSelect: './src/components/ThemeSelect.astro',
        },
        plugins: [
            starlightSidebarTopics([
                {
                    label: '風俗',
                    link: 'festival/mid-autumn-festival',
                    items: [
                        {label: '節慶',
                            items: [
                                'festival/mid-autumn-festival',
                            ]
                        },
                        {label: '打醮',
                            items: [
                                'custom/cheung-chau-jiao-festival',
                            ]
                        },
                    ]
                },
                {
                    label: '古物及古蹟',
                    link: 'archaeology/hong-kong-archaeological-survey-1982-1985',
                    items: [
                        {label: '香港考古調查',
                            items: [
                                'archaeology/hong-kong-archaeological-survey-1982-1985',
                                'archaeology/hong-kong-archaeological-survey-1997-1998',
                            ]
                        },
                        {label: '新石器時代',
                            items: [
                                'archaeology/sha-ha-site',
                            ]
                        },
                        {label: '漢代',
                            items: [
                                'archaeology/lei-cheng-uk-han-tomb',
                            ]
                        },
                        {label: '清代',
                            items: [
                                'archaeology/kowloon-walled-city',
                                'archaeology/lung-tsun-stone-bridge',
                            ]
                        },
                        {label: '法定古蹟',
                            items: [
                                'historic-building/hau-ku-shek-ancestal-hall',
                                'historic-building/hau-mei-fung-ancestral-hall',
                            ]
                        }
                    ]
                },
            ]),
        ],
		}), partytown()],
});