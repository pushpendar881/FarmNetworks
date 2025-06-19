<script>
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';
	import { loading } from '$lib/stores/auth.js';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	let { children } = $props();
  </script>
  {@render children()}
  
  {#if $loading}
	<div class="min-h-screen flex items-center justify-center">
	  <LoadingSpinner size="lg" />
	</div>
  {/if}
  
  <Toast />