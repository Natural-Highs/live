import {createFileRoute} from '@tanstack/react-router'
import {z} from 'zod'
import {adminAuth} from '@/lib/firebase/firebase.admin'

const sessionLoginSchema = z.object({
	idToken: z.string().min(1, 'ID token is required')
})

// Session cookie duration: 90 days (per NFR1 requirement)
const SESSION_DURATION_MS = 90 * 24 * 60 * 60 * 1000

export const Route = createFileRoute('/api/auth/sessionLogin')({
	server: {
		handlers: {
			POST: async ({request}: {request: Request}) => {
				try {
					const body = await request.json()
					const {idToken} = sessionLoginSchema.parse(body)

					// Verify the ID token first
					const decodedToken = await adminAuth.verifyIdToken(idToken, true)

					// Create a session cookie
					const sessionCookie = await adminAuth.createSessionCookie(idToken, {
						expiresIn: SESSION_DURATION_MS
					})

					// Calculate cookie expiry date
					const expiryDate = new Date(Date.now() + SESSION_DURATION_MS)

					// Return success with Set-Cookie header
					return new Response(
						JSON.stringify({
							success: true,
							uid: decodedToken.uid
						}),
						{
							status: 200,
							headers: {
								'Content-Type': 'application/json',
								'Set-Cookie': `__session=${sessionCookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expiryDate.toUTCString()}`
							}
						}
					)
				} catch (error) {
					console.error('Session login error:', error)

					// Handle specific Firebase errors
					if (error instanceof z.ZodError) {
						return new Response(JSON.stringify({error: 'Invalid request body'}), {
							status: 400,
							headers: {'Content-Type': 'application/json'}
						})
					}

					const firebaseError = error as {code?: string}
					if (firebaseError.code === 'auth/id-token-expired') {
						return new Response(JSON.stringify({error: 'Token expired'}), {
							status: 401,
							headers: {'Content-Type': 'application/json'}
						})
					}

					if (firebaseError.code === 'auth/id-token-revoked') {
						return new Response(JSON.stringify({error: 'Token revoked'}), {
							status: 401,
							headers: {'Content-Type': 'application/json'}
						})
					}

					if (firebaseError.code === 'auth/invalid-id-token') {
						return new Response(JSON.stringify({error: 'Invalid token'}), {
							status: 401,
							headers: {'Content-Type': 'application/json'}
						})
					}

					return new Response(JSON.stringify({error: 'Authentication failed'}), {
						status: 500,
						headers: {'Content-Type': 'application/json'}
					})
				}
			}
		}
	}
})
