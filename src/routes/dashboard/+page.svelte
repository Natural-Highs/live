<script>
  import { auth } from "../../lib/firebase/firebase.app";

  const user = auth.currentUser;

  console.log(user);
</script>

<div>Hello {user?.uid}</div>
