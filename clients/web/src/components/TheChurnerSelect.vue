<script setup lang="ts">
// TODO: clean up the styling for this and the menu a bit

import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from "@headlessui/vue";
import butterchurnPresets from "butterchurn-presets";

defineProps(["modelValue", "randomize"]);
defineEmits(["update:modelValue", "update:randomize"]);

const presets = Object.keys(butterchurnPresets.getPresets());
</script>

<template>
  <div class="w-128">
    <Listbox :model-value="modelValue" @update:model-value="(v) => $emit('update:modelValue', v)">
      <div class="relative">
        <ListboxButton class="w-full h-8 bg-black border border-white p-1 text-left">
          <span class="block truncate">{{ modelValue }}</span>
        </ListboxButton>
        <ListboxOptions as="div">
          <ul
            class="absolute max-h-60 w-full overflow-auto bg-black border border-white p-1 bottom-19">
            <ListboxOption
              v-slot="{ active, selected }"
              v-for="preset in presets"
              :key="preset"
              :value="preset">
              <li
                :class="[
                  active ? 'bg-white text-black' : '',
                  'relative cursor-pointer select-none py-1 px-2',
                ]">
                <span :title="preset" :class="[selected ? 'font-italic' : '', 'block truncate']">{{ preset }}</span>
              </li>
            </ListboxOption>
          </ul>
          <button
            class="absolute h-8 w-full bg-black border border-white p-1 bottom-10"
            @click="() => $emit('update:randomize', !randomize)">
            {{ randomize ? "disable" : "enable" }} preset cycling
          </button>
        </ListboxOptions>
      </div>
    </Listbox>
  </div>
</template>
