"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export async function updateProfile(formData:FormData){
 const full_name=String(formData.get("full_name")||"").trim();
 const phone=String(formData.get("phone")||"").trim();
 const company=String(formData.get("company")||"").trim();
 const job_title=String(formData.get("job_title")||"").trim();
 if(full_name.length<2)redirect("/dashboard/profile?error=name");
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{error}=await supabase.auth.updateUser({data:{full_name,phone,company,job_title}});
 if(error)redirect("/dashboard/profile?error=save");
 redirect("/dashboard/profile?saved=1");
}
export async function updatePassword(formData:FormData){
 const password=String(formData.get("password")||"");const confirm=String(formData.get("confirm_password")||"");
 if(password.length<10)redirect("/dashboard/settings?error=weak_password");
 if(password!==confirm)redirect("/dashboard/settings?error=password_mismatch");
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const{error}=await supabase.auth.updateUser({password});
 if(error)redirect("/dashboard/settings?error=password_update");
 redirect("/dashboard/settings?saved=1");
}