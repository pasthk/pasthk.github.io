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
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useSlots } from "vue";
import { usePageData, useRoute } from "vuepress/client";

const slots = useSlots();
const copied = ref(false);
let timer;

const page = usePageData();
const route = useRoute();
const pageUrl = ref("");

// SSR fallback: construct URL from hostname and route path
const hostname = "https://www.pasthk.com";
const ssrUrl = hostname + (route?.path || "");

onMounted(() => {
  pageUrl.value = window.location.href.split("#")[0].split("?")[0];
});

// Recursively extract plain text from VNodes (works in both SSR and client)
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

// Split slot text into source (without "文獻出處：" prefix) and optional "按：" note
const parsedSlot = computed(() => {
  let text = rawSlotText.value.replace(/^文獻出處：/, "").trim();

  if (!text) return { source: "", note: "" };

  // Note on its own line
  let m = text.match(/^([\s\S]*?)\r?\n\s*按：([\s\S]*)$/);
  if (m) {
    return { source: m[1].trim(), note: "按：" + m[2].trim() };
  }

  // Inline note right after the source
  m = text.match(/^([\s\S]*?[。）])\s*按：([\s\S]*)$/);
  if (m) {
    return { source: m[1].trim(), note: "按：" + m[2].trim() };
  }

  return { source: text, note: "" };
});

const noteText = computed(() => parsedSlot.value.note);

const citation = computed(() => {
  const fm = page.value?.frontmatter || {};
  const title = fm.title || page.value?.title || "";
  const siteName = "香港文獻類編";
  const url = pageUrl.value || ssrUrl;

  let source = parsedSlot.value.source.trim();
  if (source && !/[。！？]$/.test(source)) {
    source += "。";
  }

  // Format: 新聞標題，報刊名稱，年月日，頁碼。網站名稱，網址。
  const parts = [];

  if (title) parts.push(title + "，");
  if (source) parts.push(source);
  parts.push(siteName + "，");
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
  border: 1px solid var(--vp-c-border);
  border-radius: 0.5rem;
  background: #fff;
  overflow: hidden;
}

.reference-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--vp-c-border);
  background: #fff;
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
  font-size: 1rem;
  color: var(--vp-c-text-mute);
}

.reference-box-note p {
  margin: 0;
}
</style>
