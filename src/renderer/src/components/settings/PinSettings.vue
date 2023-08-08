<script setup lang="ts">
import { required } from "@vuelidate/validators";
import { reactive, ref } from "vue";
import useVuelidate from "@vuelidate/core";
import NumberInput from "@renderer/components/inputs/NumberInput.vue";
import GenericButton from "@renderer/components/buttons/GenericButton.vue";
import {useLibraryStore} from "../../store/libraryStore";

const libraryStore = useLibraryStore();
const emit = defineEmits();
const rules = {
  pin: { required },
  confirmPin: { required }
}

const state = reactive({
  pin: '',
  confirmPin: ''
});

const v$ = useVuelidate(rules, state);
const error = ref();

const verifyPin = () => {
  if(state.pin !== state.confirmPin) {
    error.value = "Inputs do not match.";
    return;
  }

  libraryStore.pin = state.confirmPin;
  emit('config-change', {key: 'pin', value: state.confirmPin});
}
</script>

<template>
  <div class="flex flex-col">
    <div class="font-bold mb-2">PIN</div>

    <NumberInput
        v-model="v$.pin.$model"
        :v$="v$.pin"
        field-id="text"
        class="my-2 w-64"
        placeholder="Enter pin"
    />

    <NumberInput
        v-model="v$.confirmPin.$model"
        :v$="v$.confirmPin"
        field-id="text"
        class="w-64"
        placeholder="Confirm pin"
    />

    <div class="flex w-64 justify-end">
      <GenericButton
        class="w-32 h-8 mt-2 mr-1"
        :type="'primary'"
        :callback="verifyPin"
        :spinnerColor="'#000000'"
      >Set</GenericButton>
    </div>

    <div class="flex flex-row items-center text-red-500">
      <span class="text-xs">{{ error }}</span>
    </div>

    <hr class="my-4">
  </div>
</template>
