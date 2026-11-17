import { redirect } from "next/navigation";

export default function WrongNotebookRedirect() {
  redirect("/user/wrong-notebook");
}
