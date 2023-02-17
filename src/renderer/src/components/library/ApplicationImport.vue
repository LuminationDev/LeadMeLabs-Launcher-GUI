<script setup lang="ts">
import { useLibraryStore } from '../../store/libraryStore'
import * as CONSTANT from "../../assets/constants/_application";
import { Application } from "../../models";
import { ref } from "vue";

const libraryStore = useLibraryStore()
const fileInput = ref<HTMLInputElement | null>(null)

const importApplication = (): void => {
  //Remove the extension from the name
  let name = fileInput.value.files[0]["name"].split(".")[0];
  let altPath = fileInput.value.files[0]["path"];
  //Make sure a file is selected and that it is an executable
  if(altPath != null && altPath.endsWith(".exe")) {
    //@ts-ignore
    api.ipcRenderer.send(CONSTANT.APPLICATION_IMPORT, {
      name,
      altPath
    });
  }

  //Reset the file input
  fileInput.value.value = "";
}

// @ts-ignore
api.ipcRenderer.on('application_imported', (event, info) => {
  if(info.action === "import") {
    let application: Application = new Application(
        info.id,
        info.name,
        '',
        info.altPath,
        CONSTANT.STATUS_INSTALLED
    );

    //Add the application to the library list
    libraryStore.addImportApplication(application)
  } else if (info.action === "removed") {
    libraryStore.removeImportedApplication(info.name);
  }
});
</script>

<template>
  <label
      for="files"
      class="w-32 h-8 mb-4 cursor-pointer rounded-lg bg-blue-400 flex items-center justify-center hover:bg-blue-200"
  >
    <input class="hidden" id="files" ref="fileInput" type="file" @change="importApplication">
    Import
  </label>
</template>
