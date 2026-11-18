import { handle } from '../../../lib/workroom';
export const dynamic = 'force-dynamic';
async function route(request: Request, context: {params: Promise<{path:string[]}>}) {
  return handle(request,(await context.params).path);
}
export const GET=route;
export const POST=route;
export const PUT=route;
export const DELETE=route;
