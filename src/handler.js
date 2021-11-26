import { v4 as uuidv4 } from 'uuid';
import { Router } from 'itty-router'
import { BadRequestError, MethodNotAllowedError, NotFoundError } from './errors';

const allowedMethods = 'GET, POST, OPTIONS'
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': allowedMethods,
    'Access-Control-Allow-Headers': 'Content-Type',
}

const router = Router();

router
    .get('/posts', handleGetPosts)
    .post('/posts', handlePostPost)
    .get('*', () => { throw new NotFoundError('Not Found') })
    .post('*', () => { throw new NotFoundError('Not Found') })
    .all('*', () => { throw new MethodNotAllowedError('Method not allowed') });

export async function handleRequest(request) {
    try {
        //quick and dirty fix for preflight OPTIONS requests
        if (request.method === "OPTIONS"){
            return handleOptions(request);
        }
        
        return await router.handle(request);
    } catch (e) {
        if (e instanceof BadRequestError) {
            return new Response(e.message, { headers: { 'Content-type': 'text/plain' }, status: 400 });
        } else if (e instanceof NotFoundError) {
            return new Response(e.message, { headers: { 'Content-type': 'text/plain' }, status: 404 });
        } else if (e instanceof MethodNotAllowedError) {
            return new Response(e.message, { headers: { 'Content-type': 'text/plain' }, status: 405 });
        } else {
            return new Response(e.message, { headers: { 'Content-type': 'text/plain' }, status: 500 });
        }
    }
}

async function handleGetPosts(request) {
    var allKeys = []

    var finished = false
    var curs = null
    //request all keys until list_complet -> not very efficient but list returns in descending order
    while (!finished) {
        var { keys, list_complete, cursor } = await POSTS.list({ "cursor": curs })
        finished = list_complete
        curs = cursor
        allKeys = allKeys.concat(keys)
    }

    var promises = allKeys.map((key) => POSTS.get(key.name))
    var posts = (await Promise.all(promises)) //execute all promises at once
        .map((postString) => JSON.parse(postString))
        .sort((post1, post2) => post2.date - post1.date) //very unefficient to sort all posts in memory, but no alternative because of KV stores

    const body = JSON.stringify(posts)
    const headers = { ...corsHeaders, 'Content-type': 'application/json' }
    return new Response(body, { headers })
}

async function handlePostPost(request) {
    let post = await validatePostInpud(request);

    let uuid = uuidv4();

    if (post.uuid) {
        //if post already contains uuid, is is an already existing one that has been edited. TODO: validate UUID format
        uuid = post.uuid;
    } else {
        //initialize post meta data
        post.reactions = { heart: [], laugh: [], cry: [] };
        post.date = new Date().getTime();
        post.uuid = uuid;
    }

    const key = `${uuid}`;

    await POSTS.put(key, JSON.stringify(post));

    const headers = { ...corsHeaders, 'Content-type': 'text/plain' };
    const body = "success";

    return new Response(body, { headers });
}

async function validatePostInpud(request) {
    let post = null;
    try {
        post = await request.json();
    } catch (e) {
        throw new BadRequestError("Post was malformed");
    }

    if (!post.username ||
        !post.content ||
        !post.title ||
        typeof post.username !== "string" ||
        typeof post.content !== "string" ||
        typeof post.title !== "string") {
        throw new BadRequestError("Post was malformed");
    }
    return post;
}

//credits to exvuma -> https://github.com/ConzorKingKong/cors-preflight-template
function handleOptions(request) {
    if (
        request.headers.get('Origin') !== null &&
        request.headers.get('Access-Control-Request-Method') !== null &&
        allowedMethods.includes(request.headers.get('Access-Control-Request-Method')) &&
        request.headers.get('Access-Control-Request-Headers') !== null
    ) {
        // Handle CORS pre-flight request.
        return new Response(null, {
            headers: corsHeaders,
        })
    } else {
        // Handle standard OPTIONS request.
        return new Response(null, {
            headers: {
                Allow: allowedMethods,
            },
        })
    }
}
