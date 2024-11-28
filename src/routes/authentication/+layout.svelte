<script>
  import { authStore } from "../../store/store";
  import { goto } from "$app/navigation";

  $: if (!$authStore.loading && $authStore.user) {
    goto("/dashboard");
  }
</script>

<slot />
