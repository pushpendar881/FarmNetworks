// src/routes/seller/portal/+layout.server.js (corrected filename)
export const prerender = false;

import { redirect } from '@sveltejs/kit'

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals }) {
  // Double-check authentication
  if (!locals.session) {
    throw redirect(303, '/seller/auth/login')
  }

  // Ensure user is a seller
  const userType = locals.user?.user_metadata?.user_type;
  // if (userType !== 'seller') {
  //   throw redirect(303, '/admin/dashboard')
  // }

  return {
    session: locals.session,
    user: locals.user,
    userType
  }
}