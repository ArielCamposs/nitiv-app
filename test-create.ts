import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bixxctmwnolnmtijzngu.supabase.co"
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // I need to get this from env

async function run() {
    require('dotenv').config({ path: '.env.local' });
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const res = await sb.auth.admin.createUser({
        email: 'admin@colegio.cl',
        password: 'secretpassword123'
    });
    console.log("Error object:", JSON.stringify(res.error, null, 2));
    console.log("Error message:", res.error?.message);
    console.log("Error code:", res.error?.code);
}
run();
