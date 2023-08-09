<script setup lang="ts">
import {computed, ref} from 'vue'
import {useOptionalValidations} from '../../composables/requiredOptional'

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

/**
 * Filter out non-numeric characters before updating the input.
 */
const handleInput = (e: Event): void => {
  const target = e.target as HTMLTextAreaElement
  if (hasNonNumberCharacter(target.value)) {
    target.value = target.value.replace(/[^0-9]/g, '');
  }

  emit('update:modelValue', target.value)
  emit('inputUpdate')
}

const hasNonNumberCharacter = (inputString) => {
  return /\D/.test(inputString);
}

defineExpose({
  focus
});
</script>

<template>
  <div class="flex-col">
    <label :for="fieldId">
      <slot class="h-8" name="label" />
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
