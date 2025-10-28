export function getCorsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
}

export function handleOptionsRequest(req: Request): Response | null {
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: getCorsHeaders(),
            status: 200,
        });
    }
    return null;
}