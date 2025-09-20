<script>
  import { toasts, removeToast } from '$lib/stores/toast.js';
  import { fly } from 'svelte/transition';
  
  const getToastClass = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };
</script>

{#if $toasts.length > 0}
  <div class="fixed top-4 right-4 z-50 space-y-2">
    {#each $toasts as toast (toast.id)}
      <div
        class="flex items-center p-4 rounded-lg border shadow-lg max-w-sm {getToastClass(toast.type)}"
        in:fly={{ x: 300, duration: 300 }}
        out:fly={{ x: 300, duration: 300 }}
      >
        <div class="flex-1">
          <p class="text-sm font-medium">{toast.message}</p>
        </div>
        <button
          class="ml-4 text-gray-400 hover:text-gray-600"
          on:click={() => removeToast(toast.id)}
          aria-label="Close"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    {/each}
  </div>
{/if}