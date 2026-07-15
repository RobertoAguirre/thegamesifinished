import { env } from '$env/dynamic/private';
import { clerkClient } from 'svelte-clerk/server';

/**
 * Correos transaccionales vía Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Si RESEND_API_KEY no está configurada, se omite en silencio (el aviso in-app sigue funcionando).
 */
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function emailConfig(): { apiKey: string; from: string } | null {
	const apiKey = env.RESEND_API_KEY?.trim();
	if (!apiKey) return null;
	const from = env.EMAIL_FROM?.trim() || 'The Games I Finished <avisos@gamesifinished.com>';
	return { apiKey, from };
}

export function hasEmailConfigured(): boolean {
	return emailConfig() !== null;
}

/** Email principal del usuario desde Clerk, o null. */
export async function getClerkEmail(clerkId: string): Promise<string | null> {
	try {
		const user = await clerkClient.users.getUser(clerkId);
		const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
		return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
	} catch (error) {
		console.warn('Clerk email lookup failed:', error);
		return null;
	}
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export async function sendCommentEmail(input: {
	toEmail: string;
	ownerName: string;
	actorName: string;
	gameTitle: string;
	commentBody: string;
	completionUrl: string;
}): Promise<void> {
	const config = emailConfig();
	if (!config) return;

	const actor = escapeHtml(input.actorName);
	const game = escapeHtml(input.gameTitle);
	const body = escapeHtml(input.commentBody);

	const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#0b0b14;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <p style="color:#9278ff;font-size:13px;font-weight:bold;letter-spacing:2px;margin:0 0 24px;">THE GAMES I FINISHED</p>
    <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px;">${actor} comentó tu victoria</h1>
    <p style="color:#c4c4d6;font-size:15px;margin:0 0 20px;">Sobre <strong style="color:#ffffff;">${game}</strong>:</p>
    <div style="background:#161624;border:1px solid #2a2a3d;border-radius:12px;padding:16px 18px;margin:0 0 28px;">
      <p style="color:#ffffff;font-size:15px;line-height:1.5;margin:0;">“${body}”</p>
    </div>
    <a href="${input.completionUrl}" style="display:inline-block;background:#7c5cff;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:12px 28px;border-radius:999px;">Responder</a>
    <p style="color:#6b6b80;font-size:12px;margin:32px 0 0;">Recibes este correo porque alguien comentó una de tus victorias en gamesifinished.com.</p>
  </div>
</body>
</html>`;

	try {
		const response = await fetch(RESEND_ENDPOINT, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${config.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: config.from,
				to: [input.toEmail],
				subject: `${input.actorName} comentó tu victoria de ${input.gameTitle}`,
				html
			})
		});
		if (!response.ok) {
			console.warn('Resend send failed:', response.status, await response.text());
		}
	} catch (error) {
		console.warn('Resend send error:', error);
	}
}
