<script setup lang="ts">
import ReleaseInformation from "@renderer/components/home/ReleaseInformation.vue";
import { latest_release, all_releases } from "../../assets/strings/releases";
</script>

<template>
  <template v-for="release in all_releases">
    <ReleaseInformation class="my-2"
                        :latest="release.version === latest_release"
                        :version="release.version"
                        :date="release.date"
                        :features="release.features"
                        :performance="release.performance"
                        :fixes="release.fixes"
                        :codes="release.codes"/>
  </template>
</template>
