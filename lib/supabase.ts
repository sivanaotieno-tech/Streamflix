import {createClient} from "@supabase/supabase-js";

const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_ANON_KEY;

export const supabaseConfigured=Boolean(url&&key);
export const supabase=supabaseConfigured
  ? createClient(url!,key!,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
      global:{headers:{"X-Client-Info":"streamivio-catalog"}}
    })
  : null;
