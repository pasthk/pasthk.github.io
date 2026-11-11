<script setup>
import { computed } from "vue";
import { useMetaLocale } from "@theme-hope/composables/info/useMetaLocale";
import { usePure } from "@theme-hope/composables/usePure";
import { useFrontmatter } from "vuepress/client";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  readingTime: {
    type: Object,
    default: null,
  },
  readingTimeLocale: {
    type: Object,
    default: null,
  },
});

const frontmatter = useFrontmatter();
const metaLocale = useMetaLocale();
const isPure = usePure();

const readingTimeMeta = computed(() => {
  if (!props.readingTime) return null;

  const { minutes } = props.readingTime;
  return minutes < 1 ? "PT1M" : `PT${Math.round(minutes)}M`;
});

const transcriptionStatus = computed(() => {
  const { excerpted, proofread } = frontmatter.value;
  const hasExcerpted = typeof excerpted === "boolean";
  const hasProofread = typeof proofread === "boolean";

  if (!hasExcerpted && !hasProofread) return null;

  return {
    hasExcerpted,
    hasProofread,
    excerpted: excerpted === true,
    proofread: proofread === true,
  };
});
</script>

<template>
  <span
    v-if="readingTimeLocale?.time"
    class="page-reading-time-info"
    :aria-label="`${metaLocale.readingTime}${isPure ? '' : '⌛'}`"
    v-bind="isPure ? {} : { 'data-balloon-pos': 'up' }"
  >
    <span>{{ readingTimeLocale.time }}</span>
    <meta v-if="readingTimeMeta" property="timeRequired" :content="readingTimeMeta" />
    <span
      v-if="transcriptionStatus"
      class="page-transcription-status"
      role="group"
      aria-label="轉錄狀態"
    >
      <label v-if="transcriptionStatus.hasExcerpted">
        <input
          type="checkbox"
          :checked="transcriptionStatus.excerpted"
          :aria-label="`摘錄：${transcriptionStatus.excerpted ? '是' : '否'}`"
          disabled
        >
        摘錄
      </label>
      <label v-if="transcriptionStatus.hasProofread">
        <input
          type="checkbox"
          :checked="transcriptionStatus.proofread"
          :aria-label="`校對：${transcriptionStatus.proofread ? '已校對' : '未校對'}`"
          disabled
        >
        校對
      </label>
    </span>
  </span>
</template>
