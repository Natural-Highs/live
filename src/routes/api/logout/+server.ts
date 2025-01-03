import { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({cookies}) => {
    cookies.delete("session",
    {path: "/"});
    console.log("cookie deleted");
    return new Response(JSON.stringify({success: true}), {status: 200});
}