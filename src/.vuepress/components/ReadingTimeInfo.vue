<script setup>
import { computed } from "vue";
import { TimerIcon } from "@theme-hope/components/info/icons";
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
  if (typeof excerpted !== "boolean" || typeof proofread !== "boolean") {
    return null;
  }

  return { excerpted, proofread };
});
</script>

<template>
  <span
    v-if="readingTimeLocale?.time"
    class="page-reading-time-info"
    :aria-label="`${metaLocale.readingTime}${isPure ? '' : '⌛'}`"
    v-bind="isPure ? {} : { 'data-balloon-pos': 'up' }"
  >
    <TimerIcon />
    <span>{{ readingTimeLocale.time }}</span>
    <meta property="timeRequired" :content="readingTimeMeta || ''" />
    <span v-if="transcriptionStatus" class="page-transcription-status">
      <label>
        <input type="checkbox" :checked="transcriptionStatus.excerpted" disabled>
        摘錄
      </label>
      <label>
        <input type="checkbox" :checked="transcriptionStatus.proofread" disabled>
        初校
      </label>
    </span>
  </span>
</template>
