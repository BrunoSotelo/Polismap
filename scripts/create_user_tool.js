
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// CONFIGURATION
// You must set these or pass them as env vars
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
    console.error('\x1b[31m%s\x1b[0m', 'ERROR: Missing SUPABASE_SERVICE_ROLE_KEY');
    console.log('You must export access to your Supabase Service Role Key to run this script.');
    console.log('Example:');
    console.log('  $env:SUPABASE_SERVICE_ROLE_KEY="eyJhbG..."');
    console.log('  node scripts/create_user_tool.js');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\x1b[36m%s\x1b[0m', '=== Supabase User Creation Tool ===');

rl.question('Email: ', (email) => {
    rl.question('Password (min 6 chars): ', async (password) => {
        rl.question('Is Admin? (y/n): ', async (isAdminAnswer) => {

            try {
                const isAdmin = isAdminAnswer.toLowerCase() === 'y';
                console.log(`\nCreating user ${email}...`);

                // 1. Create Auth User
                const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
                    email: email,
                    password: password,
                    email_confirm: true // Auto confirm
                });

                if (createError) throw createError;

                console.log('\x1b[32m%s\x1b[0m', `✓ Auth User Created: ${user.id}`);

                // 2. Update Profile (if Trigger didn't handle it or to set Admin)
                // We upsert just in case trigger race condition
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        email: email,
                        is_admin: isAdmin,
                        created_at: new Date()
                    });

                if (profileError) {
                    console.warn('Warning updating profile:', profileError.message);
                } else {
                    console.log('\x1b[32m%s\x1b[0m', `✓ Profile Linked (Admin: ${isAdmin})`);
                }

                console.log('\nDone.');
                process.exit(0);

            } catch (err) {
                console.error('\x1b[31m%s\x1b[0m', `\nERROR: ${err.message}`);
                process.exit(1);
            }
        });
    });
});
