import { c as createComponent, r as renderComponent, b as renderTemplate } from '../chunks/astro/server_DHwBEDxI.mjs';
import 'kleur/colors';
import { $ as $$Common } from '../chunks/common_Czwv1U0x.mjs';
export { renderers } from '../renderers.mjs';

const prerender = true;
const $$404 = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "CommonPage", $$Common, {})}`;
}, "/Volumes/Data/WebCode/pasthk.github.io/node_modules/@astrojs/starlight/routes/static/404.astro", void 0);

const $$file = "/Volumes/Data/WebCode/pasthk.github.io/node_modules/@astrojs/starlight/routes/static/404.astro";
const $$url = undefined;

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$404,
	file: $$file,
	prerender,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
