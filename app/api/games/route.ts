import {NextRequest,NextResponse} from "next/server";
import {gamesCatalog} from "../../data/games";

export async function GET(request:NextRequest){
  const params=request.nextUrl.searchParams;
  const query=(params.get("q")||"").trim().toLocaleLowerCase();
  const popular=params.get("popular")==="1";
  const requestedLimit=Number(params.get("limit")||60);
  const limit=Number.isFinite(requestedLimit)?Math.min(60,Math.max(1,Math.floor(requestedLimit))):60;

  if(!popular&&(query.length<2||query.length>100)){
    return NextResponse.json({results:[],database:"bundled-json",error:"Search must be between 2 and 100 characters."},{status:400});
  }

  let results=gamesCatalog;
  if(!popular){
    results=results.filter(game=>[
      game.title,game.overview,game.year,game.developer,game.publisher,
      ...game.genres,...game.platforms
    ].join(" ").toLocaleLowerCase().includes(query));
  }

  const mapped=results.slice(0,limit).map(game=>({
    id:game.id,
    title:game.title,
    name:game.title,
    overview:game.overview,
    year:game.year,
    genres:game.genres,
    platforms:game.platforms,
    developer:game.developer,
    publisher:game.publisher,
    contentRating:game.ageRating,
    poster:null,
    url:game.officialUrl||null,
    source:"Local Games Catalog"
  }));

  return NextResponse.json({results:mapped,database:"bundled-json"},{
    headers:{"Cache-Control":"public, max-age=30, s-maxage=120, stale-while-revalidate=300"}
  });
}
