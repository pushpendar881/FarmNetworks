<script>
    import { toasts, removeToast } from '$lib/stores/toast.js';
    import { slide } from 'svelte/transition';
  </script>
  
  <div class="fixed top-4 right-4 z-50 space-y-2">
    {#each $toasts as toast (toast.id)}
      <div
        transition:slide={{ duration: 300 }}
        class="bg-white rounded-lg shadow-lg border-l-4 p-4 max-w-sm {toast.type === 'error'
          ? 'border-red-500'
          : toast.type === 'success'
          ? 'border-green-500'
          : 'border-blue-500'}"
        role="alert"
      >
        <div class="flex justify-between items-start">
          <div>
            <h4 class="font-semibold text-gray-900">{toast.title}</h4>
            <p class="text-sm text-gray-600 mt-1">{toast.message}</p>
          </div>
          <button
            on:click={() => removeToast(toast.id)}
            class="text-gray-400 hover:text-gray-600 ml-4 text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>
    {/each}
  </div>