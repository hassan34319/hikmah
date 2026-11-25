import Link from "next/link";
import { Empty, LmsHead, LmsShell } from "@/components/lms/LmsShell";
import { requireTeacher } from "@/lib/lms-server";
import { QuizSettings } from "../../Editors";

export const dynamic = "force-dynamic";

export default async function NewQuiz() {
  const { name, isAdmin, scopes } = await requireTeacher();
  return (
    <LmsShell mode="teach" current="/teach/quizzes" name={name} admin={isAdmin} other>
      <LmsHead title="New quiz" crumb={<Link href="/teach/quizzes">Quizzes</Link>} sub="Set the basics first. Next you add questions, then publish when it's ready. Students don't see drafts." />
      {scopes.length ? <section className="ad-card lm-editor"><QuizSettings scopes={scopes} draft={{ sections: [], title: "", instructions: "", opens: "", closes: "", limit: "", shuffle: false, showAnswers: true }} /></section> : <Empty title="No classes yet">An admin needs to assign you to a subject first.</Empty>}
    </LmsShell>
  );
}
