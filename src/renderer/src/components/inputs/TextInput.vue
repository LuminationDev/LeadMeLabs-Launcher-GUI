<script setup lang="ts">
import { computed, ref } from 'vue'
import { useOptionalValidations } from '../../composables/requiredOptional'
const { testIfWouldPassRequired } = useOptionalValidations()
const props = defineProps({
  v$: {
    type: Object,
    required: true
  },
  modelValue: {
    type: String,
    required: true
  },
  fieldId: {
    type: String,
    required: true
  },
  placeholder: {
    type: String,
    required: false
  },
  password: {
    type: Boolean,
    required: false,
    default: false
  }
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string)
  (e: 'inputUpdate')
}>();

const wouldPass = computed(() => {
  return testIfWouldPassRequired(props.modelValue)
});

const inputRef = ref<InstanceType<typeof HTMLButtonElement> | null>(null)
const focus = (): void => {
  if (inputRef.value !== null) {
    inputRef.value.focus()
  }
}

const handleInput = (e: Event): void => {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
  emit('inputUpdate')
}
defineExpose({
  focus
})
</script>

<template>
  <div class="flex-col">
    <label class="h-8" :for="fieldId">
      <slot name="label" />
    </label>
    <input
        :id="fieldId"
        ref="inputRef"
        :value="modelValue"
        :placeholder="placeholder"
        :type="password ? 'password' : 'text'"
        class="textfield-primary"
        :class="{
                'border-orange-500':
                    v$ && v$.requiredOptional && !wouldPass && !v$.$error && v$.$dirty,
                'border-red-500': v$ && v$.$error
            }"
        @input="handleInput"
    />

    <div v-if="v$ && v$.$error" class="flex flex-col">
      <div
          v-for="(error, index) in v$.$errors"
          :key="index"
          class="flex flex-row items-center text-red-500 mt-2"
      >
        <span class="text-xs">{{ error.$message }}</span>
      </div>
    </div>
  </div>
</template>
