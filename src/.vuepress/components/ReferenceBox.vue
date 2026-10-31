<template>
  <div class="reference-box">
    <div class="reference-box-header">
      <span class="reference-box-label">網頁信息</span>
      <button
        class="reference-box-copy-btn"
        :class="{ copied }"
        @click="copyReference"
        :aria-label="copied ? '已複製' : '複製資料引用'"
      >
        <svg
          v-if="!copied"
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
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <svg
          v-else
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
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span class="reference-box-copy-text">{{ copied ? '已複製' : '複製' }}</span>
      </button>
    </div>
    <div class="reference-box-content">
      <p class="reference-box-citation">{{ citation }}</p>
      <div v-if="noteText" class="reference-box-note">
        <p>{{ noteText }}</p>
      </div>
      <!-- Hidden slot container: renders slot for text extraction -->
      <div ref="slotRef" class="reference-box-slot-hidden">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { usePageData, useRoute } from "vuepress/client";

const copied = ref(false);
const slotRef = ref();
let timer;

const page = usePageData();
const route = useRoute();
const pageUrl = ref("");

// SSR fallback: construct URL from hostname and route path
const hostname = "https://www.pasthk.com";
const ssrUrl = hostname + (route?.path || "");

// Parsed slot data — populated onMounted
const sourceText = ref("");
const noteText = ref("");

onMounted(() => {
  pageUrl.value = window.location.href.split("#")[0].split("?")[0];

  // Extract slot text from the hidden container
  if (slotRef.value) {
    const raw = slotRef.value.textContent.trim();
    parseSlotText(raw);
  }
});

function parseSlotText(raw) {
  if (!raw) return;

  // Remove "文獻出處：" prefix
  let text = raw.replace(/^文獻出處：/, "").trim();

  // Split source and note ("按：" on a new line)
  const noteIdx = text.indexOf("\n按：");
  if (noteIdx !== -1) {
    sourceText.value = text.substring(0, noteIdx).trim();
    noteText.value = text.substring(noteIdx + 1).trim();
  } else {
    // Also handle inline "按：" (without newline)
    const inlineMatch = text.match(/^(.*?)。按：(.*?)$/s);
    if (inlineMatch) {
      sourceText.value = inlineMatch[1].trim() + "。";
      noteText.value = "按：" + inlineMatch[2].trim();
    } else {
      sourceText.value = text;
    }
  }
}

const citation = computed(() => {
  const fm = page.value?.frontmatter || {};
  const title = fm.title || page.value?.title || "";
  const siteName = "香港文獻類編";
  const url = pageUrl.value || ssrUrl;
  const source = sourceText.value;

  // Format: 標題，文獻出處內容。網站名稱，網址
  let parts = [];

  if (title) {
    parts.push(title + "，");
  }

  if (source) {
    parts.push(source);
  }

  parts.push(siteName + "，");

  if (url) {
    parts.push(url);
  }

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
  border: 1px solid var(--vp-c-border);
  border-radius: 0.5rem;
  background: var(--vp-c-bg-alt);
  overflow: hidden;
}

.reference-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg);
}

.reference-box-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vp-c-text-mute);
  letter-spacing: 0.05em;
}

.reference-box-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  padding: 0.2em 0.6em;
  font-size: 0.8rem;
  color: var(--vp-c-text-mute);
  background: transparent;
  border: 1px solid var(--vp-c-border);
  border-radius: 0.3rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reference-box-copy-btn:hover {
  color: var(--vp-c-accent);
  border-color: var(--vp-c-accent);
}

.reference-box-copy-btn.copied {
  color: var(--vp-c-accent);
  border-color: var(--vp-c-accent);
}

.reference-box-copy-text {
  line-height: 1;
}

.reference-box-content {
  padding: 0.75rem 1rem;
  font-size: 1rem;
  line-height: 1.7;
}

.reference-box-content p {
  margin: 0;
}

.reference-box-citation {
  word-break: break-all;
}

.reference-box-note {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--vp-c-border);
  font-size: 0.9rem;
  color: var(--vp-c-text-mute);
}

.reference-box-note p {
  margin: 0;
}

.reference-box-slot-hidden {
  display: none;
}
</style>
