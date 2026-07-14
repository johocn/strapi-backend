import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const pageLoading = ref(false)
  const currentModule = ref('')

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setPageLoading(loading) {
    pageLoading.value = loading
  }

  function setCurrentModule(module) {
    currentModule.value = module
  }

  return {
    sidebarCollapsed,
    pageLoading,
    currentModule,
    toggleSidebar,
    setPageLoading,
    setCurrentModule
  }
})