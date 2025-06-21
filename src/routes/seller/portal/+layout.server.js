import { redirect } from '@sveltejs/kit'

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ locals }) {
  // Double-check authentication
  if (!locals.session) {
    throw redirect(303, '/login')
  }

  return {
    session: locals.session,
    user: locals.user
  }
}