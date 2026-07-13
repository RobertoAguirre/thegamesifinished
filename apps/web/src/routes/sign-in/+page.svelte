<script lang="ts">
	import { SignIn } from 'svelte-clerk';
</script>

<div class="mx-auto flex max-w-md justify-center py-12">
	<SignIn routing="hash" signUpUrl="/sign-up" forceRedirectUrl="/dashboard" />
</div>
