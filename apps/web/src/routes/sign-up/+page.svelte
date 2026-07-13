<script lang="ts">
	import { SignUp } from 'svelte-clerk';
</script>

<div class="mx-auto flex max-w-md justify-center py-12">
	<SignUp routing="hash" signInUrl="/sign-in" forceRedirectUrl="/dashboard" />
</div>
