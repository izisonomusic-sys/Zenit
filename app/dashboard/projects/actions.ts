"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createTrackedProject(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const platform = String(formData.get("platform") || "website");
  const websiteUrl = String(formData.get("website_url") || "").trim();
  if (name.length < 2) redirect("/dashboard/projects?error=invalid");
  const allowed = ["website","web_app","mobile_app","ecommerce","saas","other"];
  if (!allowed.includes(platform)) redirect("/dashboard/projects?error=platform");
  if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) redirect("/dashboard/projects?error=url");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: memberships } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1);
  const workspaceId = memberships?.[0]?.workspace_id;
  if (!workspaceId) redirect("/dashboard");
  const { error } = await supabase.from("tracked_projects").insert({
    workspace_id: workspaceId, name, platform, website_url: websiteUrl || null, created_by: user.id
  });
  if (error) redirect("/dashboard/projects?error=create");
  redirect("/dashboard/projects?created=1");
}
