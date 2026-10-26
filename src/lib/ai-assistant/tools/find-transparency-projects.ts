import { tool } from "ai";
import { desc } from "drizzle-orm";
import z from "zod";
import { db } from "@/db/config";
import { transparencyProjectsTable } from "@/db/schema";
import { formatFee } from "@/lib/court-reservations";
import { formatPhilippineDate } from "@/lib/utils";
import { TRANSPARENCY_CATEGORIES } from "@/schemas/transparency-schema";

// Enough for a barangay's projects without filling the model's context.
const MAX_PROJECTS = 50;
const MAX_DESCRIPTION_LENGTH = 200;

// Added up here, like calculateCourtFee's fee, because the model can't be trusted with arithmetic.
// Projects with no budget listed aren't counted, and the model is told how many there are.
function getBudgetTotal(projects: { budget: string | null }[]) {
  const budgets = projects.filter((project) => project.budget !== null).map((project) => Number(project.budget));
  return {
    total: formatFee(budgets.reduce((sum, budget) => sum + budget, 0)),
    projectCount: projects.length,
    ...(budgets.length < projects.length && { projectsWithNoBudget: projects.length - budgets.length }),
  };
}

// Like findBusinesses, this shows no button; the model answers from its result and then calls
// openTransparencyProjects. It lists every project and leaves the matching to the model, which can
// tell that "road project" means a project titled "Concreting of Purok 3 Pathway".
export const findTransparencyProjectsTool = tool({
  description:
    "List the barangay's projects posted on the Transparency page, newest first: each one's title, category, budget, " +
    "description and location, plus the total budget of all projects and of each category, added up for you. Use it " +
    "for questions about the barangay's projects and how much they cost. Match the user's question to the projects yourself.",
  inputSchema: z.object({}),
  execute: async () => {
    const projects = await db
      .select({
        id: transparencyProjectsTable.id,
        title: transparencyProjectsTable.title,
        category: transparencyProjectsTable.category,
        description: transparencyProjectsTable.description,
        budget: transparencyProjectsTable.budget,
        location: transparencyProjectsTable.location,
        createdAt: transparencyProjectsTable.createdAt,
      })
      .from(transparencyProjectsTable)
      .orderBy(desc(transparencyProjectsTable.createdAt), desc(transparencyProjectsTable.id));

    const instructions = [
      "Answer only from these projects, and mention only the ones that fit what the user asked. If none fit, say no project on the Transparency page matches.",
      "Never add up budgets yourself. For the total of all projects or of a whole category, use budgetTotals, and if it has projectsWithNoBudget, say that many projects have no budget listed and aren't counted. For any other group of projects, give each one's budget without a total.",
      "The amounts are the budgets the barangay listed for each project, so call them budgets, even when the user asks how much was spent.",
      "Projects have no status, so don't say one is ongoing, finished or planned unless its description says so. posted is when it was added to the Transparency page.",
      projects.length > MAX_PROJECTS &&
        `Only the ${MAX_PROJECTS} newest of ${projects.length} projects are listed, but budgetTotals covers them all. If the answer may be among the rest, mention that the Transparency page lists them all.`,
      "This result shows no button, so don't mention one unless you call openTransparencyProjects. If your answer is about specific projects (up to 3), call openTransparencyProjects with their ids next, so the user gets a button to open each one's full details.",
    ];

    return {
      // Over every project, including any past the listed ones.
      budgetTotals: {
        allProjects: getBudgetTotal(projects),
        // Only the categories that have projects.
        byCategory: Object.fromEntries(
          TRANSPARENCY_CATEGORIES.flatMap((category) => {
            const categoryProjects = projects.filter((project) => project.category === category);
            return categoryProjects.length > 0 ? [[category, getBudgetTotal(categoryProjects)]] : [];
          }),
        ),
      },
      projects: projects.slice(0, MAX_PROJECTS).map((project) => ({
        id: project.id,
        title: project.title,
        category: project.category,
        budget: project.budget === null ? "Not listed" : formatFee(Number(project.budget)),
        description:
          project.description.length > MAX_DESCRIPTION_LENGTH
            ? `${project.description.slice(0, MAX_DESCRIPTION_LENGTH)}…`
            : project.description,
        location: project.location?.address || "Not listed",
        posted: formatPhilippineDate(project.createdAt),
      })),
      buttonShown: false,
      instruction: instructions.filter(Boolean).join(" "),
    };
  },
});
