<template>
  <div class="reference-box">
    <div class="reference-box-header">
      <span class="reference-box-label">參考信息</span>
      <button
        class="reference-box-copy-btn"
        :class="{ copied }"
        @click="copyReference"
        :aria-label="copied ? '已複製' : '複製資料引用'"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <template v-if="copied">
            <polyline points="20 6 9 17 4 12"></polyline>
          </template>
          <template v-else>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </template>
        </svg>
        <span class="reference-box-copy-text">{{ copied ? '已複製' : '複製' }}</span>
      </button>
    </div>
    <p class="reference-box-citation">{{ citation }}</p>
    <p v-if="parsedSlot.note" class="reference-box-note">{{ parsedSlot.note }}</p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, useSlots } from "vue";
import { usePageData, useRoute } from "vuepress/client";
import { splitCitation } from "../format.js";
import { absoluteUrl, SITE_NAME } from "../site.js";

const slots = useSlots();
const copied = ref(false);
let timer;

const page = usePageData();
const route = useRoute();

const pageUrl = computed(() => absoluteUrl(route?.path || "/"));

function extractText(node) {
  if (node === null || node === undefined || node === false) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object") {
    if (typeof node.children === "string") return node.children;
    if (Array.isArray(node.children)) return node.children.map(extractText).join("");
  }
  return "";
}

const rawSlotText = computed(() => {
  if (!slots.default) return "";
  return extractText(slots.default()).trim();
});

const parsedSlot = computed(() => splitCitation(rawSlotText.value));

const author = computed(() => {
  const raw = page.value?.frontmatter?.author;

  if (!raw) return "";

  return (Array.isArray(raw) ? raw : [raw])
    .map((item) => (typeof item === "string" ? item : item?.name))
    .filter((name) => typeof name === "string" && name.trim())
    .map((name) => name.trim())
    .join("、");
});

const citation = computed(() => {
  const fm = page.value?.frontmatter || {};
  const title = fm.title || page.value?.title || "";
  const url = pageUrl.value;

  let source = parsedSlot.value.source.trim();
  if (source && !/[。！？]$/.test(source)) {
    source += "。";
  }

  const parts = [];

  if (author.value) parts.push(author.value + "：");
  if (title) parts.push(title + "，");
  if (source) parts.push(source);
  parts.push(SITE_NAME + "，");
  if (url) parts.push(url);

  return parts.join("");
});

async function copyReference() {
  const text = citation.value.trim();

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    copied.value = true;
    timer = setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});
</script>

<style>
.reference-box {
  margin: 1.5rem 0;
  padding: 0.85rem 1rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 0.5rem;
  background: #fff;
}

.reference-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}

.reference-box-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--vp-c-text-mute);
  letter-spacing: 0.05em;
}

.reference-box-copy-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  padding: 0.2em 0.6em;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--vp-c-text-mute);
  background: transparent;
  border: 1px solid var(--vp-c-border);
  border-radius: 0.3rem;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.reference-box-copy-btn:hover,
.reference-box-copy-btn.copied {
  color: var(--vp-c-accent);
  border-color: var(--vp-c-accent);
}

.reference-box-copy-btn:focus-visible {
  outline: 2px solid var(--vp-c-accent);
  outline-offset: 2px;
}

.reference-box-copy-text {
  line-height: 1;
}

.reference-box .reference-box-citation {
  margin: 0;
  font-size: 1rem;
  line-height: 1.7;
  text-align: start;
  overflow-wrap: anywhere;
}

.reference-box .reference-box-note {
  margin: 0.5rem 0 0;
  font-size: 0.95rem;
  line-height: 1.7;
  text-align: start;
  color: var(--vp-c-text-mute);
}
</style>
