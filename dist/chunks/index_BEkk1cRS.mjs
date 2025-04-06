import { l as createVNode, h as Fragment, _ as __astro_tag_component__ } from './astro/server_DHwBEDxI.mjs';
import { c as $$CardGrid, d as $$LinkCard } from './Code_Do7F9xqo.mjs';
import 'clsx';

const frontmatter = {
  "template": "splash",
  "title": "香港考古學綜述及文獻索引",
  "author": "吳健聰",
  "date": "2025-04-06T00:00:00.000Z"
};
function getHeadings() {
  return [{
    "depth": 2,
    "slug": "序",
    "text": "序"
  }, {
    "depth": 2,
    "slug": "第一章香港考古調查",
    "text": "第一章　香港考古調查"
  }, {
    "depth": 2,
    "slug": "附錄",
    "text": "附錄"
  }, {
    "depth": 2,
    "slug": "後記",
    "text": "後記"
  }];
}
function _createMdxContent(props) {
  const {Fragment: Fragment$1} = props.components || ({});
  if (!Fragment$1) _missingMdxReference("Fragment");
  return createVNode(Fragment, {
    children: [createVNode(Fragment$1, {
      "set:html": "<h2 id=\"序\">序</h2>\n<h2 id=\"第一章香港考古調查\">第一章　香港考古調查</h2>\n"
    }), createVNode($$CardGrid, {
      children: [createVNode($$LinkCard, {
        title: "早期調查（1920年代-1950年代）",
        href: "/chapter-one/early-survey-1920s-to-1950s.html"
      }), createVNode($$LinkCard, {
        title: "第一次全港調查（1982-1985）",
        href: "/chapter-one/hong-kong-archaeological-survey-1982-to-1985.html"
      }), createVNode($$LinkCard, {
        title: "第一次全港調查（1995-1997）",
        href: "/chapter-one/hong-kong-archaeological-survey-1995-to-1997.html"
      })]
    }), "\n", createVNode(Fragment$1, {
      "set:html": "<h2 id=\"附錄\">附錄</h2>\n<h2 id=\"後記\">後記</h2>"
    })]
  });
}
function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? createVNode(MDXLayout, {
    ...props,
    children: createVNode(_createMdxContent, {
      ...props
    })
  }) : _createMdxContent(props);
}
function _missingMdxReference(id, component) {
  throw new Error("Expected " + ("component" ) + " `" + id + "` to be defined: you likely forgot to import, pass, or provide it.");
}

const url = "src/content/docs/index.mdx";
const file = "/Volumes/Data/WebCode/pasthk.github.io/src/content/docs/index.mdx";
const Content = (props = {}) => MDXContent({
  ...props,
  components: { Fragment: Fragment, ...props.components, },
});
Content[Symbol.for('mdx-component')] = true;
Content[Symbol.for('astro.needsHeadRendering')] = !Boolean(frontmatter.layout);
Content.moduleId = "/Volumes/Data/WebCode/pasthk.github.io/src/content/docs/index.mdx";
__astro_tag_component__(Content, 'astro:jsx');

export { Content, Content as default, file, frontmatter, getHeadings, url };
