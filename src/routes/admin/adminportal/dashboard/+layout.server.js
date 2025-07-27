// export const prerender = false;

// import { redirect } from '@sveltejs/kit'

// /** @type {import('./$types').LayoutServerLoad} */
// export async function load({ locals }) {
//   // Double-check authentication
//   if (!locals.session) {
//     throw redirect(303, '/admin/auth/login')
//   }

//   // Ensure user is an admin
//   const userType = locals.user?.user_metadata?.user_type;
//   if (userType !== 'admin') {
//     throw redirect(303, '/seller/portal/dashboard')
//   }

//   return {
//     session: locals.session,
//     user: locals.user,
//     userType
//   }
// } 