import { watchDebounced } from '@vueuse/core'
import { memoize } from 'lodash'
import { computed, ref, watch } from 'vue'

import {
  AlgoliaNodePack,
  SearchAttribute,
  useAlgoliaSearchService
} from '@/services/algoliaSearchService'
import { PackField } from '@/types/comfyManagerTypes'

const SEARCH_DEBOUNCE_TIME = 16
const DEFAULT_PAGE_SIZE = 64

/**
 * Composable for managing UI state of Comfy Node Registry search.
 */
export function useRegistrySearch() {
  const isLoading = ref(false)
  const sortField = ref<PackField>('downloads')
  const searchMode = ref<'nodes' | 'packs'>('packs')
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  const pageNumber = ref(0)
  const searchQuery = ref('')
  const results = ref<AlgoliaNodePack[]>([])

  const searchAttributes = computed<SearchAttribute[]>(() =>
    searchMode.value === 'nodes' ? ['comfy_nodes'] : ['name', 'description']
  )

  const resultsAsRegistryPacks = computed(() =>
    results.value ? results.value.map(algoliaToRegistry) : []
  )
  const resultsAsNodes = computed(() =>
    results.value
      ? results.value.reduce(
          (acc, hit) => acc.concat(hit.comfy_nodes),
          [] as string[]
        )
      : []
  )

  const { searchPacks, toRegistryPack } = useAlgoliaSearchService()

  const algoliaToRegistry = memoize(
    toRegistryPack,
    (algoliaNode: AlgoliaNodePack) => algoliaNode.id
  )

  const onQueryChange = async () => {
    isLoading.value = true
    results.value = await searchPacks(searchQuery.value, {
      pageSize: pageSize.value,
      pageNumber: pageNumber.value,
      restrictSearchableAttributes: searchAttributes.value
    })
    isLoading.value = false
  }

  watch([pageNumber, sortField, searchMode], onQueryChange, {
    immediate: true
  })
  watchDebounced(searchQuery, onQueryChange, {
    debounce: SEARCH_DEBOUNCE_TIME
  })

  return {
    isLoading,
    pageNumber,
    pageSize,
    sortField,
    searchMode,
    searchQuery,
    searchResults: resultsAsRegistryPacks,
    nodeSearchResults: resultsAsNodes
  }
}
